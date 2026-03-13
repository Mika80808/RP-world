import React, { useState, useRef, useEffect } from 'react';
import { Settings, Save, Send, RefreshCw, MoreVertical, Book, BookOpen, User, Package, Beaker, Globe, Users, Heart, MapPin, Zap, Coins, Calendar, Shield, Plus, Trash2, CheckSquare, Square, Download, Upload, RotateCcw, Lock, ChevronDown, ChevronRight, Map as MapIcon, Navigation, Cloud, Sun, CloudRain, Snowflake, Moon, Wind, Leaf, Star, Sparkles, Pin, Brain, Search, BookPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
  const [isLorebookModalOpen, setIsLorebookModalOpen] = useState(false);
  const [isSystemPromptModalOpen, setIsSystemPromptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isConsumablesOpen, setIsConsumablesOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);
  const [selectedConsumableItem, setSelectedConsumableItem] = useState<string | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    const saved = localStorage.getItem('rpworld_last_saved');
    return saved ? new Date(saved) : null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── 啟動時讀取快捷存檔 ───────────────────────────────────────────────────────
  const _s = (() => {
    try {
      const raw = localStorage.getItem('rpworld_save');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [timeState, setTimeState] = useState(() => _s?.timeState || {
    year: 1024,
    month: 4,
    day: 15,
    hour: 21,
    minute: 30,
    weather: '晴朗', // 晴朗, 陰天, 下雨, 下雪, 起霧
  });

  const getTimeOfDay = (hour: number) => {
    if (hour >= 5 && hour < 9) return '清晨';
    if (hour >= 9 && hour < 16) return '白天';
    if (hour >= 16 && hour < 19) return '黃昏';
    return '夜晚';
  };

  const timeOfDay = getTimeOfDay(timeState.hour);

  const MONTHS_DATA = [
    { id: 1, name: '一月', elegant: '初雪之月', desc: '山頂除穢日：將象徵厄運的舊物丟下山崖。' },
    { id: 2, name: '二月', elegant: '霜降之月', desc: '湖面結冰，準備過冬。' },
    { id: 3, name: '三月', elegant: '新芽之月', desc: '初獵祭與伴侶誓約週。' },
    { id: 4, name: '四月', elegant: '雙月之月', desc: '月光特別明亮，彷彿放大一般。霧光許願夜與星織之夜。' },
    { id: 5, name: '五月', elegant: '驕陽之月', desc: '月湖夏日祭，全種族慶典。' },
    { id: 6, name: '六月', elegant: '碩果之月', desc: '果實成熟的季節。' },
    { id: 7, name: '七月', elegant: '落葉之月', desc: '紅斗篷試煉 (目前已取消)。' },
    { id: 8, name: '八月', elegant: '赤獲之月', desc: '豐收之宴與潮詠節。' },
    { id: 9, name: '九月', elegant: '初霜之月', desc: '熔火與利齒日，為武器與工具祈福。' },
    { id: 10, name: '十月', elegant: '祖喚之月', desc: '祖靈低語之夜與冬眠大宴。' },
    { id: 11, name: '十一月', elegant: '長夜之月', desc: '幻夢開幕夜，異時空商販出現。' },
    { id: 12, name: '十二月', elegant: '星墜之月', desc: '時之塔守望，冒險者聚集許願。' },
  ];

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

  const [npcs, setNpcs] = useState<any[]>(() => _s?.npcs || []);

  const [currentLocation, setCurrentLocation] = useState(() => _s?.currentLocation || '迷霧森林');

  // ─── API Key ──────────────────────────────────────────────────────────────────
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem('gemini_api_key') || ''
  );

  // ─── Max Tokens ───────────────────────────────────────────────────────────────
  const TOKEN_OPTIONS = [
    { label: '16K', value: 16384 },
    { label: '32K', value: 32768 },
    { label: '64K', value: 65536 },
  ];

  const [maxTokens, setMaxTokens] = useState<number>(
    () => parseInt(localStorage.getItem('gemini_max_tokens') || '32768')
  );

  // ─── 統一記憶陣列 ────────────────────────────────────────────────────────────
  const [memories, setMemories] = useState<any[]>(() => _s?.memories || []);
  const [stickyCounters, setStickyCounters] = useState<Record<string, number>>({});
  const [cooldownCounters, setCooldownCounters] = useState<Record<string, number>>({});

  const [profile, setProfile] = useState(() => _s?.profile || {
    name: '異鄉人',
    job: '異鄉人',
    appearance: '',
    personality: '',
    other: '',
    hp: 50,
    mp: 0,
    gold: 0
  });

  const [systemPrompt, setSystemPrompt] = useState(() => _s?.systemPrompt || {
    worldPremise: '這是一個奇幻異世界，{{user}}將在不知情的情況下探索這個異世界、完成任務、與角色發展關係與感情。\n- 這個異世界由某種高維智慧所維護。\n- 異鄉人來自現實世界，具備基本常識，但對異世界完全陌生。\n- 世界中存在童話故事的變體，例如小紅帽、美人魚等，但劇情與角色可能出現劇情偏移或性格改變。\n- 世界設有主要據點（如中心城鎮）與可探索地區（森林、湖泊、荒原、山區等），每區域對應一組主題任務。\n- 也有許多異世界異鄉人選擇留下(例如成家立業等等)\n- 需體現角色特性，每個種族有特殊的外型特徵和文化習俗，讓角色具有特色。',
    roleplayRules: '1. 情感深度： 所有角色（含引路者）都可自由與{{user}}建立並發展多元情感。\n2. 劇情驅動： 確保每一次互動都至少為故事增添了一個新資訊、一個新懸念、或是一個人物關係的微小變化。\n3. 角色的自主性:\n- 每位角色具備獨特個性、習慣、目標、怪癖、慾望及社會地位。藉由角色與環境或人物的互動展現其身分、能力與特質，賦予存在價值。\n- 角色擁有獨立日常作息與目標。即使和{{user}}沒有互動，角色也會繼續生活、執行事務，其行動可能與{{user}}的行動交匯或觸發新情節。世界不只圍繞{{user}}的即時行動運轉。\n- 我與角色互動時，場景不僅限於兩人對話，其他角色可能隨時加入、插話、離開或分心。\n4. 人性化的理解力：在日常休閒或私人的社交情境中，優先將我的想法理解為其**內在真實情感**的流露，而非帶有隱藏目的的策略。展現出人性化的理解與共情，但敵對角色不受此限制。\n5. 世界的動態性：\n- Player Decentralization，世界有自己的時鐘和日程表。\n- Emergent Narrative，突發事件與環境變化隨時發生，確保不可預測性與真實流動感。\n6. 任務：\n- 日常任務：以輕鬆方式引導我探索世界，豐富內容，增強沉浸感。\n- 大型任務：將對故事產生影響，事件發生的前因後果及背景邏輯須合理。\n7. NPC生成：當AI生成新NPC時，需必備：姓名、性別、年齡、種族、職業、外貌、個性。\n8. NPC記錄門檻：若AI生成的新NPC具備明確姓名、職業，且會固定出現在特定場所（如店鋪老闆、公會負責人等），請在對話中特別標註 [重要NPC]。\n\n## 親密內容\n- 確保所有成人親密內容均服務於敘事和人物發展，角色行為須符合人物設定。\n- 在親密場景中使用真實、細膩且生動的措詞，器官名稱可使用生物學名。\n- 情侶之間的親密行為，是互相引誘、探索、取悅的過程，角色需依照兩人關係調整學習曲線，避免模式僵化。\n- Slowburn. Prolong all aspects of the back-and-forth journey of sex (foreplay, actions, climax)—orgasm is not the goal.',
    writingStyle: `每回合輸出：\n- 使用繁體中文，小說體，1000字左右的故事內容，保持句子完整流暢。\n- 描述接下來場景發生的事，不須重複{{user}}給出的內容。\n- 描寫角色們，寫出精確、逼真的細節來創造生動的場景和可信的人物，使用生動的感官細節，創造沉浸式體驗。\n- 保持故事節奏，不要跳躍太快。\n- 角色們需主動和異鄉人互動，結尾須保持開放性。\n- 文筆須豐富多彩、描述感情時須內斂。\n- 嚴禁結束章節，Avoid meta dialogue — story should stay fully immersed in it's own reality.`
  });

  const [diaryEntries, setDiaryEntries] = useState<any[]>(() => _s?.diaryEntries || []);
  const [editingDiaryId, setEditingDiaryId] = useState<number | null>(null);
  const [isDiaryMergeMode, setIsDiaryMergeMode] = useState(false);
  const [diaryMergeSelection, setDiaryMergeSelection] = useState<number[]>([]);
  const [isDiaryGenerating, setIsDiaryGenerating] = useState(false);
  const [expandedMergedIds, setExpandedMergedIds] = useState<number[]>([]);

  const [lorebookEntries, setLorebookEntries] = useState<any[]>(() => _s?.lorebookEntries || [
    { id: 1, title: '月湖鎮', content: '世界中心，醉醺醺酒館、任務板(日常任務)、情報來源、各類店家、住宅與商店街混合，在這裡可以見到各種奇幻種族。外圍有各種公會的據點，例如異鄉人公會、獵人公會、冒險者公會等等。西邊外圍有成人紅燈區。', category: '地點', isActive: true },
    { id: 2, title: '迷霧森林', content: '小紅帽副本：公會奶奶負責保管紅色斗篷，獵人公會訓練出來的學徒，每年都會派一位代表披上「紅斗篷」，跟狼族學徒決鬥一次(切磋性質)', category: '地點', isActive: true },
    { id: 3, title: '狼族領地', content: '黑牙氏族領地，非請勿擾', category: '地點', isActive: true },
    { id: 4, title: '大斷崖', content: '靠近地圖北端的懸崖，懸崖山洞裡有寶藏跟龍，附近是矮人堡壘', category: '地點', isActive: true },
    { id: 5, title: '失序谷', content: '「失序谷」是一個地理名稱，因其內部地形崎嶇、生態系統混亂且不合邏輯而得名。廣義上屬於魔王的勢力範圍，因此也被稱為「魔族區域」。\n「魔王城」坐落在山峰之中。谷中有群聚鬧區也有散落居住的居民。\n氣氛歡樂鬆散，會欺騙、惡作劇。\n有各式各樣的種族，包括媚魔、吸血鬼、骷髏怪等等。\n偶爾會有人被惡作劇，變成其他種族或性別。適合投機份子的去處。', category: '地點', isActive: true },
    { id: 6, title: '白樺樹之森', content: '白雪公主副本：皇后送了白雪公主一顆「Apple 」，這個「Apple」可以傳遞聲音、拍照，還可以看世界各地的迷因影片，白雪公主每天玩蘋果玩到三更半夜，非常不自律。', category: '地點', isActive: true },
    { id: 7, title: '永夜沙灘', content: '人魚氏族：有魔法藥劑可以讓人魚上岸，偶爾會偽裝成人類去貿易，但新上岸的人魚對陸地生活較陌生，容易發生尷尬的事，需要老手帶領。人魚除了外表好看之外，多少帶點魚類的特性，例如：海豚可以用高頻率傳遞訊息，鯊魚喜歡吃生魚片。嚴禁有「接吻魚」習性的人魚上岸。大魚吃小魚，人魚也吃魚。', category: '地點', isActive: true },
    { id: 8, title: '湖畔詩社', content: '永夜湖畔的文藝聚會點，聚集吟遊詩人與旅人，會發佈特殊情報或支線任務。也是個野餐的好地點。', category: '地點', isActive: true },
    { id: 9, title: '鐘塔荒野', content: '睡美人副本：這個睡美人是歷年來擔任最久的一屆，一堆人吻她都沒反應，但可能會爬起來敷衍冒險者。（隱藏彩蛋：進入睡美人夢境後，會發現她的夢境是通往愛麗絲的夢遊仙境，而她是裡面的紅心皇后，樂不思蜀，不想醒來。）', category: '地點', isActive: true },
    { id: 10, title: '月湖驛站', content: '鐘塔荒野附近，得到穿越時空的素材，可以搭車回到素材當下的時間（也能「重置」道具狀態）', category: '地點', isActive: true },
    { id: 11, title: '幻夢市集', content: '只在夜晚出現的流動市集，有神祕商人與奇珍異寶。', category: '地點', isActive: true },
    { id: 12, title: '霧光花園', content: '夢幻花園，盛開著螢光花，據說能讓人變得誠實，有人會約在這裡告白、求婚、逼問對方是否出軌，也有人會在這裡辦民間調解。', category: '地點', isActive: true },
    { id: 13, title: '失落拼圖山丘', content: '許多冒險者(不限於異鄉人)會在這裡丟棄失敗的任務線索，據說是能擺脫霉氣。有些人會到這裡尋寶，也許可以從某些道具解鎖其他訊息。', category: '地點', isActive: true },
    { id: 14, title: '黑森林古道', content: '連接月湖鎮與迷霧森林的隱蔽小徑，據說偶爾會出現會誘人的「糖果屋」。', category: '地點', isActive: true },
    { id: 15, title: '異鄉人公寓', content: '位於月湖鎮城南住宅區的三層木造建築，外觀略顯陳舊，但結構依然堅固。由異鄉人公會管理，為居住者提供了一份低調的安寧。每週租金35銅。\n一樓：公共空間。公寓的公共生活圍繞著「互助」與「資訊共用」的核心展開，主要體現在一樓的布告欄上。\n二樓與三樓：寢室區。', category: '地點', isActive: true },
    { id: 18, title: '芬里爾', job: '黑牙氏族首領', appearance: '銀藍色毛髮，金色眼眸，身形高大，具有王者氣派。', personality: '威嚴、果決、深思熟慮，一位高瞻遠矚的改革家與理想主義者。', other: '黑牙氏族現任首領（Alpha），擁有絕對的權威。孤獨的遠見者。他廢除決鬥儀式的決定，絕非一時興起，而是他籌謀已久、甚至可能已為此與族中保守派鬥爭多年的結果。曾是「氏族最強的戰士」。', category: 'NPC', isActive: true },
    { id: 19, title: '格雷厄姆', job: '黑牙氏族指揮官', appearance: '暗灰色短毛髮，金色眼眸，面容嚴肅，不苟言笑，眼神銳利，「行走的冰山」。', personality: '典型的軍人風格，務實、嚴肅、忠誠不二。思考問題偏向戰略與安全。', other: '黑牙氏族指揮官，芬里爾的得力助手，掌管族內軍事與防衛。他並非天生的完美戰士，而是靠後天加倍的努力與嚴苛的自我要求，才爬到了今天的位置。極度自律、有著強烈的責任感與榮譽感。喜歡鹹食。', category: 'NPC', isActive: true },
    { id: 20, title: '布萊茲', job: '黑牙氏族副指揮官', appearance: '淡灰色短毛髮，藍色瞳孔。', personality: '平時有點玩世不恭，但知道分寸，在軍中扮演白臉的角色，但以上級的命令為絕對優先。', other: '黑牙氏族副指揮官（斥候）- 平時負責物資調度，熟知族內大小事，特殊時期才會輔佐格雷厄姆，據本人的說法是，因為格雷厄姆覺得他有點煩。', category: 'NPC', isActive: true },
    { id: 21, title: '烏爾夫', job: '首席藥師兼弓箭手', appearance: '銀白色短毛髮，琥珀色的眼眸，身上常帶有淡淡的草藥清香。', personality: '溫和、善良、博學、體貼、樂於助人，醫術高明，令人安心的暖男。', other: '黑牙氏族首席藥師兼弓箭手，備受族人尊敬和信賴。因幼年時母親體弱多病，立志成為能拯救他人的藥師。對森林中的藥草與植物瞭若指掌。儘管體質並非天生強悍，但他從未缺席過任何一次戰士訓練。擁有神射手箭術、強大的力量與動態視力。能夠拉開比他人還高的黑色長弓。該弓的弓弦由龍筋混合特殊魔法金屬絲線製成，用途是「威懾」與「破甲」，足以射穿龍鱗等級的護甲。芬里爾是學長，格雷厄姆、烏爾夫、布萊茲是同期訓練生，私交不錯。', category: 'NPC', isActive: true },
    { id: 22, title: '西拉斯', job: '藥師', appearance: '灰白色狼人，身上披著一件深色的樸素長袍，戴著一副看起來像是用晶石打磨成的單片眼鏡。', personality: '表面寡言，內心柔軟。擁有驚人的智慧與洞察力。', other: '氏族最年長的藥師，烏爾夫的老師，德高望重。', category: 'NPC', isActive: true },
    { id: 23, title: '格瑞塔', job: '公共廚房負責人', appearance: '', personality: '嗓門洪亮、性格爽朗、熱情豪邁，樂於分享食材和經驗。是典型的大家長式人物。喜歡看狼族成員戀愛（有多子多孫的意思）', other: '黑牙氏族公共廚房的負責人。', category: 'NPC', isActive: true },
    { id: 24, title: '霍爾特', job: '工匠區管理者', appearance: '', personality: '脾氣暴躁、說話直接、不近人情，「口嫌體正直」。', other: '工匠區的管理者，負責氏族所有工具、武器、大型器具的製造與維護。', category: 'NPC', isActive: true },
    { id: 26, title: '艾娜', job: '育幼區長老', appearance: '', personality: '和藹可親。', other: ' 黑牙氏族育幼區長老，幼崽稱呼她為艾拉拉。格瑞達大嬸的母親。知道很多狼族成員幼崽時期的「黑歷史」。', category: 'NPC', isActive: true },
    { id: 27, title: '羅賓', job: '獵人公會代表', appearance: ' 人類。獵人公會代表。約 25 歲。身形結實，褐色微亂的短髮，臉上帶有些許雀斑，眼神清澈、堅定。', personality: '聰慧且善於學習，責任感強，正直的善良青年。他真心相信不同種族之間可以和平共存，並願意為此付出努力。是獵人公會中思想最為開明的年輕一代。', other: '人類，月湖鎮獵人公會代表、和平派對狼族事務的指定代表。具備優秀的森林知識、追蹤能力與野外生存技巧。不擅長正面衝突，但在接下和平派代表的責任後，交涉與應對危機的膽識正在快速成長。', category: 'NPC', isActive: true },
    { id: 28, title: '埃德蒙', job: '獵人公會會長', appearance: ' 人類。獵人公會會長。身形高大但略顯疲憊。整齊的灰黑色頭髮，法令紋讓他看起來比實際年齡更蒼老。穿著得體的深色正裝。', personality: '厭世、沉穩、理性、 外冷內熱。', other: '中年人類。曾是上一代最強的傳奇獵人，但在一次損失慘重的討伐任務後，他選擇退居幕後，成為了公會的管理者。那次任務讓他深刻體會到無謂衝突的代價，因此他內心其實是支持羅賓的和平路線的。和平派幕後的支持者，親自任命羅賓為對狼族事務的代表。會長整天埋首於公文與財務報表，但會在關鍵時刻用權威駁回凱拉過於激進的提案，或為私底下支援羅賓。', category: 'NPC', isActive: true },
    { id: 29, title: '凱拉', job: '主獵手', appearance: '人類。獵人公會主獵手。約30歲，身材高挑精悍，肌肉線條分明。紅色的短髮總是俐落地束在腦後。', personality: '暴躁、榮譽至上，直來直往、盛氣凌人。', other: '人類，戰鬥教官。凱拉是公會中的鷹派代表，也是最強的主力獵手之一。信奉「力量決定一切」，對於任何非人、尤其是具有掠食者天性的種族抱持懷疑(擔心人類受到威脅)。公開的反對和平派。他尊敬羅賓的勇氣，但不認同他的理念。', category: 'NPC', isActive: true },
    { id: 30, title: '艾文', job: '情報官', appearance: '人類。獵人公會情報官。年輕，精靈尖耳朵，但輪廓比純血精靈柔和。亞麻色的微卷中長髮，碧綠色眼精。', personality: '隨和、散漫。幽默、內向、八卦(消息最靈通)。', other: '半精靈。情報分析師 & 魔物生態研究員。艾文負責管理公會的任務檔案以及各種魔物材料。他對戰鬥一竅不通，但熟知「魔物學」。他最大的樂趣就是蒐集情報和鎮上的八卦。中立的情報提供者。艾文對政治立場不感興趣。', category: 'NPC', isActive: true },
    { id: 31, title: '盤根老爹', job: '店主/鍊金術師', appearance: '前冒險家，月湖鎮百草巷中的「盤根老爹的店」店主。非常年長（推測超過300歲，因其年輕時見過據說已絕跡三百年的「陽鱗龍蜥」）。', personality: '脾氣古怪，不善交際，有虛榮心。內在核心：極度念舊，重情重義。閱歷豐富，內心孤獨。', other: '矮人。前冒險家，月湖鎮百草巷中的「盤根老爹的店」店主、鍊金術師、鑑定師。作為一個活了數百年的「活化石」，他那看似炫耀的「故事模式」，其實是在宣洩孤獨。', category: 'NPC', isActive: true },
    { id: 32, title: '伊拉拉', job: '歷史學者', appearance: '女性。精靈。歷史學者', personality: '性格文靜、有禮貌且自律。', other: '精靈。歷史學者。似乎是公寓裡居住最久的成員。她的家鄉是名為「銀葉谷」的精靈城市，但因不明「變故」而無法回去。她在後院種植植物。', category: 'NPC', isActive: true },
    { id: 33, title: '波羅', job: '弓弩手/釀酒師', appearance: '紅眼、白長髮，身材精實。', personality: '初期謹慎，內心溫柔熱情，有著驚人的耐心與細緻。喝醉後會異常熱情。', other: '身手矯健，使用並保養複雜的輕型弩箭。釀造後勁強勁的「熊族蜂蜜酒」。', category: 'NPC', isActive: true },
    { id: 34, title: '里歐', job: '法師學徒', appearance: '穿著整齊的深藍色法師學徒袍。英俊，但表情通常略帶嚴肅。', personality: '秩序善良。講究規則、條理和紀律，有輕微的潔癖和強迫症。人很好，會主動組織茶會等公共事務，關心室友之間的和諧關係。', other: '人類。「奧術學宮」的法師學徒。技能：奧術理論知識、施放基礎的輔助性法術。', category: 'NPC', isActive: true },
    { id: 35, title: '莎夏', job: '鍊金術士', appearance: '棕色雜亂短髮。鼻樑上架著護目鏡，工作服上常沾有不明污漬。二十出頭，焦糖色大眼睛，充滿活力。', personality: '混亂中立，對未知事物充滿狂熱的好奇心，行事大膽，不畏風險。會忘記生活公約，但在閒暇時很健談、熱情。', other: '人類。鍊金術士。在公寓後面租了一個小房間當工作室。技能：鍊金術天才。能製作出效果奇特、味道也同樣奇特的藥劑與料理。', category: 'NPC', isActive: true },
    { id: 36, title: '波林', job: '老闆', appearance: '身材微胖，留著兩撇小鬍子的中年男人。', personality: '務實的生意人，為人不算刻薄，對員工有一定程度的保護心。有點八卦。', other: '人類。老闆。', category: 'NPC', isActive: true },
    { id: 37, title: '米米', job: '侍女兼雜工', appearance: '有著兔耳，紅色眼眸，活潑可愛。', personality: '善良、勤勞、關心家人。', other: '兔耳族，侍女兼雜工。與妹妹莉莉跟母親同住。', category: 'NPC', isActive: true },
    { id: 38, title: '巴克', job: '廚師', appearance: '身材魁梧，灰綠色皮膚，下顎有兩顆小獠牙。', personality: '沉默寡言，但內心認可勤勞的人。經驗老道，直覺敏銳。', other: '半獸人。廚師。', category: 'NPC', isActive: true },
    { id: 39, title: '魔王', job: '魔王', appearance: '失序谷魔王。外貌與性別可隨意變換，但無論如何變化，都會維持在一個「好看」的狀態。', personality: '聰明但散漫。混亂邪惡，但偏向樂子人，懶得親手害死誰，更享受戲弄別人帶來的樂趣。其領地的氛圍也因此顯得「歡樂鬆散」。', other: '會根據魔物特性，讓他們各司其職去工作。外貌協會：對「美」有著極高的標準，偏愛所有好看的外表。這一點也體現在他的城堡守則上——只有外貌姣好者才能進入。曾因為想作亂，和引路者有些「曲折的過去」，單方面認為自己跟「引路者」是歡喜冤家(同樣都活太久)。', category: 'NPC', isActive: true }
  ]);
  const [editingLorebookId, setEditingLorebookId] = useState<number | null>(null);
  const [lorebookFilter, setLorebookFilter] = useState<string>('地點');
  const [lorebookSearch, setLorebookSearch] = useState<string>('');

  const [inventory, setInventory] = useState<any[]>(() => _s?.inventory || []);

  const [consumables, setConsumables] = useState<any[]>(() => _s?.consumables || []);

  const [messages, setMessages] = useState(() => _s?.messages || [
    { id: 1, role: 'system', text: '*你在一陣微涼的晨風中醒來，意識像是從深不見底的湖底緩緩浮上水面。陽光穿透層層疊疊的奇異葉片，篩落在臉上，形成斑駁的光點。身下是柔軟而潮濕的苔癬，空氣中瀰漫著泥土、腐葉以及某種不知名野花的清甜香氣，一切都陌生得令人心慌。*\n\n*你記得的最後一件事，是在舒適的床上滑著手機，準備迎接又一個平凡的上班日。而現在，你正躺在一片廣闊無垠的原始森林裡，高聳入雲的巨木有著從未見過的扭曲枝幹，周遭的蕨類植物甚至比人還高。*\n\n*在你還在試圖理解現況時，一個清晰、中性且帶著一絲戲謔的聲音，直接在你腦海中響起。*\n\n🌀引路者：「早安，睡美人。或者我該說……迷途的羔羊？感覺你有很多問題想問，別急，我們有的是時間。首先，恭喜你，你還活著。」\n\n*這聲音聽起來不帶惡意，反而像個看了太多好戲的無聊房東，終於盼來了有趣的新房客。*' },
  ]);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickOptions, setQuickOptions] = useState<string[]>(() => _s?.quickOptions || ['觀察四周', '檢查自己', '大聲求助']);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mock World Map Data
  const [worldMap, setWorldMap] = useState({
    fixed: [
      { id: 'moon_lake', name: '月湖鎮', type: 'town', x: 0, y: 0, desc: '世界中心，醉醺醺酒館、任務板、情報來源、各類店家。外圍有各種公會據點。包含「異鄉人公寓」。' },
      { id: 'mist_forest', name: '迷霧森林', type: 'danger', x: 100, y: 50, desc: '小紅帽副本：公會奶奶負責保管紅色斗篷，每年派代表與狼族決鬥。' },
      { id: 'wolf_clan', name: '狼族領地', type: 'danger', x: 110, y: 70, desc: '黑牙氏族領地，非請勿擾。' },
      { id: 'great_cliff', name: '大斷崖', type: 'danger', x: 0, y: 140, desc: '懸崖山洞裡有寶藏跟龍，附近是矮人堡壘。' },
      { id: 'disorder_valley', name: '失序谷', type: 'city', x: -100, y: 100, desc: '魔王城所在。地形崎嶇、生態混亂。氣氛歡樂鬆散，有各種魔族，適合投機份子。' },
      { id: 'birch_forest', name: '白樺樹之森', type: 'danger', x: 0, y: 100, desc: '白雪公主副本：皇后送了「Apple」手機，白雪公主每天玩到三更半夜。' },
      { id: 'evernight_beach', name: '永夜沙灘', type: 'town', x: -100, y: 0, desc: '人魚氏族：有魔法藥劑可上岸貿易。嚴禁接吻魚上岸。' },
      { id: 'lakeside_poetry', name: '湖畔詩社', type: 'poi', x: -70, y: 10, desc: '永夜湖畔的文藝聚會點，發佈特殊情報或支線任務。' },
      { id: 'clock_tower', name: '鐘塔荒野', type: 'danger', x: 0, y: -100, desc: '睡美人副本：睡美人夢境通往愛麗絲夢遊仙境，她是紅心皇后，不想醒來。' },
      { id: 'moon_station', name: '月湖驛站', type: 'poi', x: 0, y: -60, desc: '得到穿越時空的素材，可以搭車回到素材當下的時間。' },
      { id: 'illusion_market', name: '幻夢市集', type: 'town', x: 50, y: -30, desc: '只在夜晚出現的流動市集，有神祕商人與奇珍異寶。' },
      { id: 'mist_light_garden', name: '霧光花園', type: 'poi', x: -70, y: 50, desc: '盛開螢光花，能讓人變得誠實，適合告白或民間調解。' },
      { id: 'lost_puzzle_hill', name: '失落拼圖山丘', type: 'poi', x: -70, y: 120, desc: '冒險者丟棄失敗任務線索的地方，可尋寶解鎖訊息。' },
      { id: 'black_forest_road', name: '黑森林古道', type: 'poi', x: 80, y: 30, desc: '連接月湖鎮與迷霧森林的隱蔽小徑，偶爾出現「糖果屋」。' }
    ],
    dynamic: [
      { id: 'd1', name: '破舊的木屋', location: '迷霧森林邊緣', desc: '門半掩著，裡面透出微弱的火光與嘶吼聲。', isPinned: true },
      { id: 'd2', name: '冒泡的毒沼澤', location: '前往王都的路上', desc: '散發著惡臭的泥潭，似乎隱藏著某種生物。', isPinned: false }
    ]
  });

  const [mapOrigin, setMapOrigin] = useState<string | null>(null);
  const [mapDestination, setMapDestination] = useState<string | null>(null);

  const calculateTravelTime = () => {
    if (!mapOrigin || !mapDestination) return null;
    const origin = worldMap.fixed.find(loc => loc.id === mapOrigin);
    const dest = worldMap.fixed.find(loc => loc.id === mapDestination);
    if (!origin || !dest) return null;
    
    const distance = Math.sqrt(Math.pow(dest.x - origin.x, 2) + Math.pow(dest.y - origin.y, 2));
    
    const walkMinutes = Math.round(distance * 15);
    const walkHours = Math.floor(walkMinutes / 60);
    const walkMins = walkMinutes % 60;
    
    const carriageMinutes = Math.round(distance * 5);
    const carriageHours = Math.floor(carriageMinutes / 60);
    const carriageMins = carriageMinutes % 60;
    
    return {
      distance: Math.round(distance),
      walkTimeStr: walkHours > 0 ? `${walkHours} 小時 ${walkMins} 分鐘` : `${walkMins} 分鐘`,
      carriageTimeStr: carriageHours > 0 ? `${carriageHours} 小時 ${carriageMins} 分鐘` : `${carriageMins} 分鐘`
    };
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
    setEditingDiaryId(newId);
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
    if (editingDiaryId === id) setEditingDiaryId(null);
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
    setIsDiaryGenerating(true);
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
    } finally {
      setIsDiaryGenerating(false);
    }
  };

  // ─── 💫 融合日記：合併多條日記 ─────────────────────────────────────────────
  const handleMergeDiary = async () => {
    if (diaryMergeSelection.length < 2) { showToast('請勾選至少 2 條日記'); return; }
    const key = geminiApiKey.trim() || process.env.GEMINI_API_KEY || '';
    if (!key) { showToast('❌ 請先設定 Gemini API Key'); return; }
    const selected = diaryEntries.filter(e => diaryMergeSelection.includes(e.id));
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
      const sourceIds = diaryMergeSelection.slice();
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
      setDiaryMergeSelection([]);
      setIsDiaryMergeMode(false);
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

  const handleAddLorebook = () => {
    const newId = Date.now();
    setLorebookEntries([{ id: newId, title: '新設定', content: '', category: lorebookFilter, isActive: true, insertionOrder: 100, selective: false, secondaryKeys: [] }, ...lorebookEntries]);
    setEditingLorebookId(newId);
  };

  const handleDeleteLorebook = (id: number) => {
    setLorebookEntries(lorebookEntries.filter(entry => entry.id !== id));
    if (editingLorebookId === id) setEditingLorebookId(null);
  };

  const handleToggleLorebook = (id: number) => {
    setLorebookEntries(lorebookEntries.map(entry => 
      entry.id === id ? { ...entry, isActive: !entry.isActive } : entry
    ));
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

  const handleLorebookChange = (id: number, field: string, value: string) => {
    setLorebookEntries(lorebookEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleQuickSave = () => {
    const saveData = { profile, systemPrompt, diaryEntries, lorebookEntries, npcs, inventory, consumables, currentLocation, messages, memories, quickOptions, timeState };
    localStorage.setItem('rpworld_save', JSON.stringify(saveData));
    const now = new Date();
    localStorage.setItem('rpworld_last_saved', now.toISOString());
    setLastSavedAt(now);
    showToast('已快速存檔');
  };

  const handleExportSave = () => {
    const saveData = { profile, systemPrompt, diaryEntries, lorebookEntries, npcs, inventory, consumables, currentLocation, messages, memories, quickOptions, timeState };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const hr = String(now.getHours()).padStart(2,'0');
    const mi = String(now.getMinutes()).padStart(2,'0');
    a.download = `RP-world-${date}-${hr}-${mi}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('存檔已匯出');
  };

  const handleImportSave = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const saveData = JSON.parse(content);
        if (saveData.profile) setProfile(saveData.profile);
        if (saveData.systemPrompt) setSystemPrompt(saveData.systemPrompt);
        if (saveData.diaryEntries) setDiaryEntries(saveData.diaryEntries);
        if (saveData.lorebookEntries) setLorebookEntries(saveData.lorebookEntries);
        if (saveData.npcs) setNpcs(saveData.npcs);
        if (saveData.inventory) setInventory(saveData.inventory);
        if (saveData.consumables) setConsumables(saveData.consumables);
        if (saveData.currentLocation) setCurrentLocation(saveData.currentLocation);
        if (saveData.messages) setMessages(saveData.messages);
        if (saveData.memories) {
          setMemories(saveData.memories);
        } else {
          // ── 舊存檔自動轉換 ──────────────────────────────────────────────
          const migrated: any[] = [];
          const now = '（已匯入）';
          const defaults = {
            trigger: { scanDepth: 5, probability: 100, sticky: 0, cooldown: 0 },
            isActive: true, source: 'manual', createdAt: now
          };
          (saveData.worldMemory || []).forEach((text: string) => migrated.push({
            id: `mig_w_${Date.now()}_${Math.random()}`,
            type: 'world', importance: 'critical', content: text,
            tags: { locations: [], npcs: [], factions: [], keywords: [] },
            ...defaults
          }));
          (saveData.factionMemory || []).forEach((f: any) => {
            (f.memories || []).forEach((text: string) => migrated.push({
              id: `mig_f_${Date.now()}_${Math.random()}`,
              type: 'world', importance: 'normal', content: `[${f.name}] ${text}`,
              tags: { locations: [], npcs: [], factions: [f.name], keywords: [] },
              ...defaults
            }));
          });
          (saveData.locationMemory || []).forEach((loc: any) => {
            (loc.memories || []).forEach((text: string) => migrated.push({
              id: `mig_l_${Date.now()}_${Math.random()}`,
              type: 'scene', importance: 'normal', content: text,
              tags: { locations: [loc.name], npcs: [], factions: [], keywords: [] },
              ...defaults
            }));
          });
          if (migrated.length > 0) setMemories(migrated);
        }
        if (saveData.quickOptions) setQuickOptions(saveData.quickOptions);
        if (saveData.timeState) setTimeState(saveData.timeState);
        showToast('存檔已匯入');
        setIsSettingsModalOpen(false);
      } catch (error) {
        showToast('存檔格式錯誤');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetGame = () => {
    if (window.confirm('確定要重置遊戲嗎？所有未匯出的進度將會遺失。')) {
      localStorage.removeItem('rpworld_save');
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

  const handleRecordNpc = (npc: any) => {
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

  // ─── 前端 COMMANDS 解析器 ────────────────────────────────────────────────────
  const parseAndExecuteCommands = (rawText: string): string => {
    const commandBlockRegex = /<<COMMANDS>>([\s\S]*?)(?:<<\/COMMANDS>>|<\/COMMANDS>>|<\/COMMANDS>|$)/gi;
    const optionsBlockRegex = /<<OPTIONS>>([\s\S]*?)(?:<<\/OPTIONS>>|<\/OPTIONS>>|<\/OPTIONS>|$)/gi;
    let narrative = rawText;
    let commandsFound = false;
    let optionsFound = false;

    const allOptions: string[] = [];
    let optMatch;
    while ((optMatch = optionsBlockRegex.exec(narrative)) !== null) {
      optionsFound = true;
      const lines = optMatch[1]
        .split('\n')
        .map(l => l.replace(/^[\d\.\-\*\s]+/, '').trim())
        .filter(Boolean);
      allOptions.push(...lines);
    }
    if (optionsFound) {
      narrative = narrative.replace(/<<OPTIONS>>[\s\S]*?(?:<<\/OPTIONS>>|<\/OPTIONS>>|<\/OPTIONS>|$)/gi, '').trim();
      if (allOptions.length > 0) {
        setQuickOptions(allOptions);
      } else {
        setQuickOptions(['觀察四周', '檢查自己', '大聲求助']);
      }
    } else {
      setQuickOptions(['觀察四周', '檢查自己', '大聲求助']);
    }

    const allCommands: string[] = [];
    let match;
    while ((match = commandBlockRegex.exec(narrative)) !== null) {
      commandsFound = true;
      const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
      allCommands.push(...lines);
    }

    if (commandsFound) {
      narrative = narrative.replace(/<<COMMANDS>>[\s\S]*?(?:<<\/COMMANDS>>|<\/COMMANDS>>|<\/COMMANDS>|$)/gi, '').trim();
    }

    if (allCommands.length === 0) return narrative;

    let hpDelta = 0;
    let mpDelta = 0;
    let goldDelta = 0;
    const affinityUpdates: { name: string; delta: number }[] = [];
    const toastQueue: string[] = [];

    for (const cmd of allCommands) {
      const hpMatch = cmd.match(/^HP:([+-]\d+)$/i);
      if (hpMatch) {
        hpDelta += parseInt(hpMatch[1]);
        continue;
      }

      const mpMatch = cmd.match(/^MP:([+-]\d+)$/i);
      if (mpMatch) {
        mpDelta += parseInt(mpMatch[1]);
        continue;
      }

      const goldMatch = cmd.match(/^GOLD:([+-]\d+)$/i);
      if (goldMatch) {
        goldDelta += parseInt(goldMatch[1]);
        continue;
      }

      const affinityMatch = cmd.match(/^AFFINITY:(.+):([+-]\d+)$/i);
      if (affinityMatch) {
        affinityUpdates.push({ name: affinityMatch[1].trim(), delta: parseInt(affinityMatch[2]) });
        continue;
      }

      const locationMatch = cmd.match(/^LOCATION:(.+)$/i);
      if (locationMatch) {
        const newLoc = locationMatch[1].trim();
        setCurrentLocation(newLoc);
        toastQueue.push(`📍 移動至 ${newLoc}`);
        continue;
      }

      const timeMatch = cmd.match(/^TIME:\+(\d+)(h|m)$/i);
      if (timeMatch) {
        const amount = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        setTimeState(prev => {
          const totalMinutes = prev.hour * 60 + prev.minute + (unit === 'h' ? amount * 60 : amount);
          const newDay = prev.day + Math.floor(totalMinutes / (24 * 60));
          const remainMinutes = totalMinutes % (24 * 60);
          return {
            ...prev,
            hour: Math.floor(remainMinutes / 60),
            minute: remainMinutes % 60,
            day: newDay,
          };
        });
        continue;
      }

      const itemAddMatch = cmd.match(/^ITEM_ADD:(.+):(\d+):?(.*)$/i);
      if (itemAddMatch) {
        const [, name, qty, desc] = itemAddMatch;
        setInventory(prev => {
          const exists = prev.find(i => i.name === name.trim());
          if (exists) {
            return prev.map(i => i.name === name.trim() ? { ...i, quantity: i.quantity + parseInt(qty) } : i);
          }
          return [...prev, { id: Date.now(), name: name.trim(), quantity: parseInt(qty), description: desc?.trim() || '' }];
        });
        toastQueue.push(`🎒 獲得 ${name.trim()} x${qty}`);
        continue;
      }

      const itemRemoveMatch = cmd.match(/^ITEM_REMOVE:(.+):(\d+)$/i);
      if (itemRemoveMatch) {
        const [, name, qty] = itemRemoveMatch;
        setInventory(prev =>
          prev.map(i => i.name === name.trim() ? { ...i, quantity: i.quantity - parseInt(qty) } : i)
             .filter(i => i.quantity > 0)
        );
        continue;
      }

      const memAddMatch = cmd.match(/^MEMORY_ADD:(world|region|scene|npc):(.+)$/i);
      if (memAddMatch) {
        const [, rawType, rest] = memAddMatch;
        const parts = rest.split(':');

        const importancePat = /^(critical|normal|flavor)$/i;
        let importance = 'normal';
        let contentStart = 0;
        if (importancePat.test(parts[0])) {
          importance = parts[0].toLowerCase();
          contentStart = 1;
        }

        let optStart = parts.findIndex((p, i) => i > contentStart && p.includes('='));
        if (optStart === -1) optStart = parts.length;

        const contentStr = parts.slice(contentStart, optStart).join(':').trim();
        const optParts = parts.slice(optStart);

        const getOpt = (key: string) => {
          const found = optParts.find(p => p.toLowerCase().startsWith(key + '='));
          return found ? found.split('=')[1] : '';
        };

        const locations  = getOpt('locations') || getOpt('location')
          ? (getOpt('locations') || getOpt('location')).split(',').map(s => s.trim()).filter(Boolean)
          : (rawType === 'scene' || rawType === 'region') ? [currentLocation] : [];
        const npcs       = getOpt('npcs') || getOpt('npc')
          ? (getOpt('npcs') || getOpt('npc')).split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const factions   = getOpt('factions') || getOpt('faction')
          ? (getOpt('factions') || getOpt('faction')).split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const keywords   = getOpt('keywords') || getOpt('keyword')
          ? (getOpt('keywords') || getOpt('keyword')).split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const sticky     = parseInt(getOpt('sticky') || '0');
        const expires    = getOpt('expires') || undefined;

        const finalLocations = locations.length > 0 ? locations
          : (rawType === 'scene' || rawType === 'region') ? [currentLocation] : [];

        const newMem = {
          id: `mem_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
          type: rawType.toLowerCase(),
          importance,
          content: contentStr,
          tags: { locations: finalLocations, npcs, factions, keywords },
          trigger: { scanDepth: 5, probability: 100, sticky, cooldown: 0 },
          isActive: true,
          source: 'ai_generated',
          createdAt: `帝國曆 ${timeState.year}年${timeState.month}月${timeState.day}日`,
          ...(expires ? { expiresAt: expires } : {}),
        };

        setMemories(prev => [...prev, newMem]);
        toastQueue.push(`📝 新增${rawType === 'world' ? '世界' : rawType === 'region' ? '區域' : rawType === 'scene' ? '場景' : 'NPC'}記憶`);
        continue;
      }
    }

    if (hpDelta !== 0 || mpDelta !== 0 || goldDelta !== 0) {
      setProfile(prev => {
        const newHp = Math.max(0, prev.hp + hpDelta);
        const newMp = Math.max(0, prev.mp + mpDelta);
        const newGold = Math.max(0, prev.gold + goldDelta);

        if (hpDelta !== 0) toastQueue.push(hpDelta > 0 ? `❤️ HP +${hpDelta}` : `💔 HP ${hpDelta}`);
        if (mpDelta !== 0) toastQueue.push(mpDelta > 0 ? `💙 MP +${mpDelta}` : `💙 MP ${mpDelta}`);
        if (goldDelta !== 0) toastQueue.push(goldDelta > 0 ? `🪙 +${goldDelta} G` : `🪙 ${goldDelta} G`);

        if (newHp === 0) toastQueue.push('💀 HP 歸零！');

        return { ...prev, hp: newHp, mp: newMp, gold: newGold };
      });
    }

    if (affinityUpdates.length > 0) {
      setNpcs(prev => prev.map(npc => {
        const update = affinityUpdates.find(u =>
          npc.name.includes(u.name) || u.name.includes(npc.name)
        );
        if (!update) return npc;
        const newAffinity = Math.max(-100, Math.min(100, npc.affection + update.delta));
        toastQueue.push(`${update.delta > 0 ? '💛' : '🖤'} ${npc.name} 好感度 ${update.delta > 0 ? '+' : ''}${update.delta}`);
        return { ...npc, affection: newAffinity };
      }));
    }

    toastQueue.forEach((msg, i) => {
      setTimeout(() => showToast(msg), i * 600);
    });

    return narrative;
  };

  // ─── 關鍵字掃描 ──────────────────────────────────────────────────────────────
  const scanKeywords = (keywords: string[], scanDepth = 5, extraText = ''): boolean => {
    if (!keywords || keywords.length === 0) return true;
    const recentTexts = messages
      .slice(-scanDepth)
      .map(m => m.text.toLowerCase())
      .join(' ') + ' ' + extraText.toLowerCase();
    return keywords.some(kw => recentTexts.includes(kw.toLowerCase()));
  };

  // ─── 記憶觸發判斷 ────────────────────────────────────────────────────────────
  const isMemoryTriggered = (mem: any, userInput = ''): boolean => {
    if (!mem.isActive) return false;
    if ((cooldownCounters[mem.id] || 0) > 0) return false;
    if ((stickyCounters[mem.id] || 0) > 0) return true;

    const prob = mem.trigger?.probability ?? 100;
    if (prob < 100 && Math.random() * 100 > prob) return false;

    const allKeywords = [
      ...(mem.tags?.locations || []),
      ...(mem.tags?.npcs || []),
      ...(mem.tags?.factions || []),
      ...(mem.tags?.keywords || []),
    ];
    const depth = mem.trigger?.scanDepth ?? 5;
    return scanKeywords(allKeywords, depth, userInput);
  };

  // ─── 每次 AI 回應後更新 sticky/cooldown 計數器 ────────────────────────────
  const tickMemoryCounters = (triggeredIds: string[]) => {
    setStickyCounters(prev => {
      const next = { ...prev };
      triggeredIds.forEach(id => {
        const mem = memories.find(m => m.id === id);
        const sticky = mem?.trigger?.sticky ?? 0;
        if (sticky > 0) next[id] = sticky;
      });
      Object.keys(next).forEach(id => {
        if (!triggeredIds.includes(id) && next[id] > 0) {
          next[id] -= 1;
          if (next[id] === 0) {
            const mem = memories.find(m => m.id === id);
            const cd = mem?.trigger?.cooldown ?? 0;
            if (cd > 0) {
              setCooldownCounters(c => ({ ...c, [id]: cd }));
            }
            delete next[id];
          }
        }
      });
      return next;
    });
    setCooldownCounters(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (next[id] > 0) next[id] -= 1;
        if (next[id] === 0) delete next[id];
      });
      return next;
    });
  };

  // ─── Prompt 組裝 ─────────────────────────────────────────────────────────────
  const buildPrompt = (userInput: string, currentMessages: any[]): string => {
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

    const relevantLorebook = lorebookEntries
      .filter(e => {
        if (!e.isActive) return false;
        if (e.category === 'NPC') {
          const inScene = npcs.some(n => n.isPinned && n.name === e.title) ||
                          npcs.some(n => n.location === currentLocation && n.name === e.title);
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
${consumables.length > 0 ? consumables.map(i => `- ${i.name} x${i.quantity}: ${i.description}`).join('\n') : ''}

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
[Scene Lorebook]
${relevantLorebook.map(e => {
  if (e.category === 'NPC') {
    return `[NPC] ${e.title}｜職業：${e.job || ''}｜外貌：${e.appearance || ''}｜個性：${e.personality || ''}｜備註：${e.other || ''}`;
  }
  return `[${e.category}] ${e.title}：${e.content}`;
}).join('\n') || '（無）'}

[Pinned NPCs]
${pinnedNpcs.length > 0 ? pinnedNpcs.map(n =>
  `- ${n.name}（${n.job}）好感度:${n.affection}｜${n.memories?.length > 0 ? '記憶: ' + n.memories.join(' / ') : ''}`
).join('\n') : '（無）'}

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
MEMORY_ADD:region:normal:迷霧森林昨日大火，黑牙氏族前往支援:locations=迷霧森林:factions=黑牙氏族:keywords=大火,火災:sticky=3
MEMORY_ADD:scene:normal:酒館因打架暫時關閉:locations=酒館
MEMORY_ADD:npc:normal:芬里爾透露停火協議內容:npcs=芬里爾:keywords=停火,協議
MEMORY_ADD:world:critical:魔王宣布向月湖鎮宣戰:keywords=魔王,宣戰
<</COMMANDS>>
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

      const narrative = parseAndExecuteCommands(fullText);
      setMessages(prev => prev.map(m =>
        m.id === aiMessageId ? { ...m, text: narrative } : m
      ));

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
              <li className="text-stone-500 italic">目前沒有任務</li>
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
                                setConsumables(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
                                
                                if (item.name === '小紅藥水') {
                                  setProfile(prev => ({ ...prev, hp: Math.max(0, prev.hp + 30) }));
                                  setToastMessage(`使用了 ${item.name}，恢復了 30 點 HP`); 
                                } else if (item.name === '麵包') {
                                  setProfile(prev => ({ ...prev, hp: Math.max(0, prev.hp + 10) }));
                                  setToastMessage(`使用了 ${item.name}，恢復了 10 點 HP`); 
                                } else {
                                  setToastMessage(`使用了 ${item.name}`); 
                                }
                                
                                setSelectedConsumableItem(null); 
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

          <div className="flex space-x-2 mt-auto">
            <button 
              onClick={handleQuickSave}
              className="flex-1 bg-stone-800/40 backdrop-blur-sm border border-white/5 hover:bg-stone-700/50 p-2 rounded-xl flex items-center justify-center transition text-sm"
            >
              <Save className="w-4 h-4 mr-2" /> 存檔
            </button>
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
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
      {isQuestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#f4ebd8]/95 backdrop-blur-md w-full max-w-4xl h-[80vh] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col overflow-hidden text-stone-800 relative">
            
            <button 
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-800 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 hover:bg-stone-300 transition"
              onClick={() => setIsQuestModalOpen(false)}
            >
              ✕
            </button>

            <div className="flex-1 flex">
              <div className="flex-1 p-8 border-r border-stone-300/50 relative overflow-y-auto">
                <div className="absolute right-[-10px] top-10 bottom-10 flex flex-col justify-between w-5 z-10">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-4 w-full bg-stone-300 rounded-full shadow-inner border border-stone-400"></div>
                  ))}
                </div>

                <h2 className="text-3xl font-bold mb-6 text-stone-800 border-b-2 border-stone-800/20 pb-2">進行中任務</h2>
                
                <div className="space-y-6">
                  <div className="text-center text-stone-500 py-10">
                    目前沒有進行中的任務。
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 relative bg-gradient-to-r from-stone-900/5 to-transparent overflow-y-auto">
                <h2 className="text-3xl font-bold mb-6 text-stone-800 border-b-2 border-stone-800/20 pb-2">任務清單</h2>
                
                <div className="space-y-4">
                  <h4 className="font-bold text-stone-500 uppercase tracking-widest text-sm mb-2">可接取</h4>
                  <ul className="space-y-2">
                    <li className="text-sm text-stone-500 italic p-3">目前沒有可接取的任務</li>
                  </ul>

                  <h4 className="font-bold text-stone-500 uppercase tracking-widest text-sm mb-2 mt-8">已完成</h4>
                  <ul className="space-y-2 opacity-60">
                    <li className="text-sm text-stone-500 italic p-3">目前沒有已完成的任務</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal Overlay */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
              <h2 className="text-lg font-bold flex items-center"><User className="w-5 h-5 mr-2 text-indigo-400" /> 個人資訊</h2>
              <button 
                className="text-stone-400 hover:text-white transition"
                onClick={() => setIsProfileModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wider">姓名</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  placeholder="未知"
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wider">職業</label>
                <input 
                  type="text" 
                  value={profile.job}
                  onChange={(e) => setProfile({...profile, job: e.target.value})}
                  placeholder="例如：異鄉人、劍士、魔法師"
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wider">外貌</label>
                <textarea 
                  value={profile.appearance}
                  onChange={(e) => setProfile({...profile, appearance: e.target.value})}
                  placeholder="例如：性別、年齡、穿著。"
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wider">個性</label>
                <textarea 
                  value={profile.personality}
                  onChange={(e) => setProfile({...profile, personality: e.target.value})}
                  placeholder="例如：務實、謹慎、對陌生人抱有戒心。"
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wider">其他</label>
                <textarea 
                  value={profile.other}
                  onChange={(e) => setProfile({...profile, other: e.target.value})}
                  placeholder="例如：喜惡、習慣。"
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-stone-900/50 flex justify-end">
              <button 
                className="bg-indigo-600/80 hover:bg-indigo-500/80 backdrop-blur-sm text-white px-5 py-2.5 rounded-xl flex items-center transition text-sm shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                onClick={() => setIsProfileModalOpen(false)}
              >
                <Save className="w-4 h-4 mr-2" /> 儲存設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diary Modal Overlay */}
      {isDiaryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative h-[80vh]">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
              <div className="flex items-center">
                <h2 className="text-lg font-bold flex items-center"><Book className="w-5 h-5 mr-2 text-amber-400" /> 日記與記憶</h2>
                <span className="ml-4 text-xs text-stone-400">勾選的項目將會被 AI 讀取並帶入遊戲記憶中</span>
              </div>
              <button 
                className="text-stone-400 hover:text-white transition"
                onClick={() => setIsDiaryModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 border-b border-white/5 bg-stone-900/30 flex gap-2">
              <button
                onClick={handleAddDiary}
                className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-stone-800/40 hover:bg-stone-700/50 border border-white/10 hover:border-white/20 transition"
              >
                <span className="text-lg">📝</span>
                <span className="text-[10px] text-stone-400">新增日記</span>
              </button>

              <button
                onClick={handleGenerateDiary}
                disabled={isDiaryGenerating}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border transition ${isDiaryGenerating ? 'opacity-50 cursor-not-allowed bg-stone-800/40 border-white/10' : 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-500/30 hover:border-purple-400/50'}`}
              >
                <span className={`text-lg ${isDiaryGenerating ? 'animate-spin' : ''}`}>{isDiaryGenerating ? '⏳' : '🔮'}</span>
                <span className="text-[10px] text-purple-300">水晶球日記</span>
              </button>

              <button
                onClick={() => {
                  if (isDiaryMergeMode) {
                    setIsDiaryMergeMode(false);
                    setDiaryMergeSelection([]);
                  } else {
                    setIsDiaryMergeMode(true);
                  }
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border transition ${isDiaryMergeMode ? 'bg-amber-900/40 border-amber-500/50' : 'bg-stone-800/40 hover:bg-amber-900/20 border-white/10 hover:border-amber-500/30'}`}
              >
                <span className="text-lg">💫</span>
                <span className={`text-[10px] ${isDiaryMergeMode ? 'text-amber-300' : 'text-stone-400'}`}>融合日記</span>
              </button>
            </div>

            {isDiaryMergeMode && (
              <div className="px-4 pb-3 flex items-center justify-between bg-stone-900/30 border-b border-white/5">
                <span className="text-xs text-stone-400">
                  已選 {diaryMergeSelection.length} 條{diaryMergeSelection.length >= 2 ? '，可融合' : '，請選 2 條以上'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsDiaryMergeMode(false); setDiaryMergeSelection([]); }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-stone-800/60 border border-white/10 text-stone-300 hover:bg-stone-700/60 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleMergeDiary}
                    disabled={diaryMergeSelection.length < 2}
                    className={`text-xs px-3 py-1.5 rounded-xl transition ${diaryMergeSelection.length >= 2 ? 'bg-amber-600/80 hover:bg-amber-500/80 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-stone-800/40 text-stone-600 cursor-not-allowed border border-white/5'}`}
                  >
                    💫 確認融合
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {diaryEntries.map(entry => {
                const isMergedEntry = entry.source === 'merged' && entry.mergedFrom?.length > 0;
                const isExpanded = expandedMergedIds.includes(entry.id);
                const sourceDiaries = isMergedEntry
                  ? diaryEntries.filter(e => entry.mergedFrom.includes(e.id))
                  : [];

                return (
                <React.Fragment key={entry.id}>
                <div className={`bg-stone-900/50 backdrop-blur-sm border rounded-2xl p-3 flex gap-3 transition-colors ${
                  entry.isMerged ? 'opacity-40 border-white/5' :
                  entry.source === 'merged' ? 'border-amber-500/30' :
                  entry.isActive ? 'border-amber-500/50' : 'border-white/5'
                }`}>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleToggleDiary(entry.id)}
                      className={`${entry.isActive ? 'text-amber-400' : 'text-stone-500 hover:text-stone-400'}`}
                      title={entry.isActive ? "AI 將會讀取此記憶" : "AI 不會讀取此記憶"}
                    >
                      {entry.isActive ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                    {isDiaryMergeMode && !entry.isMerged && (
                      <button
                        onClick={() => setDiaryMergeSelection(prev =>
                          prev.includes(entry.id)
                            ? prev.filter(id => id !== entry.id)
                            : [...prev, entry.id]
                        )}
                        className={`${diaryMergeSelection.includes(entry.id) ? 'text-amber-400' : 'text-stone-600 hover:text-stone-400'}`}
                        title="選取以融合"
                      >
                        {diaryMergeSelection.includes(entry.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    {editingDiaryId === entry.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea 
                          value={entry.text}
                          onChange={(e) => handleDiaryChange(entry.id, e.target.value)}
                          onInput={(e) => {
                            e.currentTarget.style.height = 'auto';
                            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                          }}
                          placeholder="寫下你想讓 AI 記住的事件或設定..."
                          className={`w-full bg-stone-900/50 backdrop-blur-sm resize-none outline-none text-sm min-h-[60px] p-3 rounded-xl border border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition ${entry.isActive ? 'text-stone-200' : 'text-stone-500'}`}
                          autoFocus
                          onFocus={(e) => {
                            e.currentTarget.style.height = 'auto';
                            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                          }}
                        />

                        <div className="bg-stone-900/60 rounded-xl p-3 border border-white/5">
                          <div className="text-[10px] text-stone-400 mb-2 uppercase tracking-wider">
                            觸發關鍵字 <span className="text-stone-600 normal-case">（空白 = 勾選後永遠注入）</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {(entry.keywords || []).map((kw: string) => (
                              <span key={kw} className="flex items-center gap-1 bg-indigo-900/50 border border-indigo-500/40 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                                {kw}
                                <button
                                  onClick={() => handleDiaryKeywordRemove(entry.id, kw)}
                                  className="text-indigo-400 hover:text-rose-400 transition leading-none"
                                >×</button>
                              </span>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="輸入關鍵字後按 Enter..."
                            className="w-full bg-stone-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-indigo-500/50 transition"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleDiaryKeywordAdd(entry.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>

                        <div className="flex justify-end">
                          <button 
                            onClick={() => {
                              setEditingDiaryId(null);
                              showToast('已儲存日記');
                            }}
                            className="text-xs bg-indigo-600/80 hover:bg-indigo-500/80 backdrop-blur-sm text-white px-4 py-1.5 rounded-xl transition shadow-[0_0_10px_rgba(79,70,229,0.2)]"
                          >
                            確認
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDoubleClick={() => setEditingDiaryId(entry.id)}
                        className={`w-full text-sm min-h-[60px] whitespace-pre-wrap cursor-text p-3 rounded-xl border border-transparent hover:border-white/5 transition ${entry.isActive ? 'text-stone-200' : 'text-stone-500'}`}
                        title="雙擊以編輯"
                      >
                        {entry.text || <span className="text-stone-600 italic">雙擊以新增內容...</span>}
                        {(entry.keywords || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(entry.keywords || []).map((kw: string) => (
                              <span key={kw} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                scanKeywords([kw])
                                  ? 'bg-indigo-900/60 border-indigo-500/50 text-indigo-300'
                                  : 'bg-stone-800/60 border-stone-600/40 text-stone-500'
                              }`}>
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {entry.isMerged && (
                      <span className="text-[9px] text-stone-500 px-1">已融合</span>
                    )}
                    {isMergedEntry && (
                      <button
                        onClick={() => setExpandedMergedIds(prev =>
                          prev.includes(entry.id)
                            ? prev.filter(id => id !== entry.id)
                            : [...prev, entry.id]
                        )}
                        className="text-amber-400 hover:text-amber-300 transition"
                        title={isExpanded ? "收合來源" : "展開來源"}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteDiary(entry.id)}
                      className="text-stone-500 hover:text-rose-400 transition"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isMergedEntry && isExpanded && sourceDiaries.map(src => (
                  <div key={src.id} className="ml-8 bg-stone-900/30 border border-white/5 rounded-xl p-3 text-xs text-stone-500 whitespace-pre-wrap">
                    {src.text || <span className="italic">（空白）</span>}
                  </div>
                ))}
                </React.Fragment>
                );
              })}
              
              {diaryEntries.length === 0 && (
                <div className="text-center text-stone-500 py-10">
                  目前沒有任何日記。點擊上方按鈕新增。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lorebook Modal Overlay */}
      {isLorebookModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-3xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative h-[85vh]">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
              <div className="flex items-center">
                <h2 className="text-lg font-bold flex items-center"><BookOpen className="w-5 h-5 mr-2 text-indigo-400" /> 世界觀與設定集</h2>
                <span className="ml-4 text-xs text-stone-400">勾選的項目將會被 AI 讀取並作為背景知識</span>
              </div>
              <button 
                className="text-stone-400 hover:text-white transition"
                onClick={() => setIsLorebookModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 border-b border-white/5 bg-stone-900/30 flex gap-3 items-center">
              <button 
                onClick={handleAddLorebook}
                className="bg-stone-800/40 backdrop-blur-sm hover:bg-stone-700/50 border border-white/10 hover:border-white/20 text-stone-200 px-4 py-2 rounded-xl flex items-center transition"
              >
                <Plus className="w-4 h-4 mr-2" /> 新增設定
              </button>
              
              <div className="flex-1 max-w-xs relative ml-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="搜尋設定..."
                  value={lorebookSearch}
                  onChange={(e) => setLorebookSearch(e.target.value)}
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition"
                />
              </div>

              <div className="flex bg-stone-900/50 border border-white/10 rounded-xl overflow-hidden ml-auto">
                {['地點', 'NPC', '怪物', '物品', '歷史', '其他'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setLorebookFilter(cat)}
                    className={`px-4 py-2 text-xs font-medium transition ${lorebookFilter === cat ? 'bg-indigo-600/80 text-white' : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {lorebookEntries
                .filter(entry => entry.category === lorebookFilter)
                .filter(entry => {
                  if (!lorebookSearch.trim()) return true;
                  const searchLower = lorebookSearch.toLowerCase();
                  return (
                    (entry.title && entry.title.toLowerCase().includes(searchLower)) ||
                    (entry.content && entry.content.toLowerCase().includes(searchLower)) ||
                    (entry.job && entry.job.toLowerCase().includes(searchLower)) ||
                    (entry.appearance && entry.appearance.toLowerCase().includes(searchLower)) ||
                    (entry.personality && entry.personality.toLowerCase().includes(searchLower)) ||
                    (entry.other && entry.other.toLowerCase().includes(searchLower))
                  );
                })
                .map(entry => (
                <div key={entry.id} className={`bg-stone-900/50 backdrop-blur-sm border ${entry.isActive ? 'border-indigo-500/50' : 'border-white/5'} rounded-2xl p-4 flex gap-3 transition-colors`}>
                  <button 
                    onClick={() => handleToggleLorebook(entry.id)}
                    className={`mt-1 flex-shrink-0 ${entry.isActive ? 'text-indigo-400' : 'text-stone-500 hover:text-stone-400'}`}
                    title={entry.isActive ? "AI 將會讀取此設定" : "AI 不會讀取此設定"}
                  >
                    {entry.isActive ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                  
                  <div className="flex-1 flex flex-col">
                    {editingLorebookId === entry.id ? (
                      <div className="flex flex-col space-y-3">
                        <div className="flex gap-3">
                          <input 
                            type="text"
                            value={entry.title}
                            onChange={(e) => handleLorebookChange(entry.id, 'title', e.target.value)}
                            className="flex-1 bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-2.5 text-sm text-stone-100 font-bold focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition"
                            placeholder="設定標題..."
                          />
                          <select
                            value={entry.category}
                            onChange={(e) => handleLorebookChange(entry.id, 'category', e.target.value)}
                            className="bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-2.5 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition w-32"
                          >
                            <option value="地點">地點</option>
                            <option value="NPC">NPC</option>
                            <option value="怪物">怪物</option>
                            <option value="物品">物品</option>
                            <option value="歷史">歷史</option>
                            <option value="其他">其他</option>
                          </select>
                        </div>
                        {entry.category === 'NPC' ? (
                          <div className="flex flex-col space-y-2 mt-2">
                            <input
                              type="text"
                              value={entry.job || ''}
                              onChange={(e) => handleLorebookChange(entry.id, 'job', e.target.value)}
                              className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition"
                              placeholder="職業..."
                            />
                            <textarea
                              value={entry.appearance || ''}
                              onChange={(e) => handleLorebookChange(entry.id, 'appearance', e.target.value)}
                              className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                              placeholder="外貌描述..."
                            />
                            <textarea
                              value={entry.personality || ''}
                              onChange={(e) => handleLorebookChange(entry.id, 'personality', e.target.value)}
                              className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                              placeholder="個性描述..."
                            />
                            <textarea
                              value={entry.other || ''}
                              onChange={(e) => handleLorebookChange(entry.id, 'other', e.target.value)}
                              className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                              placeholder="其他..."
                            />
                          </div>
                        ) : (
                          <textarea 
                            value={entry.content}
                            onChange={(e) => handleLorebookChange(entry.id, 'content', e.target.value)}
                            className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none min-h-[100px]"
                            placeholder="寫下詳細設定內容..."
                            autoFocus
                            onFocus={(e) => {
                              e.currentTarget.style.height = 'auto';
                              e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                          />
                        )}
                        {/* ── 觸發關鍵字區塊 ── */}
                        <div className="bg-stone-900/60 rounded-xl p-3 border border-white/5 space-y-3">
                          
                          <div>
                            <div className="text-[10px] text-stone-400 mb-1.5 uppercase tracking-wider">
                              主關鍵字 <span className="text-stone-600 normal-case">（OR，任一命中即觸發；空白 = 依地點/NPC規則）</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {(entry.keywords || []).map((kw: string) => (
                                <span key={kw} className="flex items-center gap-1 bg-indigo-900/50 border border-indigo-500/40 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                                  {kw}
                                  <button onClick={() => handleLorebookKeywordRemove(entry.id, 'keywords', kw)} className="text-indigo-400 hover:text-rose-400 transition leading-none">×</button>
                                </span>
                              ))}
                            </div>
                            <input type="text" placeholder="輸入後按 Enter..."
                              className="w-full bg-stone-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-indigo-500/50 transition"
                              onKeyDown={(e) => { if (e.key === 'Enter') { handleLorebookKeywordAdd(entry.id, 'keywords', e.currentTarget.value); e.currentTarget.value = ''; }}} />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <button
                                onClick={() => setLorebookEntries(prev => prev.map(e => e.id === entry.id ? { ...e, selective: !e.selective } : e))}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition ${entry.selective ? 'bg-amber-900/50 border-amber-500/50 text-amber-300' : 'bg-stone-800/50 border-stone-600/40 text-stone-500'}`}
                              >
                                AND 邏輯 {entry.selective ? '開' : '關'}
                              </button>
                              <span className="text-[10px] text-stone-600">開啟時，主關鍵字 AND 次要關鍵字都要命中</span>
                            </div>
                            {entry.selective && (
                              <>
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                  {(entry.secondaryKeys || []).map((kw: string) => (
                                    <span key={kw} className="flex items-center gap-1 bg-amber-900/50 border border-amber-500/40 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                                      {kw}
                                      <button onClick={() => handleLorebookKeywordRemove(entry.id, 'secondaryKeys', kw)} className="text-amber-400 hover:text-rose-400 transition leading-none">×</button>
                                    </span>
                                  ))}
                                </div>
                                <input type="text" placeholder="次要關鍵字，輸入後按 Enter..."
                                  className="w-full bg-stone-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500/50 transition"
                                  onKeyDown={(e) => { if (e.key === 'Enter') { handleLorebookKeywordAdd(entry.id, 'secondaryKeys', e.currentTarget.value); e.currentTarget.value = ''; }}} />
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider whitespace-nowrap">注入順序</span>
                            <input
                              type="number" min={0} max={999}
                              value={entry.insertionOrder ?? 100}
                              onChange={(e) => setLorebookEntries(prev => prev.map(en => en.id === entry.id ? { ...en, insertionOrder: parseInt(e.target.value) || 0 } : en))}
                              className="w-20 bg-stone-800/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-stone-200 outline-none focus:border-indigo-500/50 transition text-center"
                            />
                            <span className="text-[10px] text-stone-600">數字越小越先注入（0–999）</span>
                          </div>
                        </div>

                        <div className="flex justify-end mt-2">
                          <button 
                            onClick={() => {
                              setEditingLorebookId(null);
                              showToast('已儲存設定');
                            }}
                            className="text-xs bg-indigo-600/80 hover:bg-indigo-500/80 backdrop-blur-sm text-white px-4 py-1.5 rounded-xl transition shadow-[0_0_10px_rgba(79,70,229,0.2)]"
                          >
                            確認
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onDoubleClick={() => setEditingLorebookId(entry.id)}
                        className="cursor-pointer group"
                        title="雙擊以編輯"
                      >
                        <div className="flex items-center mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-md mr-2 ${
                            entry.category === '地點' ? 'bg-emerald-900/40 text-emerald-400' :
                            entry.category === 'NPC' ? 'bg-amber-900/40 text-amber-400' :
                            entry.category === '怪物' ? 'bg-rose-900/40 text-rose-400' :
                            entry.category === '物品' ? 'bg-blue-900/40 text-blue-400' :
                            entry.category === '歷史' ? 'bg-purple-900/40 text-purple-400' :
                            'bg-stone-800 text-stone-300'
                          }`}>
                            {entry.category}
                          </span>
                          <h3 className={`font-bold ${!entry.isActive ? 'text-stone-500' : 'text-stone-200'}`}>{entry.title || '未命名設定'}</h3>
                        </div>
                        {entry.category === 'NPC' ? (
                          <div className={`text-sm leading-relaxed whitespace-pre-wrap p-2 rounded group-hover:bg-white/5 transition space-y-1 ${!entry.isActive ? 'text-stone-500' : 'text-stone-300'}`}>
                            {entry.job && <div><span className="font-medium text-stone-400">職業：</span>{entry.job}</div>}
                            {entry.appearance && <div><span className="font-medium text-stone-400">外貌：</span>{entry.appearance}</div>}
                            {entry.personality && <div><span className="font-medium text-stone-400">個性：</span>{entry.personality}</div>}
                            {entry.other && <div><span className="font-medium text-stone-400">其他：</span>{entry.other}</div>}
                            {!entry.job && !entry.appearance && !entry.personality && !entry.other && <span className="text-stone-600 italic">雙擊以新增內容...</span>}
                          </div>
                        ) : (
                          <div className={`text-sm leading-relaxed whitespace-pre-wrap p-2 rounded group-hover:bg-white/5 transition ${!entry.isActive ? 'text-stone-500' : 'text-stone-300'}`}>
                            {entry.content || <span className="text-stone-600 italic">雙擊以新增內容...</span>}
                          </div>
                        )}
                        {((entry.keywords || []).length > 0 || (entry.secondaryKeys || []).length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1.5 px-2">
                            {(entry.keywords || []).map((kw: string) => (
                              <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-900/40 border border-indigo-500/30 text-indigo-400">{kw}</span>
                            ))}
                            {entry.selective && (entry.secondaryKeys || []).map((kw: string) => (
                              <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/40 border border-amber-500/30 text-amber-400">+{kw}</span>
                            ))}
                            {entry.insertionOrder !== undefined && entry.insertionOrder !== 100 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-800 border border-stone-600/40 text-stone-500">#{entry.insertionOrder}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteLorebook(entry.id)}
                    className="flex-shrink-0 text-stone-500 hover:text-rose-400 transition self-start mt-1"
                    title="刪除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {lorebookEntries.filter(entry => entry.category === lorebookFilter).length === 0 ? (
                <div className="text-center text-stone-500 py-10">
                  目前沒有任何{lorebookFilter}設定。點擊上方按鈕新增。
                </div>
              ) : lorebookEntries
                .filter(entry => entry.category === lorebookFilter)
                .filter(entry => {
                  if (!lorebookSearch.trim()) return true;
                  const searchLower = lorebookSearch.toLowerCase();
                  return (
                    (entry.title && entry.title.toLowerCase().includes(searchLower)) ||
                    (entry.content && entry.content.toLowerCase().includes(searchLower)) ||
                    (entry.job && entry.job.toLowerCase().includes(searchLower)) ||
                    (entry.appearance && entry.appearance.toLowerCase().includes(searchLower)) ||
                    (entry.personality && entry.personality.toLowerCase().includes(searchLower)) ||
                    (entry.other && entry.other.toLowerCase().includes(searchLower))
                  );
                }).length === 0 && (
                <div className="text-center text-stone-500 py-10">
                  找不到符合「{lorebookSearch}」的設定。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NPC Modal Overlay */}
      {selectedNpc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
              <h2 className="text-lg font-bold flex items-center"><Users className="w-5 h-5 mr-2 text-emerald-400" /> 人物 資訊</h2>
              <div className="flex items-center space-x-3">
                <button 
                  className="transition text-stone-500 hover:text-indigo-400"
                  onClick={() => handleRecordNpc(selectedNpc)}
                  title="記下此人 (加入設定集)"
                >
                  <BookPlus className="w-5 h-5" />
                </button>
                <button 
                  className={`transition ${selectedNpc.isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-stone-500 hover:text-stone-300'}`}
                  onClick={() => handleTogglePinNpc(selectedNpc.id)}
                  title={selectedNpc.isPinned ? "取消釘選" : "釘選至個人資訊"}
                >
                  <Pin className={`w-5 h-5 ${selectedNpc.isPinned ? 'fill-current' : ''}`} />
                </button>
                <button 
                  className="text-stone-400 hover:text-white transition"
                  onClick={() => setSelectedNpc(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="flex justify-between items-start border-b border-stone-700 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-stone-100">{selectedNpc.name}</h3>
                  <p className="text-stone-400 text-sm mt-1">{selectedNpc.job}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-stone-500 uppercase tracking-wider mb-1">好感度</span>
                  <div className={`flex items-center font-bold text-lg ${selectedNpc.affection >= 80 ? 'text-emerald-400' : selectedNpc.affection >= 50 ? 'text-stone-400' : 'text-rose-400'}`}>
                    <Heart className="w-4 h-4 mr-1.5 fill-current" /> {selectedNpc.affection}
                  </div>
                  <span className="text-xs text-stone-500 mt-1">({selectedNpc.affectionLabel})</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs text-stone-400 mb-2 uppercase tracking-wider flex items-center"><User className="w-3.5 h-3.5 mr-1.5" /> 外貌特徵</h4>
                <p className="text-sm text-stone-300 leading-relaxed bg-stone-900/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 shadow-inner break-words whitespace-pre-wrap">
                  {selectedNpc.appearance}
                </p>
              </div>

              <div>
                <h4 className="text-xs text-stone-400 mb-2 uppercase tracking-wider flex items-center"><Book className="w-3.5 h-3.5 mr-1.5" /> 個性描述</h4>
                <p className="text-sm text-stone-300 leading-relaxed bg-stone-900/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 shadow-inner break-words whitespace-pre-wrap">
                  {selectedNpc.personality}
                </p>
              </div>

              {selectedNpc.other && (
                <div>
                  <h4 className="text-xs text-stone-400 mb-2 uppercase tracking-wider flex items-center"><Book className="w-3.5 h-3.5 mr-1.5" /> 其他備註</h4>
                  <p className="text-sm text-stone-300 leading-relaxed bg-stone-900/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 shadow-inner break-words whitespace-pre-wrap">
                    {selectedNpc.other}
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-white/5 pt-6">
                {selectedNpc.affection > 60 ? (
                  <div>
                    <h4 className="text-xs text-amber-400 mb-3 uppercase tracking-wider flex items-center">
                      <Book className="w-3.5 h-3.5 mr-1.5" /> 專屬記憶庫 (好感度 &gt; 60 解鎖)
                    </h4>
                    <div className="space-y-2 mb-3">
                      {selectedNpc.memories && selectedNpc.memories.length > 0 ? (
                        selectedNpc.memories.map((mem: string, idx: number) => (
                          <div key={idx} className="bg-stone-900/60 backdrop-blur-sm p-3 rounded-xl border border-white/5 text-sm text-stone-300 flex justify-between items-start group shadow-sm">
                            <span className="flex-1 pr-2 whitespace-pre-wrap break-words min-w-0">{mem}</span>
                            <button 
                              onClick={() => handleRemoveNpcMemory(selectedNpc.id, idx)} 
                              className="text-stone-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-stone-500 italic bg-stone-900/30 backdrop-blur-sm p-4 rounded-xl border border-white/10 border-dashed text-center">
                          目前還沒有特別的回憶...
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <textarea 
                        id="new-npc-memory"
                        placeholder="新增與他的回憶... (Shift+Enter 換行)" 
                        className="flex-1 bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 text-sm text-stone-200 focus:border-amber-500/50 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)] outline-none transition resize-none"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNpcMemory(selectedNpc.id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById('new-npc-memory') as HTMLTextAreaElement;
                          if (input && input.value) {
                            handleAddNpcMemory(selectedNpc.id, input.value);
                            input.value = '';
                          }
                        }}
                        className="bg-stone-800/60 hover:bg-stone-700/60 backdrop-blur-sm border border-white/10 px-4 rounded-xl text-sm transition text-stone-200 flex items-center justify-center"
                      >
                        新增
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-900/40 backdrop-blur-sm border border-white/5 p-6 rounded-2xl text-center flex flex-col items-center justify-center shadow-inner">
                    <Lock className="w-5 h-5 text-stone-600 mb-2" />
                    <p className="text-xs text-stone-500">好感度不足，無法開啟專屬記憶庫 (需 &gt; 60)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Prompt Modal Overlay */}
      {isSystemPromptModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative h-[80vh]">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
              <div className="flex items-center">
                <h2 className="text-lg font-bold flex items-center"><Brain className="w-5 h-5 mr-2 text-fuchsia-400" /> 系統底層邏輯</h2>
                <span className="ml-4 text-xs text-stone-400">定義 AI 的扮演規則、世界觀與文筆風格</span>
              </div>
              <button 
                className="text-stone-400 hover:text-white transition"
                onClick={() => setIsSystemPromptModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-300 flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-blue-400" /> 世界觀前提 (World Premise)
                </label>
                <p className="text-xs text-stone-500 mb-2">定義這個世界的基本法則、時代背景與核心衝突。</p>
                <textarea 
                  value={systemPrompt.worldPremise}
                  onChange={(e) => setSystemPrompt({...systemPrompt, worldPremise: e.target.value})}
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-fuchsia-500/50 focus:shadow-[0_0_15px_rgba(217,70,239,0.2)] outline-none transition resize-none min-h-[100px]"
                  placeholder="例如：這是一個賽博龐克世界，企業控制了一切..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-300 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-rose-400" /> 扮演規則 (Roleplay Rules)
                </label>
                <p className="text-xs text-stone-500 mb-2">限制 AI 的行為，例如不能代替玩家說話、必須根據屬性判定結果等。</p>
                <textarea 
                  value={systemPrompt.roleplayRules}
                  onChange={(e) => setSystemPrompt({...systemPrompt, roleplayRules: e.target.value})}
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-fuchsia-500/50 focus:shadow-[0_0_15px_rgba(217,70,239,0.2)] outline-none transition resize-none min-h-[100px]"
                  placeholder="例如：你是一個無情的地下城主，絕對不要給玩家放水..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-300 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-amber-400" /> 文筆風格 (Writing Style)
                </label>
                <p className="text-xs text-stone-500 mb-2">指定 AI 回覆的語氣、字數限制與描寫重點。</p>
                <textarea 
                  value={systemPrompt.writingStyle}
                  onChange={(e) => setSystemPrompt({...systemPrompt, writingStyle: e.target.value})}
                  className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-fuchsia-500/50 focus:shadow-[0_0_15px_rgba(217,70,239,0.2)] outline-none transition resize-none min-h-[100px]"
                  placeholder="例如：請使用充滿感官細節的文學筆觸，每次回覆不超過 150 字..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-white/5 bg-stone-900/50 flex justify-end">
              <button 
                onClick={() => {
                  setIsSystemPromptModalOpen(false);
                  showToast('已儲存系統底層邏輯');
                }}
                className="bg-fuchsia-600/80 hover:bg-fuchsia-500/80 backdrop-blur-sm text-white px-6 py-2 rounded-xl transition shadow-[0_0_15px_rgba(217,70,239,0.2)]"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Overlay */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-sm rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
              <h2 className="text-lg font-bold flex items-center"><Settings className="w-5 h-5 mr-2 text-stone-400" /> 系統設定</h2>
              <button 
                className="text-stone-400 hover:text-white transition"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">

              {/* API Key 輸入 */}
              <div className="bg-stone-800/40 border border-white/5 rounded-2xl p-4 space-y-2">
                <label className="text-xs text-stone-400 uppercase tracking-wider flex items-center gap-2">
                  <span>🔑</span> Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key', e.target.value);
                    }}
                    placeholder="貼上你的 API Key..."
                    className="w-full bg-stone-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-indigo-500/50 transition pr-16"
                  />
                  {geminiApiKey && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
                      ✓ 已設定
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  儲存在本機瀏覽器，不會上傳。取得方式：<br/>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline transition">aistudio.google.com</a>
                </p>
              </div>

              {/* Token 上限設定 */}
              <div className="bg-stone-800/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <label className="text-xs text-stone-400 uppercase tracking-wider flex items-center gap-2">
                  Token 上限
                </label>
                <div className="flex gap-2">
                  {TOKEN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setMaxTokens(opt.value);
                        localStorage.setItem('gemini_max_tokens', String(opt.value));
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition ${
                        maxTokens === opt.value
                          ? 'bg-indigo-600/80 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                          : 'bg-stone-900/50 border-white/10 text-stone-400 hover:border-indigo-500/40 hover:text-stone-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  較高的上限允許 AI 產生更長的回應，但會消耗更多 API 額度。
                </p>
              </div>

              <div className="border-t border-white/5 pt-2" />

              <button 
                onClick={handleExportSave}
                className="w-full bg-stone-800/40 backdrop-blur-sm border border-white/5 hover:bg-stone-700/50 text-stone-200 py-3 px-4 rounded-2xl flex items-center justify-between transition shadow-sm"
              >
                <span className="flex items-center"><Download className="w-4 h-4 mr-3 text-indigo-400" /> 匯出存檔</span>
                <span className="text-xs text-stone-400">下載 JSON 檔</span>
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-stone-800/40 backdrop-blur-sm border border-white/5 hover:bg-stone-700/50 text-stone-200 py-3 px-4 rounded-2xl flex items-center justify-between transition shadow-sm"
              >
                <span className="flex items-center"><Upload className="w-4 h-4 mr-3 text-emerald-400" /> 匯入存檔</span>
                <span className="text-xs text-stone-400">讀取 JSON 檔</span>
              </button>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImportSave}
              />

              <div className="pt-4 border-t border-white/5 mt-4">
                <button 
                  onClick={handleResetGame}
                  className="w-full bg-rose-900/20 backdrop-blur-sm hover:bg-rose-900/40 border border-rose-800/30 text-rose-300 py-3 px-4 rounded-2xl flex items-center justify-between transition shadow-sm"
                >
                  <span className="flex items-center"><RotateCcw className="w-4 h-4 mr-3" /> 重置遊戲</span>
                  <span className="text-xs text-rose-400/70">清除所有進度</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-900/80 backdrop-blur-xl w-full max-w-6xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 h-[85vh]"
            >
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
                <h2 className="text-lg font-bold flex items-center"><MapIcon className="w-5 h-5 mr-2 text-indigo-400" /> 世界地圖與探索紀錄</h2>
                <button 
                  className="text-stone-400 hover:text-white transition"
                  onClick={() => setIsMapOpen(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Visual Map Area */}
                <div className="flex-[2] border-b md:border-b-0 md:border-r border-stone-700 relative bg-stone-950 overflow-hidden group">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-[600px] h-[600px] border border-stone-800/50 rounded-full bg-stone-900/30">
                      {worldMap.fixed.map(loc => {
                        const left = `${((loc.x + 150) / 300) * 100}%`;
                        const top = `${((-loc.y + 150) / 300) * 100}%`;
                        
                        return (
                          <div 
                            key={loc.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/pin cursor-pointer"
                            style={{ left, top }}
                            onClick={() => {
                              if (!mapOrigin) setMapOrigin(loc.id);
                              else if (!mapDestination && loc.id !== mapOrigin) setMapDestination(loc.id);
                              else { setMapOrigin(loc.id); setMapDestination(null); }
                            }}
                          >
                            <div className={`w-3 h-3 rounded-full border-2 ${mapOrigin === loc.id ? 'bg-emerald-400 border-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : mapDestination === loc.id ? 'bg-indigo-400 border-indigo-200 shadow-[0_0_10px_rgba(129,140,248,0.8)]' : 'bg-stone-500 border-stone-300'} transition-all duration-300 group-hover/pin:scale-150`}></div>
                            <span className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-900/80 backdrop-blur-sm border border-stone-700 whitespace-nowrap ${mapOrigin === loc.id ? 'text-emerald-400 border-emerald-500/50' : mapDestination === loc.id ? 'text-indigo-400 border-indigo-500/50' : 'text-stone-300'}`}>
                              {loc.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 bg-stone-900/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-xs space-y-2 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                    <div className="font-bold text-stone-300 mb-1">地圖圖例</div>
                    <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></div> 起點</div>
                    <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></div> 終點</div>
                    <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-stone-500 mr-2"></div> 未選擇</div>
                    <div className="text-stone-500 mt-2 pt-2 border-t border-stone-700">點擊地標設定起終點</div>
                  </div>
                </div>

                {/* Right Column: Lists & Calculator */}
                <div className="flex-[1] flex flex-col bg-stone-900 overflow-hidden">
                  
                  <div className="p-4 border-b border-stone-700 bg-stone-800/50">
                    <h3 className="text-sm font-bold text-stone-300 mb-3 flex items-center">
                      <Navigation className="w-4 h-4 mr-2 text-indigo-400" /> 旅行時間計算
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between bg-stone-900/50 backdrop-blur-sm p-3 rounded-xl border border-white/5 shadow-inner">
                        <span className="text-stone-500 text-xs">起點</span>
                        <span className="font-bold text-emerald-400">{mapOrigin ? worldMap.fixed.find(l => l.id === mapOrigin)?.name : '請在地圖上點擊'}</span>
                      </div>
                      <div className="flex items-center justify-between bg-stone-900/50 backdrop-blur-sm p-3 rounded-xl border border-white/5 shadow-inner">
                        <span className="text-stone-500 text-xs">終點</span>
                        <span className="font-bold text-indigo-400">{mapDestination ? worldMap.fixed.find(l => l.id === mapDestination)?.name : '請在地圖上點擊'}</span>
                      </div>
                      
                      {calculateTravelTime() && (
                        <div className="mt-3 space-y-2 animate-in fade-in zoom-in duration-300">
                          <div className="p-3 bg-indigo-900/20 backdrop-blur-sm border border-indigo-500/30 rounded-2xl flex flex-col items-center justify-center">
                            <span className="text-xs text-indigo-300 mb-1">預估步行時間 (距離 {calculateTravelTime()?.distance})</span>
                            <span className="text-lg font-bold text-indigo-100">{calculateTravelTime()?.walkTimeStr}</span>
                          </div>
                          <div className="p-3 bg-amber-900/20 backdrop-blur-sm border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center">
                            <span className="text-xs text-amber-300 mb-1">預估馬車時間 (3倍速)</span>
                            <span className="text-lg font-bold text-amber-100">{calculateTravelTime()?.carriageTimeStr}</span>
                          </div>
                        </div>
                      )}
                      
                      {(mapOrigin || mapDestination) && (
                        <button 
                          onClick={() => { setMapOrigin(null); setMapDestination(null); }}
                          className="w-full mt-2 py-2 text-xs bg-stone-800/60 backdrop-blur-sm border border-white/5 hover:bg-stone-700/60 rounded-xl transition text-stone-300 shadow-sm"
                        >
                          重置計算
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-stone-400 border-b border-stone-700 pb-2 flex items-center uppercase tracking-wider">
                        <Globe className="w-3.5 h-3.5 mr-1.5" /> 已知世界地標
                      </h3>
                      <div className="space-y-2">
                        {worldMap.fixed.map(loc => (
                          <div 
                            key={loc.id} 
                            className={`bg-stone-800/40 backdrop-blur-sm border p-2.5 rounded-2xl transition cursor-pointer ${mapOrigin === loc.id ? 'border-emerald-500/50 bg-emerald-900/20' : mapDestination === loc.id ? 'border-indigo-500/50 bg-indigo-900/20' : 'border-white/5 hover:border-white/20'}`}
                            onClick={() => {
                              if (!mapOrigin) setMapOrigin(loc.id);
                              else if (!mapDestination && loc.id !== mapOrigin) setMapDestination(loc.id);
                              else { setMapOrigin(loc.id); setMapDestination(null); }
                            }}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`font-bold text-sm ${mapOrigin === loc.id ? 'text-emerald-400' : mapDestination === loc.id ? 'text-indigo-400' : 'text-stone-300'}`}>
                                {loc.name}
                              </span>
                              <span className="text-[9px] bg-stone-900/60 backdrop-blur-sm border border-white/5 px-1.5 py-0.5 rounded-md text-stone-400">{loc.x}, {loc.y}</span>
                            </div>
                            <p className="text-[11px] text-stone-500 leading-relaxed">{loc.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-stone-400 border-b border-stone-700 pb-2 flex items-center uppercase tracking-wider">
                        <MapPin className="w-3.5 h-3.5 mr-1.5" /> 旅途發現 (動態)
                      </h3>
                      <div className="space-y-2">
                        {worldMap.dynamic.map(loc => (
                          <div key={loc.id} className="bg-stone-800/40 backdrop-blur-sm border border-white/5 p-2.5 rounded-2xl relative overflow-hidden">
                            {loc.isPinned && (
                              <div className="absolute top-0 right-0 w-6 h-6 bg-amber-600/20 flex items-start justify-end p-1 rounded-bl-2xl">
                                <MapPin className="w-2.5 h-2.5 text-amber-400" />
                              </div>
                            )}
                            <div className="flex flex-col mb-1">
                              <span className="font-bold text-sm text-amber-400">{loc.name}</span>
                              <span className="text-[9px] text-stone-500">位於: {loc.location}</span>
                            </div>
                            <p className="text-[11px] text-stone-400 mt-1">{loc.desc}</p>
                            <div className="mt-2 flex space-x-2">
                              <button 
                                className={`text-[10px] px-2 py-1 rounded-lg transition ${loc.isPinned ? 'bg-stone-700/60 backdrop-blur-sm text-stone-300 hover:bg-stone-600/60' : 'border border-white/10 text-stone-400 hover:text-stone-200 hover:border-white/20'}`}
                                onClick={() => {
                                  setWorldMap(prev => ({
                                    ...prev,
                                    dynamic: prev.dynamic.map(d => d.id === loc.id ? { ...d, isPinned: !d.isPinned } : d)
                                  }));
                                }}
                              >
                                {loc.isPinned ? '取消保留' : '標記保留'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
