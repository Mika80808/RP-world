import React, { useState, useRef, useEffect } from 'react';
import { Settings, Send, RefreshCw, MoreVertical, Book, BookOpen, User, Package, Beaker, Globe, Users, Heart, MapPin, Zap, Coins, Calendar, Shield, CheckSquare, ChevronDown, ChevronRight, Map as MapIcon, Cloud, Sun, CloudRain, Snowflake, Moon, Wind, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { DiaryModal } from './components/DiaryModal';
import { LorebookModal } from './components/LorebookModal';
import { NpcModal } from './components/NpcModal';
import { QuestModal } from './components/QuestModal';
import { ProfileModal } from './components/ProfileModal';
import { SystemPromptModal } from './components/SystemPromptModal';
import { SettingsModal } from './components/SettingsModal';
import { MapModal } from './components/MapModal';
import { Npc, LorebookEntry, Message } from './types';
import { MONTHS_DATA, TOKEN_OPTIONS } from './constants';
import { useGameStore, SAVE_KEY } from './hooks/useGameStore';
import { useCommandParser } from './hooks/useCommandParser';

// ─── Markdown Parser ─────────────────────────────────────────────────────────

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let keyIdx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('`')) {
      parts.push(<span key={`${keyPrefix}-c${keyIdx++}`} className="text-rose-400 font-medium">{token.slice(1, -1)}</span>);
    } else if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b${keyIdx++}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={`${keyPrefix}-i${keyIdx++}`} className="text-stone-400">{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 引用區塊：連續 > 開頭行合併
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      const startI = i;
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      result.push(
        <div key={`bq-${startI}`} className="border-l-2 border-stone-500 pl-3 my-2 bg-stone-800/30 rounded-r-lg py-2 space-y-1">
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="text-stone-400 leading-relaxed text-sm">{renderInline(ql, `bq-${startI}-${qi}`)}</p>
          ))}
        </div>
      );
      continue;
    }
    // 分隔線
    if (line.trim() === '---') {
      result.push(<hr key={`hr-${i}`} className="border-stone-700/60 my-3" />);
      i++; continue;
    }
    // 空行 → 間距
    if (line.trim() === '') {
      result.push(<div key={`sp-${i}`} className="h-2" />);
      i++; continue;
    }
    // 普通段落
    result.push(<p key={`p-${i}`} className="leading-relaxed">{renderInline(line, `p-${i}`)}</p>);
    i++;
  }
  return <>{result}</>;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ─── UI 狀態（Modal / 輸入 / 載入）──────────────────────────────────────────
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
  const [isLorebookModalOpen, setIsLorebookModalOpen] = useState(false);
  const [isSystemPromptModalOpen, setIsSystemPromptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isConsumablesOpen, setIsConsumablesOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<number | null>(null);
  const [selectedConsumableItem, setSelectedConsumableItem] = useState<number | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    const saved = localStorage.getItem('rpworld_last_saved');
    return saved ? new Date(saved) : null;
  });
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ─── API 設定（不屬於遊戲存檔，獨立存於 localStorage）───────────────────────
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem('gemini_api_key') || ''
  );
  const [maxTokens, setMaxTokens] = useState<number>(
    () => parseInt(localStorage.getItem('gemini_max_tokens') || '32768')
  );

  // ─── 遊戲狀態（useGameStore）────────────────────────────────────────────────
  const store = useGameStore();
  const {
    timeState, setTimeState,
    profile, setProfile,
    systemPrompt, setSystemPrompt,
    npcs, setNpcs,
    appearingNpcs, setAppearingNpcs,
    currentLocation, setCurrentLocation,
    memories, setMemories,
    stickyCounters, setStickyCounters,
    cooldownCounters, setCooldownCounters,
    quests, setQuests,
    diaryEntries, setDiaryEntries,
    lorebookEntries, setLorebookEntries,
    inventory, setInventory,
    consumables, setConsumables,
    messages, setMessages,
    quickOptions, setQuickOptions,
    worldMap, setWorldMap,
    saveToStorage,
    loadFromData,
  } = store;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── 時間工具 ────────────────────────────────────────────────────────────────
  const getTimeOfDay = (hour: number) => {
    if (hour >= 5 && hour < 9) return '清晨';
    if (hour >= 9 && hour < 16) return '白天';
    if (hour >= 16 && hour < 19) return '黃昏';
    return '夜晚';
  };
  const timeOfDay = getTimeOfDay(timeState.hour);
  const currentMonthData = MONTHS_DATA.find(m => m.id === timeState.month) || MONTHS_DATA[0];

  const getWeatherIcon = () => {
    switch (timeState.weather) {
      case '晴朗': return <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-400" />;
      case '陰天': return <Cloud className="w-3.5 h-3.5 mr-1.5 text-stone-400" />;
      case '下雨': return <CloudRain className="w-3.5 h-3.5 mr-1.5 text-blue-400" />;
      case '下雪': return <Snowflake className="w-3.5 h-3.5 mr-1.5 text-sky-200" />;
      case '起霧': return <Wind className="w-3.5 h-3.5 mr-1.5 text-stone-300" />;
      default: return <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-400" />;
    }
  };
  const getCelestialIcon = () => {
    if (timeState.month === 4) {
      return (
        <div className="flex items-center mr-1.5 relative w-5 h-4">
          <Moon className="w-3.5 h-3.5 text-indigo-300 absolute left-0" />
          <Moon className="w-3.5 h-3.5 text-purple-300 absolute right-0 top-0.5 opacity-80" />
        </div>
      );
    }
    if (timeOfDay === '夜晚' || timeOfDay === '清晨') {
      return <Moon className="w-3.5 h-3.5 mr-1.5 text-indigo-300" />;
    }
    return <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-500 opacity-50" />;
  };

  // ─── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── 指令解析器（useCommandParser）─────────────────────────────────────────
  const { parseAndExecuteCommands, applyItemEffect, scanKeywords, isMemoryTriggered, tickMemoryCounters } =
    useCommandParser({
      timeState, currentLocation, quests, memories, consumables,
      stickyCounters, cooldownCounters, messages, lorebookEntries,
      setTimeState, setProfile, setCurrentLocation, setQuests,
      setMemories, setInventory, setConsumables, setNpcs,
      setLorebookEntries, setWorldMap, setQuickOptions,
      setStickyCounters, setCooldownCounters,
      showToast,
      onNewQuest: () => setIsQuestModalOpen(true),
    });

  // ─── 地圖旅行 ────────────────────────────────────────────────────────────────
  const handleTravel = (destName: string, byCarriage: boolean) => {
    // Deduct carriage fare if applicable
    if (byCarriage) {
      const destEntry = lorebookEntries.find(e => e.category === '地點' && e.title === destName);
      const fare = destEntry?.cartFare ?? 0;
      if (fare > 0) {
        setProfile(prev => ({ ...prev, gold: prev.gold - fare }));
        showToast(`🐴 支付馬車費 ${fare} 銅`);
      }
    }
    // Update location
    setCurrentLocation(destName);
    // Mark destination as 'known' in lorebookEntries
    setLorebookEntries(prev => prev.map(e =>
      e.category === '地點' && e.title === destName
        ? { ...e, mapStatus: 'known' as const }
        : e
    ));
    // Send message to AI
    const msg = byCarriage
      ? `你決定搭馬車前往${destName}。`
      : `你決定徒步前往${destName}。`;
    setIsMapOpen(false);
    handleSendMessage(msg);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const handleAddDiary = () => {
    const newId = Date.now();
    setDiaryEntries([{ id: newId, text: '', isActive: true, keywords: [] }, ...diaryEntries]);
    return newId;
  };

  const handleDiaryKeywordAdd = (id: number, keyword: string) => {
    const kw = keyword.trim();
    if (!kw) return;
    setDiaryEntries(prev => prev.map(e =>
      e.id === id
        ? { ...e, keywords: [...(e.keywords || []).filter((k: string) => k !== kw), kw] }
        : e
    ));
  };

  const handleDiaryKeywordRemove = (id: number, keyword: string) => {
    setDiaryEntries(prev => prev.map(e =>
      e.id === id
        ? { ...e, keywords: (e.keywords || []).filter((k: string) => k !== keyword) }
        : e
    ));
  };

  const handleDeleteDiary = (id: number) => {
    setDiaryEntries(diaryEntries.filter(entry => entry.id !== id));
  };

  const handleToggleDiary = (id: number) => {
    setDiaryEntries(diaryEntries.map(entry => 
      entry.id === id ? { ...entry, isActive: !entry.isActive } : entry
    ));
  };

  // ─── 🔮 水晶球日記：AI 自動生成 ────────────────────────────────────────────
  const handleGenerateDiary = async () => {
    const key = geminiApiKey.trim() || process.env.GEMINI_API_KEY || '';
    if (!key) { showToast('❌ 請先設定 Gemini API Key'); return; }
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const recentChat = messages.slice(-20).map(m =>
        `${m.role === 'user' ? 'Player' : 'DM'}: ${m.text}`
      ).join('\n');

      const prompt = `你是一個 RPG 遊戲的日記助手。根據以下最近的對話紀錄，生成一則第一人稱的日記條目，格式如下：

## [日記標題]
- 摘要範圍：最近 20 則對話
關鍵事件節點：
- 事件名稱：簡潔描述事件結果
（1-4個關鍵節點）
詳細內容：
按時間順序詳述事件發展，包含重要對話、行動、心理活動。
可進行故事路線：
- 故事主線
- 故事支線

## 必須記錄的要點
### 角色層面
- 主角變化、角色關係進展、重要新角色登場
### 情節層面
- 推動主線的重大事件、重要伏筆和線索
### 世界觀層面
- 新設定、關鍵道具、地點
### 情感層面
- 情感轉折點、重要互動細節

## 寫作要求
- 簡潔明瞭，重點突出
- 使用「引號」標記重要對話和專有名詞
- 禁止使用**粗體**
- 使用繁體中文，第一人稱

---
最近對話：
${recentChat}

請直接輸出日記內容，不要加任何前綴說明。`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { maxOutputTokens: maxTokens },
      });

      const text = response.text || '';
      const newId = Date.now();
      setDiaryEntries(prev => [{
        id: newId,
        text: text.trim(),
        isActive: false,
        keywords: [],
        source: 'ai_generated',
      }, ...prev]);
      showToast('🔮 水晶球日記已生成');
    } catch (e) {
      showToast('❌ 生成失敗，請稍後再試');
    }
  };

  // ─── 💫 融合日記：合併多條日記 ─────────────────────────────────────────────
  const handleMergeDiary = async (selectedIds: number[]) => {
    if (selectedIds.length < 2) { showToast('請勾選至少 2 條日記'); return; }
    const key = geminiApiKey.trim() || process.env.GEMINI_API_KEY || '';
    if (!key) { showToast('❌ 請先設定 Gemini API Key'); return; }
    const selected = diaryEntries.filter(e => selectedIds.includes(e.id));
    const combined = selected.map((e, i) => `[日記 ${i + 1}]\n${e.text}`).join('\n\n---\n\n');
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `請將以下多則日記合併成一則，保留所有關鍵資訊，去除重複內容，使用繁體中文，第一人稱，標題前加上 💫。格式與原始日記相同。\n\n${combined}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { maxOutputTokens: maxTokens },
      });
      const text = response.text || '';
      const newId = Date.now();
      const sourceIds = selectedIds.slice();
      setDiaryEntries(prev => [
        {
          id: newId,
          text: text.trim(),
          isActive: false,
          keywords: [],
          source: 'merged',
          mergedFrom: sourceIds,
        },
        ...prev.map(e =>
          sourceIds.includes(e.id)
            ? { ...e, isActive: false, isMerged: true }
            : e
        )
      ]);
      showToast('💫 融合日記已生成');
    } catch (e) {
      showToast('❌ 融合失敗，請稍後再試');
    }
  };

  const handleDiaryChange = (id: number, text: string) => {
    setDiaryEntries(diaryEntries.map(entry => 
      entry.id === id ? { ...entry, text } : entry
    ));
  };

  const handleAddLorebook = (category: string) => {
    const newId = Date.now();
    setLorebookEntries([{ id: newId, title: '新設定', content: '', category, isActive: true, insertionOrder: 100, selective: false, secondaryKeys: [] }, ...lorebookEntries]);
    return newId;
  };

  const handleUpdateLorebook = (id: number, updates: Partial<LorebookEntry>) => {
    setLorebookEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
  };

  const handleDeleteLorebook = (id: number) => {
    setLorebookEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleLorebookKeywordAdd = (id: number, field: 'keywords'|'secondaryKeys', kw: string) => {
    const k = kw.trim();
    if (!k) return;
    setLorebookEntries(prev => prev.map(e =>
      e.id === id ? { ...e, [field]: [...(e[field] || []).filter((x: string) => x !== k), k] } : e
    ));
  };

  const handleLorebookKeywordRemove = (id: number, field: 'keywords'|'secondaryKeys', kw: string) => {
    setLorebookEntries(prev => prev.map(e =>
      e.id === id ? { ...e, [field]: (e[field] || []).filter((x: string) => x !== kw) } : e
    ));
  };

  // ─── 每次 AI 回應結束後自動存檔 ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      saveToStorage();
      const now = new Date();
      localStorage.setItem('rpworld_last_saved', now.toISOString());
      setLastSavedAt(now);
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 存檔匯出 ────────────────────────────────────────────────────────────────
  const handleExportSave = () => {
    const saveData = {
      profile, systemPrompt, diaryEntries, lorebookEntries, npcs, appearingNpcs,
      inventory, consumables, currentLocation, messages, memories, quickOptions,
      timeState, quests, worldMap,
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const hr = String(now.getHours()).padStart(2,'0');
    const mi = String(now.getMinutes()).padStart(2,'0');
    const safeName = (profile.name || '玩家').replace(/[\\/:*?"<>|]/g, '_');
    a.download = `RPworld-${safeName}-${date}-${hr}-${mi}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('存檔已匯出');
  };

  // ─── 存檔匯入 ────────────────────────────────────────────────────────────────
  const handleImportSave = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        loadFromData(JSON.parse(content));
        showToast('存檔已匯入');
        setIsSettingsModalOpen(false);
      } catch {
        showToast('存檔格式錯誤');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── 重置遊戲 ────────────────────────────────────────────────────────────────
  const handleResetGame = () => {
    if (window.confirm('確定要重置遊戲嗎？所有未匯出的進度將會遺失。')) {
      localStorage.removeItem(SAVE_KEY);
      window.location.reload();
    }
  };

  const handleAddNpcMemory = (npcId: number, text: string) => {
    if (!text.trim()) return;
    const updatedNpcs = npcs.map(n => {
      if (n.id === npcId) {
        const newMems = [...(n.memories || []), text];
        const updatedNpc = { ...n, memories: newMems };
        if (selectedNpc?.id === npcId) setSelectedNpc(updatedNpc);
        return updatedNpc;
      }
      return n;
    });
    setNpcs(updatedNpcs);
  };

  const handleRemoveNpcMemory = (npcId: number, memIndex: number) => {
    const updatedNpcs = npcs.map(n => {
      if (n.id === npcId) {
        const newMems = n.memories.filter((_, idx) => idx !== memIndex);
        const updatedNpc = { ...n, memories: newMems };
        if (selectedNpc?.id === npcId) setSelectedNpc(updatedNpc);
        return updatedNpc;
      }
      return n;
    });
    setNpcs(updatedNpcs);
  };

  const handleTogglePinNpc = (npcId: number) => {
    setNpcs(prevNpcs => {
      return prevNpcs.map(n => {
        if (n.id === npcId) {
          return { ...n, isPinned: !n.isPinned };
        }
        return n;
      });
    });

    setSelectedNpc(prev => {
      if (prev && prev.id === npcId) {
        return { ...prev, isPinned: !prev.isPinned };
      }
      return prev;
    });

    const npc = npcs.find(n => n.id === npcId);
    if (npc) {
      showToast(npc.isPinned ? `已取消釘選 ${npc.name}` : `已釘選 ${npc.name}`);
    }
  };

  const handleRecordNpc = (npc: Npc) => {
    const exists = lorebookEntries.some(e => e.category === 'NPC' && e.title === npc.name);
    if (exists) {
      showToast('此人物已在設定集中');
      return;
    }

    const newId = lorebookEntries.length > 0 ? Math.max(...lorebookEntries.map(e => e.id)) + 1 : 1;
    const newEntry = {
      id: newId,
      title: npc.name,
      job: npc.job,
      appearance: npc.appearance,
      personality: npc.personality,
      other: npc.other,
      category: 'NPC',
      isActive: true,
      content: ''
    };
    
    setLorebookEntries([newEntry, ...lorebookEntries]);
    showToast(`已將 ${npc.name} 記下並加入設定集`);
  };

  // ─── Prompt 組裝 ─────────────────────────────────────────────────────────────
  const buildPrompt = (userInput: string, currentMessages: Message[]): string => {
    const SLIDING_WINDOW = 20;

    const lorebookScanText = currentMessages.slice(-5).map(m => m.text).join(' ') + ' ' + userInput;

    const lorebookHitsKeywords = (e: any): boolean => {
      const keys: string[] = e.keywords || [];
      const secKeys: string[] = e.secondaryKeys || [];
      const selective: boolean = e.selective ?? false;
      const text = lorebookScanText.toLowerCase();

      const primaryHit = keys.length === 0 || keys.some(k => text.includes(k.toLowerCase()));
      if (!primaryHit) return false;
      if (selective && secKeys.length > 0) {
        return secKeys.some(k => text.includes(k.toLowerCase()));
      }
      return true;
    };

    // Phase 1：依地點篩選候選 NPC（輕量名單）
    const npcCandidates = lorebookEntries
      .filter(e => e.category === 'NPC' && e.isActive && (
        e.homeLocation === currentLocation ||
        (e.roamLocations || []).includes(currentLocation)
      ))
      .sort((a, b) => {
        const score = (e: LorebookEntry) => {
          if (e.homeLocation === currentLocation) return 0;
          if (npcs.some(n => n.name === e.title && n.isPinned)) return 1;
          return 2;
        };
        return score(a) - score(b);
      })
      .slice(0, 5);

    const relevantLorebook = lorebookEntries
      .filter(e => {
        if (!e.isActive) return false;
        if (e.category === 'NPC') {
          // Phase 2：出場 NPC 或釘選 NPC 注入完整資料
          const inScene = appearingNpcs.some(n => e.title.includes(n) || n.includes(e.title)) ||
                          npcs.some(n => n.isPinned && n.name === e.title);
          if (!inScene) return false;
          return lorebookHitsKeywords(e);
        }
        if (e.category === '地點') {
          const locationMatch = currentLocation.includes(e.title) || e.title.includes(currentLocation);
          if (!locationMatch) return false;
          return lorebookHitsKeywords(e);
        }
        return lorebookHitsKeywords(e);
      })
      .sort((a, b) => (a.insertionOrder ?? 100) - (b.insertionOrder ?? 100));

    const triggeredMemories = memories.filter(m => isMemoryTriggered(m, userInput));
    const worldMems    = triggeredMemories.filter(m => m.type === 'world');
    const regionMems   = triggeredMemories.filter(m => m.type === 'region');
    const sceneMems    = triggeredMemories.filter(m => m.type === 'scene' &&
      (m.tags?.locations || []).some((l: string) => l === currentLocation || currentLocation.includes(l)));
    const npcMems      = triggeredMemories.filter(m => m.type === 'npc');

    const pinnedNpcs = npcs.filter(n => n.isPinned);
    const recentMessages = currentMessages.slice(-SLIDING_WINDOW);

    return `[System Context]
World Premise: ${systemPrompt.worldPremise}
Roleplay Rules: ${systemPrompt.roleplayRules}
Writing Style: ${systemPrompt.writingStyle}

---
[Player]
Name: ${profile.name} | Job: ${profile.job}
Appearance: ${profile.appearance}
Personality: ${profile.personality}
${profile.other ? `Other: ${profile.other}` : ''}

[Current State]
Location: ${currentLocation}
Time: ${timeState.year}年${timeState.month}月${timeState.day}日 ${String(timeState.hour).padStart(2,'0')}:${String(timeState.minute).padStart(2,'0')} | Weather: ${timeState.weather}
HP: ${profile.hp} | MP: ${profile.mp} | Gold: ${profile.gold}

[Inventory]
${inventory.length > 0 ? inventory.map(i => `- ${i.name} x${i.quantity}: ${i.description}`).join('\n') : '（空）'}
${consumables.length > 0 ? consumables.map(i => {
  const eff = i.effect ? Object.entries(i.effect).map(([k, v]) => `${k}${Number(v) > 0 ? '+' : ''}${v}`).join('/') : '';
  return `- [消耗品] ${i.name} x${i.quantity}: ${i.description}${eff ? ` (效果: ${eff})` : ''}`;
}).join('\n') : ''}

[進行中任務]
${(() => {
  const active = quests.filter(q => q.status === 'active');
  if (active.length === 0) return '（無）';
  const todayTotal = timeState.year * 360 + (timeState.month - 1) * 30 + timeState.day;
  return active.map(q => {
    const remaining = q.deadline != null
      ? `剩 ${q.deadline - (todayTotal - q.createdAtTotalDays)} 天`
      : '無期限';
    if (q.isGoalMet) {
      return `${q.title}（委託：${q.giver}，目標已達成，待玩家回報）`;
    }
    return `${q.title}（委託：${q.giver}，${remaining}）`;
  }).join('\n');
})()}

---
[🌍 World Memory]
${worldMems.length > 0 ? worldMems.map(m => `- ${m.content}${m.tags?.factions?.length ? ' ['+m.tags.factions.join(',')+']' : ''}`).join('\n') : '（無）'}

[🗺️ Region Memory]
${regionMems.length > 0 ? regionMems.map(m => `- ${m.content}${m.tags?.locations?.length ? ' ['+m.tags.locations.join(',')+']' : ''}`).join('\n') : '（無）'}

[🏠 Scene Memory: ${currentLocation}]
${sceneMems.length > 0 ? sceneMems.map(m => `- ${m.content}`).join('\n') : '（無）'}

[👤 NPC Memory]
${npcMems.length > 0 ? npcMems.map(m => `- ${m.content}${m.tags?.npcs?.length ? ' ['+m.tags.npcs.join(',')+']' : ''}`).join('\n') : '（無）'}

---
[當前場景可能出現的角色]
${npcCandidates.length > 0
  ? npcCandidates.map(e => `${e.title}（${e.job || ''}）`).join('、') + '\n以上為可能在場的角色，非必須出場。若場景需要新角色請自由創造。'
  : '無已知角色在附近。若場景需要新角色請自由創造。'}

---
[Scene Lorebook]
${relevantLorebook.map(e => {
  if (e.category === 'NPC') {
    const npcData = npcs.find(n => n.name === e.title);
    const thoughtsText = npcData?.thoughts && npcData.thoughts.length > 0
      ? `｜[近期想法] ${npcData.thoughts.map((t, i) => `${i + 1}.${t.text}`).join(' / ')}`
      : '';
    return `[NPC] ${e.title}｜職業：${e.job || ''}｜外貌：${e.appearance || ''}｜個性：${e.personality || ''}｜備註：${e.other || ''}${thoughtsText}`;
  }
  return `[${e.category}] ${e.title}：${e.content}`;
}).join('\n') || '（無）'}

[Pinned NPCs]
${pinnedNpcs.length > 0 ? pinnedNpcs.map(n => {
  const thoughtsText = n.thoughts && n.thoughts.length > 0
    ? `｜[近期想法] ${n.thoughts.map((t, i) => `${i + 1}.${t.text}`).join(' / ')}`
    : '';
  return `- ${n.name}（${n.job}）好感度:${n.affection}｜${n.memories?.length > 0 ? '記憶: ' + n.memories.join(' / ') : ''}${thoughtsText}`;
}).join('\n') : '（無）'}

---
[Active Diary]
${(() => {
  const triggered = diaryEntries.filter(e => {
    if (!e.isActive) return false;
    return scanKeywords(e.keywords || []);
  });
  return triggered.length > 0
    ? triggered.map(e => {
        const kwLabel = e.keywords?.length > 0 ? ` [觸發詞: ${e.keywords.join(',')}]` : '';
        return `- ${e.text}${kwLabel}`;
      }).join('\n')
    : '（無）';
})()}

---
[Recent Chat (最近${Math.min(SLIDING_WINDOW, recentMessages.length)}則)]
${recentMessages.map(m => `${m.role === 'user' ? 'Player' : 'DM'}: ${m.text}`).join('\n')}
Player: ${userInput}

---
[COMMAND FORMAT]
當劇情發生數值變化時，在回應最前面輸出指令區塊，格式如下：
<<COMMANDS>>
HP:-15
GOLD:+200
AFFINITY:角色名:+10
LOCATION:新地點名稱
TIME:+1h
ITEM_ADD:道具名:1:說明文字
ITEM_ADD:草藥:1:回復生命的藥草:hp=20
ITEM_ADD:魔法藥水:2:恢復魔力:mp=30
ITEM_ADD:毒藥:1:造成中毒:status=poisoned:hp=-5
ITEM_USE:道具名
QUEST_ADD:任務名稱:委託人NPC:目標描述:獎勵金幣:獎勵道具(逗號分隔可留空):期限天數(可留空=無期限)
QUEST_GOAL_MET:任務名稱
QUEST_COMPLETE:任務名稱
NPC_THOUGHT:角色名:一句話內心想法
NPC_RELATIONSHIP:角色名:與玩家的關係描述
NPC_NEW:姓名:種族:職業:外貌一句話:個性一句話
NPC_HOME:姓名:地點名稱
NPC_LOCATION:姓名:地點名稱
LOCATION_DISCOVER:地點名稱
MEMORY_ADD:region:normal:迷霧森林昨日大火，黑牙氏族前往支援:locations=迷霧森林:factions=黑牙氏族:keywords=大火,火災:sticky=3
MEMORY_ADD:scene:normal:酒館因打架暫時關閉:locations=酒館
MEMORY_ADD:npc:normal:芬里爾透露停火協議內容:npcs=芬里爾:keywords=停火,協議
MEMORY_ADD:world:critical:魔王宣布向月湖鎮宣戰:keywords=魔王,宣戰
<</COMMANDS>>

並在敘事內文開頭輸出出場標記（非 COMMANDS 區塊）：
[出場:姓名1,姓名2]

【AI 何時應輸出 NPC_THOUGHT】
當 NPC 有明顯情緒變化、做出重要決定、或對玩家產生新看法時，以第一人稱輸出一句話內心想法。

【AI 何時應輸出 NPC_RELATIONSHIP】
當玩家與 NPC 初次建立明確關係（如：成為顧客、僱主、同行者、對手），或關係發生重大轉變時（如：從陌生人變成盟友、從朋友變成仇人），輸出一句簡短的關係描述（例如「偶爾光顧的旅行者」「被委託的冒險者」「礙眼的外來者」）。

【AI 何時應輸出 ITEM_ADD / ITEM_USE】
- ITEM_ADD：當玩家獲得道具時輸出。若道具為消耗品（藥水、食物、卷軸等），請加上 effect 欄位（hp/mp/gold/status=值），前端會自動分類為消耗品欄並套用數值。
- ITEM_USE：當玩家在對話中明確表示使用某消耗品時輸出，使用與道具欄完全相同的道具名稱，前端會套用 effect 並扣除數量。

【AI 何時應輸出 QUEST_ADD】
當 NPC 正式委託玩家任務、或玩家從布告欄接取任務時輸出。格式：QUEST_ADD:任務名:委託人:目標描述:獎勵金幣(數字):獎勵道具(逗號分隔,可留空):期限天數(數字,可留空)。任務名稱之後的欄位均可留空。

【AI 何時應輸出 QUEST_GOAL_MET】
當 AI 判斷玩家已實際完成任務目標（例如：找到了物品、擊敗了目標、完成了交涉），但玩家尚未回到委託人處回報時，靜默輸出此指令。前端會標記任務為「待回報」狀態並提示玩家。

【AI 何時應輸出 QUEST_COMPLETE】
當玩家親自向委託人回報、且 AI 確認任務結案時輸出。必須使用與 QUEST_ADD 完全相同的任務名稱。若任務已標記 isGoalMet，此指令將自動發放獎勵並關閉任務。

【AI 何時應輸出 NPC_NEW / NPC_HOME / NPC_LOCATION】
- NPC_NEW：創造有名有姓、會在世界中固定出現的新角色時輸出（一次性建檔）
- NPC_HOME：新 NPC 第一次登場時，同步輸出其主要活動地點
- NPC_LOCATION：NPC 出現在非主場地點時，記錄其出沒足跡

【AI 何時輸出 [出場:] 標記】
每個場景或回合開頭，從「當前場景可能出現的角色」候選名單中選擇誰真正在場；也可不選任何人（輸出 [出場:]），或加入候選名單以外的新角色。每次回應都應輸出此標記讓前端追蹤。

【AI 何時應輸出 LOCATION_DISCOVER】
當玩家在旅途中路過、聽說或間接發現某個尚未正式踏足的地點（如路牌、旅人提及、地圖殘片等），輸出 LOCATION_DISCOVER:地點名稱，前端會自動將其標記為「待探索」地點加入世界地圖。

【AI 何時應輸出 MEMORY_ADD】
當發生以下五種情境時，請務必使用 MEMORY_ADD 記錄：
1. 世界事件 (world)：影響整個世界的重大變故（如：魔王宣戰、天象異變）。
2. 區域事件 (region)：特定區域的動態變化（如：森林大火、城鎮慶典）。
   * 特別規則：若你的回應裡出現 [ ] 格式的布告欄內容或公告時，必定觸發 MEMORY_ADD:region 將其記錄下來。
3. 場景狀態改變 (scene)：當前地點的物理或狀態改變（如：酒館被砸毀、橋樑斷裂）。
4. NPC 情報 (npc)：NPC 透露的關鍵秘密、身世或重要決定。
5. 玩家重要事件 (world/region/npc)：玩家達成的重大成就、做出的關鍵選擇，或與 NPC 關係的重大突破。

若需要提供玩家行動建議，請在回應最後面輸出選項區塊，格式如下（請不要加上數字編號，限制在10字以內，以簡單動作為主）：
<<OPTIONS>>
選項一
選項二
選項三
<</OPTIONS>>
指令區塊之後才是給玩家看的敘事內容。若無數值變化則省略指令區塊。

Please respond as the DM.`;
  };

  const handleSendMessage = async (textToUse?: string | React.MouseEvent | React.KeyboardEvent, historyToUse?: any[]) => {
    const text = typeof textToUse === 'string' ? textToUse : inputText;
    if (!text.trim() || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', text: text };
    const newMessages = historyToUse ? [...historyToUse, userMessage] : [...messages, userMessage];
    setMessages(newMessages);
    if (typeof textToUse !== 'string') setInputText('');
    setIsLoading(true);

    try {
      const key = geminiApiKey.trim() || process.env.GEMINI_API_KEY || '';
      if (!key) {
        showToast('❌ 請先在系統設定輸入 Gemini API Key');
        setIsLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = buildPrompt(text, historyToUse || messages);

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { maxOutputTokens: maxTokens },
      });

      const aiMessageId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiMessageId, role: 'system', text: '' }]);

      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => prev.map(m =>
            m.id === aiMessageId ? { ...m, text: fullText } : m
          ));
        }
      }

      const rawNarrative = parseAndExecuteCommands(fullText);

      // 解析 [出場:] 標記，更新 appearingNpcs + lastSeen，然後從顯示文字中移除
      const appearMatch = rawNarrative.match(/\[出場:([^\]]*)\]/);
      if (appearMatch) {
        const names = appearMatch[1].split(',').map((n: string) => n.trim()).filter(Boolean);
        if (names.length > 0) {
          setAppearingNpcs(names);
          setNpcs(prev => prev.map(npc =>
            names.some((n: string) => npc.name.includes(n) || n.includes(npc.name))
              ? { ...npc, lastSeenLocation: currentLocation, lastSeenDate: `${timeState.month}/${timeState.day}` }
              : npc
          ));
        }
      }
      const narrative = rawNarrative.replace(/\[出場:[^\]]*\]/g, '').trim();

      setMessages(prev => prev.map(m =>
        m.id === aiMessageId ? { ...m, text: narrative } : m
      ));

      setNpcs(prev => prev.map(npc => {
        if (narrative.includes(npc.name)) {
          return {
            ...npc,
            lastSeenLocation: currentLocation,
            lastSeenDate: `${timeState.month}/${timeState.day}`
          };
        }
        return npc;
      }));

      const triggeredIds = memories
        .filter(m => isMemoryTriggered(m, inputText))
        .map(m => m.id);
      tickMemoryCounters(triggeredIds);

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      showToast('API 呼叫失敗，請檢查設定或網路連線');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = (msgId: number) => {
    if (isLoading) return;
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    let lastUserMsgIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsgIndex = i;
        break;
      }
    }

    if (lastUserMsgIndex === -1) return;

    const userMsgText = messages[lastUserMsgIndex].text;
    const historyToUse = messages.slice(0, lastUserMsgIndex);
    
    handleSendMessage(userMsgText, historyToUse);
  };

  return (
    <div className="flex flex-col h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-stone-800 via-stone-900 to-stone-950 text-stone-200 font-sans overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel */}
        <div className="w-64 bg-stone-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col p-4 space-y-4 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10">
          <div 
            className="bg-stone-800/40 p-3 rounded-2xl border border-white/5 shadow-sm cursor-pointer hover:bg-stone-700/50 transition relative group"
            onClick={() => setIsQuestModalOpen(true)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center text-amber-400 font-bold"><Book className="w-4 h-4 mr-2" /> 任務日誌</h3>
              <ChevronRight className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400 transition" />
            </div>
            <ul className="text-sm space-y-1 text-stone-300">
              {quests.filter(q => q.status === 'active').length > 0 ? (
                <>
                  {quests.filter(q => q.status === 'active').slice(0, 3).map(q => (
                    <li key={q.id} className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="truncate">{q.title}</span>
                    </li>
                  ))}
                  {quests.filter(q => q.status === 'active').length > 3 && (
                    <li className="text-stone-500 text-xs pl-3">…還有 {quests.filter(q => q.status === 'active').length - 3} 個</li>
                  )}
                </>
              ) : (
                <li className="text-stone-500 italic">目前沒有任務</li>
              )}
            </ul>
          </div>
          
          <div className="bg-stone-800/40 rounded-2xl overflow-hidden border border-white/5 shadow-sm">
            <button 
              onClick={() => setIsInventoryOpen(!isInventoryOpen)}
              className="w-full p-3 flex items-center justify-between hover:bg-stone-700/50 transition"
            >
              <h3 className="flex items-center text-stone-100 font-bold"><Package className="w-4 h-4 mr-2" /> 道具</h3>
              {isInventoryOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>
            <AnimatePresence>
              {isInventoryOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 pb-3 space-y-2 overflow-hidden"
                >
                  {inventory.map(item => (
                    <div 
                      key={item.id} 
                      className={`bg-stone-800/50 p-2 rounded border cursor-pointer transition ${selectedInventoryItem === item.id ? 'border-amber-500/50' : 'border-stone-700/50 hover:border-stone-600'}`}
                      onClick={() => setSelectedInventoryItem(selectedInventoryItem === item.id ? null : item.id)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-stone-200">{item.name}</span>
                        <span className="text-xs text-stone-400">x{item.quantity}</span>
                      </div>
                      <div className="text-xs text-stone-500">{item.description}</div>
                      
                      <AnimatePresence>
                        {selectedInventoryItem === item.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex space-x-2 mt-2 pt-2 border-t border-stone-700/50 overflow-hidden"
                          >
                            <button 
                              className="flex-1 bg-stone-700/50 hover:bg-stone-600/50 backdrop-blur-sm text-xs py-1 rounded-xl transition text-stone-200"
                              onClick={(e) => { e.stopPropagation(); setToastMessage(`裝備了 ${item.name}`); setSelectedInventoryItem(null); }}
                            >
                              裝備
                            </button>
                            <button 
                              className="flex-1 bg-stone-700/50 hover:bg-stone-600/50 backdrop-blur-sm text-xs py-1 rounded-xl transition text-stone-200"
                              onClick={(e) => { e.stopPropagation(); setToastMessage(`卸下了 ${item.name}`); setSelectedInventoryItem(null); }}
                            >
                              卸下
                            </button>
                            <button 
                              className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50 text-xs py-1 rounded-xl transition"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
                                setToastMessage(`丟棄了 ${item.name}`); 
                                setSelectedInventoryItem(null); 
                              }}
                            >
                              丟棄
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-stone-800/40 rounded-2xl overflow-hidden border border-white/5 shadow-sm">
            <button 
              onClick={() => setIsConsumablesOpen(!isConsumablesOpen)}
              className="w-full p-3 flex items-center justify-between hover:bg-stone-700/50 transition"
            >
              <h3 className="flex items-center text-stone-100 font-bold"><Beaker className="w-4 h-4 mr-2" /> 消耗品</h3>
              {isConsumablesOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>
            <AnimatePresence>
              {isConsumablesOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 pb-3 space-y-2 overflow-hidden"
                >
                  {consumables.map(item => (
                    <div 
                      key={item.id} 
                      className={`bg-stone-800/50 p-2 rounded border cursor-pointer transition ${selectedConsumableItem === item.id ? 'border-amber-500/50' : 'border-stone-700/50 hover:border-stone-600'}`}
                      onClick={() => setSelectedConsumableItem(selectedConsumableItem === item.id ? null : item.id)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-stone-200">{item.name}</span>
                        <span className="text-xs text-stone-400">x{item.quantity}</span>
                      </div>
                      <div className="text-xs text-stone-500">{item.description}</div>
                      
                      <AnimatePresence>
                        {selectedConsumableItem === item.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex space-x-2 mt-2 pt-2 border-t border-stone-700/50 overflow-hidden"
                          >
                            <button
                              className="flex-1 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/50 text-xs py-1 rounded-xl transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                applyItemEffect(item.name);
                                setSelectedConsumableItem(null);
                                handleSendMessage(`（玩家使用了 ${item.name}，效果已套用）`);
                              }}
                            >
                              使用
                            </button>
                            <button 
                              className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50 text-xs py-1 rounded-xl transition"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setConsumables(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
                                setToastMessage(`丟棄了 ${item.name}`); 
                                setSelectedConsumableItem(null); 
                              }}
                            >
                              丟棄
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div 
            className="bg-stone-800/40 p-3 rounded-2xl border border-white/5 shadow-sm cursor-pointer hover:bg-stone-700/50 transition"
            onClick={() => setIsDiaryModalOpen(true)}
          >
            <h3 className="flex items-center text-stone-100 font-bold"><Book className="w-4 h-4 mr-2" /> 日記</h3>
          </div>

          <div 
            className="bg-stone-800/40 p-3 rounded-2xl border border-white/5 shadow-sm cursor-pointer hover:bg-stone-700/50 transition"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <h3 className="flex items-center text-stone-100 font-bold"><User className="w-4 h-4 mr-2" /> 個人資訊</h3>
          </div>

          <div 
            className="bg-stone-800/40 p-3 rounded-2xl border border-white/5 shadow-sm cursor-pointer hover:bg-stone-700/50 transition"
            onClick={() => setIsLorebookModalOpen(true)}
          >
            <h3 className="flex items-center text-stone-100 font-bold"><BookOpen className="w-4 h-4 mr-2" /> 設定集</h3>
          </div>

          <div 
            className="bg-stone-800/40 p-3 rounded-2xl border border-white/5 shadow-sm cursor-pointer hover:bg-stone-700/50 transition"
            onClick={() => setIsSystemPromptModalOpen(true)}
          >
            <h3 className="flex items-center text-stone-100 font-bold"><Brain className="w-4 h-4 mr-2" /> 系統底層邏輯</h3>
          </div>

          {npcs.filter(n => n.isPinned).length > 0 && (
            <div className="bg-stone-800/40 rounded-2xl overflow-hidden border border-white/5 shadow-sm p-3">
              <h3 className="flex items-center text-amber-400 font-bold mb-3"><Heart className="w-4 h-4 mr-2" /> 關注</h3>
              <div className="space-y-2">
                {npcs.filter(n => n.isPinned).map(npc => (
                  <div 
                    key={npc.id} 
                    className="bg-stone-900/50 backdrop-blur-sm border border-white/5 p-2.5 rounded-xl flex justify-between items-center shadow-sm cursor-pointer hover:bg-stone-700/50 transition"
                    onClick={() => setSelectedNpc(npc)}
                  >
                    <div>
                      <div className="text-sm font-bold text-stone-200">{npc.name}</div>
                      <div className="text-[10px] text-stone-400">{npc.job}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-rose-400 flex items-center">
                        <Heart className="w-3 h-3 mr-1 fill-current" /> {npc.affection}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1"></div>

          <div className="flex mt-auto">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex-1 bg-stone-800/40 backdrop-blur-sm border border-white/5 hover:bg-stone-700/50 p-2 rounded-xl flex items-center justify-center transition text-sm"
            >
              <Settings className="w-4 h-4 mr-2" /> 設定
            </button>
          </div>
          {lastSavedAt && (() => {
            const isToday = lastSavedAt.toDateString() === new Date().toDateString();
            const timeStr = lastSavedAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = lastSavedAt.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
            return (
              <p className="text-center text-xs text-stone-500 mt-1.5">
                上次存檔 {isToday ? timeStr : `${dateStr} ${timeStr}`}
              </p>
            );
          })()}
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col bg-transparent relative">
          {/* Scene Bar */}
          <div className="bg-stone-900/40 backdrop-blur-md border-b border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-3 flex items-center justify-end absolute top-0 w-full z-30">
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsMapOpen(true)}
                className="px-3 py-1.5 rounded text-xs font-medium transition bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 border border-indigo-500/30 flex items-center"
              >
                <MapIcon className="w-3.5 h-3.5 mr-1" />
                世界地圖
              </button>
            </div>
          </div>

          {/* Dialogue Area */}
          <div className="flex-1 overflow-y-auto p-6 pt-16 pb-40 space-y-6">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end pl-5' : 'items-start pr-5'} max-w-3xl mx-auto w-full group relative ${activeMenuId === msg.id ? 'z-20' : 'z-0'}`}>
                
                <div className={`flex items-center space-x-2 mb-1 ${msg.role === 'user' ? 'mr-2 flex-row-reverse space-x-reverse' : 'ml-2'}`}>
                  <span className="text-xs text-stone-500 font-bold">
                    {msg.role === 'user' ? profile.name : '異世界'}
                  </span>
                  <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition ${activeMenuId === msg.id ? 'opacity-100' : ''}`}>
                    {msg.role !== 'user' && (
                      <button 
                        onClick={() => handleRegenerate(msg.id)}
                        disabled={isLoading}
                        className="p-1 text-stone-500 hover:text-stone-300 rounded transition disabled:opacity-50 disabled:cursor-not-allowed" 
                        title="重新生成"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === msg.id ? null : msg.id);
                        }}
                        className="p-1 text-stone-500 hover:text-stone-300 rounded transition"
                        title="更多選項"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      
                      {activeMenuId === msg.id && (
                        <div className={`absolute top-full mt-1 w-24 bg-stone-800/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.3)] z-50 overflow-hidden flex flex-col ${msg.role === 'user' ? 'right-0' : 'left-0'}`}>
                          <button 
                            className="px-3 py-2 text-xs text-stone-300 hover:bg-stone-700/50 text-left transition"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              navigator.clipboard.writeText(msg.text).then(() => showToast('已複製訊息')).catch(() => showToast('複製失敗'));
                              setActiveMenuId(null); 
                            }}
                          >
                            複製
                          </button>
                          <button 
                            className="px-3 py-2 text-xs text-stone-300 hover:bg-stone-700/50 text-left transition"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditingMessageId(msg.id);
                              setEditMessageText(msg.text);
                              setActiveMenuId(null); 
                            }}
                          >
                            編輯
                          </button>
                          <button 
                            className="px-3 py-2 text-xs text-rose-400 hover:bg-stone-700/50 text-left transition"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setMessages(messages.filter(m => m.id !== msg.id));
                              showToast('已刪除訊息');
                              setActiveMenuId(null); 
                            }}
                          >
                            刪除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-3xl shadow-sm backdrop-blur-sm text-left max-w-full ${
                  editingMessageId === msg.id ? 'w-full' : 'w-fit'
                } ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600/20 border border-indigo-500/30 rounded-tr-none text-indigo-100 shadow-[0_0_15px_rgba(79,70,229,0.1)]' 
                    : 'bg-stone-800/60 border border-white/5 rounded-tl-none text-stone-200 shadow-[0_0_15px_rgba(0,0,0,0.2)]'
                }`}>
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col w-full">
                      <textarea 
                        value={editMessageText} 
                        onChange={(e) => setEditMessageText(e.target.value)}
                        className="w-full bg-stone-900/50 backdrop-blur-sm text-stone-200 p-3 rounded-2xl border border-white/10 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none resize-none text-sm min-h-[200px]"
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <button 
                          onClick={() => setEditingMessageId(null)} 
                          className="text-xs text-stone-400 hover:text-stone-200 px-2 py-1"
                        >
                          取消
                        </button>
                        <button 
                          onClick={() => {
                            setMessages(messages.map(m => m.id === msg.id ? { ...m, text: editMessageText } : m));
                            setEditingMessageId(null);
                            showToast('已更新訊息');
                          }} 
                          className="text-xs bg-indigo-600/80 hover:bg-indigo-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-xl transition shadow-[0_0_10px_rgba(79,70,229,0.2)]"
                        >
                          儲存
                        </button>
                      </div>
                    </div>
                  ) : msg.role === 'user' ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="leading-relaxed">{renderMarkdown(msg.text)}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 w-full pt-10 pb-4 px-6 flex flex-col items-center z-30">
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/60 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_top,black_60%,transparent)] pointer-events-none -z-10"></div>
            
            <div className="w-full max-w-3xl">
              <div className="flex space-x-2 mb-3">
                {quickOptions.map((option, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSendMessage(option)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-stone-800/60 backdrop-blur-sm hover:bg-stone-700/80 border border-white/10 rounded-full text-xs text-stone-300 transition shadow-[0_0_10px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex items-end bg-stone-800/50 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.05)] focus-within:shadow-[0_0_20px_rgba(99,102,241,0.2)] focus-within:border-indigo-500/50 transition-all">
                <textarea 
                  className="w-full bg-transparent text-stone-100 p-4 outline-none resize-none max-h-32 min-h-[56px] disabled:opacity-50" 
                  placeholder={isLoading ? "AI 正在思考中..." : "輸入你的行動或對話..."}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 128) + 'px';
                  }}
                ></textarea>
                <button 
                  className={`p-4 transition ${isLoading || !inputText.trim() ? 'text-stone-600 cursor-not-allowed' : 'text-indigo-400 hover:text-indigo-300'}`}
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>

              {/* Status Bar */}
              <div className="mt-3 flex items-center justify-between text-xs text-stone-400 font-mono px-2">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center" title={`${currentMonthData.name}：${currentMonthData.elegant}`}>
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> 
                    帝國曆 {timeState.year}年 {timeState.month}月 {timeState.day}日
                  </span>
                  <span className="flex items-center">
                    {getWeatherIcon()} {timeState.weather}
                  </span>
                  <span className="flex items-center">
                    {getCelestialIcon()} 
                    {String(timeState.hour).padStart(2, '0')}:{String(timeState.minute).padStart(2, '0')}
                  </span>
                  <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5" /> {currentLocation}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-rose-400"><Heart className="w-3.5 h-3.5 mr-1.5 fill-current" /> HP {profile.hp}</span>
                  <span className="flex items-center text-blue-400"><Zap className="w-3.5 h-3.5 mr-1.5 fill-current" /> MP {profile.mp}</span>
                  <span className="flex items-center text-stone-300"><Shield className="w-3.5 h-3.5 mr-1.5" /> {profile.job}</span>
                  <span className="flex items-center text-amber-400"><Coins className="w-3.5 h-3.5 mr-1.5" /> {profile.gold.toLocaleString()} G</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-64 bg-stone-900/40 backdrop-blur-xl border-l border-white/5 flex flex-col p-4 space-y-6 overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.2)] z-10">
          
          <div>
            <h3 className="flex items-center text-stone-100 font-bold mb-3 border-b border-stone-700 pb-2"><Users className="w-4 h-4 mr-2" /> 當前場景人物</h3>
            <div className="space-y-2">
              {npcs.filter(n => n.location === currentLocation && !n.isPinned).length > 0 ? (
                npcs.filter(n => n.location === currentLocation && !n.isPinned).map(npc => (
                  <div 
                    key={npc.id}
                    className="bg-stone-800/40 backdrop-blur-sm border border-white/5 p-2.5 rounded-xl flex justify-between items-center cursor-pointer hover:bg-stone-700/50 transition"
                    onClick={() => setSelectedNpc(npc)}
                  >
                    <span className="text-sm text-stone-200">{npc.name}</span>
                    <span className={`text-xs flex items-center ${npc.affection >= 80 ? 'text-emerald-400' : npc.affection >= 50 ? 'text-stone-400' : 'text-rose-400'}`}>
                      <Heart className="w-3 h-3 mr-1" /> {npc.affection}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-stone-500 italic text-center py-2">此處目前沒有人...</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="flex items-center text-stone-100 font-bold mb-3 border-b border-stone-700 pb-2"><Globe className="w-4 h-4 mr-2" /> 當前場景記憶</h3>
            
            <div className="mb-4">
              <h4 className="text-xs text-stone-400 mb-2 uppercase tracking-wider">世界記憶</h4>
              <div className="space-y-2">
                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-4 rounded-2xl border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.1)] backdrop-blur-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <Sparkles className="w-16 h-16 text-indigo-300" />
                  </div>
                  <div className="flex items-center space-x-2 mb-1 relative z-10">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold text-indigo-200 tracking-widest">{currentMonthData.elegant}</span>
                  </div>
                  <p className="text-xs text-indigo-300/80 leading-relaxed relative z-10">
                    {currentMonthData.desc}
                  </p>
                </div>

                {memories.filter(m => m.type === 'world' && m.isActive).map(mem => (
                  <div key={mem.id} className="bg-stone-800/40 backdrop-blur-sm p-2.5 rounded-xl text-xs text-stone-300 border-l-2 border-indigo-500">
                    {mem.importance === 'critical' && <span className="text-indigo-400 mr-1">★</span>}
                    {mem.content}
                    {mem.tags?.factions?.length > 0 && <span className="text-stone-500 ml-1">[{mem.tags.factions.join(',')}]</span>}
                  </div>
                ))}
                {memories.filter(m => m.type === 'world').length === 0 && (
                  <div className="text-xs text-stone-600 italic">尚無世界記憶</div>
                )}
              </div>
            </div>

            {(() => {
              const regionMems = memories.filter(m =>
                m.type === 'region' && m.isActive &&
                (m.tags?.locations || []).some((l: string) => l === currentLocation || currentLocation.includes(l) || l.includes(currentLocation))
              );
              return regionMems.length > 0 ? (
                <div className="mb-4">
                  <h4 className="text-xs text-stone-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    🗺️ 區域記憶
                  </h4>
                  <div className="space-y-1">
                    {regionMems.map(mem => (
                      <div key={mem.id} className="bg-stone-800/40 backdrop-blur-sm p-2.5 rounded-xl text-xs text-stone-300 border-l-2 border-amber-500">
                        {mem.content}
                        {mem.expiresAt && <span className="text-stone-500 ml-1">（至{mem.expiresAt}）</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {(() => {
              const sceneMems = memories.filter(m =>
                m.type === 'scene' && m.isActive &&
                (m.tags?.locations || []).some((l: string) => l === currentLocation || currentLocation.includes(l) || l.includes(currentLocation))
              );
              return (
                <div className="mb-4">
                  <h4 className="text-xs text-stone-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    🏠 場景記憶
                  </h4>
                  {sceneMems.length > 0 ? (
                    <div className="space-y-1">
                      {sceneMems.map(mem => (
                        <div key={mem.id} className="bg-stone-800/40 backdrop-blur-sm p-2.5 rounded-xl text-xs text-stone-300 border-l-2 border-emerald-500">
                          {mem.content}
                          {mem.source === 'ai_generated' && <span className="text-stone-600 ml-1">（AI）</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-stone-600 italic">此場景尚無記憶...</div>
                  )}
                </div>
              );
            })()}

            {(() => {
              const npcMems = memories.filter(m => m.type === 'npc' && m.isActive);
              return npcMems.length > 0 ? (
                <div>
                  <h4 className="text-xs text-stone-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    👤 NPC 記憶
                  </h4>
                  <div className="space-y-1">
                    {npcMems.map(mem => (
                      <div key={mem.id} className="bg-stone-800/40 backdrop-blur-sm p-2.5 rounded-xl text-xs text-stone-300 border-l-2 border-rose-500">
                        {mem.tags?.npcs?.length > 0 && <span className="text-rose-400 mr-1">[{mem.tags.npcs.join(',')}]</span>}
                        {mem.content}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>

        </div>
      </div>

      {/* Quest Modal Overlay */}
      <QuestModal
        isOpen={isQuestModalOpen}
        onClose={() => setIsQuestModalOpen(false)}
        quests={quests}
        currentTotalDays={timeState.year * 360 + (timeState.month - 1) * 30 + timeState.day}
      />

      {/* Profile Modal Overlay */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        setProfile={setProfile}
      />

      {/* Diary Modal Overlay */}
      <DiaryModal
        isOpen={isDiaryModalOpen}
        onClose={() => setIsDiaryModalOpen(false)}
        diaryEntries={diaryEntries}
        onAddDiary={handleAddDiary}
        onGenerateDiary={handleGenerateDiary}
        onMergeDiary={handleMergeDiary}
        onToggleDiary={handleToggleDiary}
        onDiaryChange={handleDiaryChange}
        onDiaryKeywordAdd={handleDiaryKeywordAdd}
        onDiaryKeywordRemove={handleDiaryKeywordRemove}
        onDeleteDiary={handleDeleteDiary}
        scanKeywords={scanKeywords}
      />

      {/* Lorebook Modal Overlay */}
      <LorebookModal
        isOpen={isLorebookModalOpen}
        onClose={() => setIsLorebookModalOpen(false)}
        lorebookEntries={lorebookEntries}
        onAddLorebook={handleAddLorebook}
        onUpdateLorebook={handleUpdateLorebook}
        onDeleteLorebook={handleDeleteLorebook}
        onLorebookKeywordAdd={handleLorebookKeywordAdd}
        onLorebookKeywordRemove={handleLorebookKeywordRemove}
        showToast={showToast}
      />

      {/* NPC Modal Overlay */}
      <NpcModal
        selectedNpc={selectedNpc}
        onClose={() => setSelectedNpc(null)}
        onRecordNpc={handleRecordNpc}
        onTogglePinNpc={handleTogglePinNpc}
        onAddNpcMemory={handleAddNpcMemory}
        onRemoveNpcMemory={handleRemoveNpcMemory}
      />

      {/* System Prompt Modal Overlay */}
      <SystemPromptModal
        isOpen={isSystemPromptModalOpen}
        onClose={() => setIsSystemPromptModalOpen(false)}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        showToast={showToast}
      />

      {/* Settings Modal Overlay */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        maxTokens={maxTokens}
        setMaxTokens={setMaxTokens}
        handleExportSave={handleExportSave}
        handleImportSave={handleImportSave}
        handleResetGame={handleResetGame}
      />

      {/* Map Modal */}
      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        lorebookEntries={lorebookEntries}
        currentLocation={currentLocation}
        profile={profile}
        memories={memories}
        onTravel={handleTravel}
        showToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-stone-800/80 backdrop-blur-md border border-white/10 text-stone-200 px-6 py-3 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] z-[100] flex items-center animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckSquare className="w-4 h-4 mr-2 text-emerald-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
