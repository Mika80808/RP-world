import React, { useState } from 'react';
import { Book, CheckSquare, Square, Trash2, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';

export interface DiaryEntry {
  id: number;
  text: string;
  isActive: boolean;
  keywords?: string[];
  source?: 'user' | 'ai_generated' | 'merged';
  mergedFrom?: number[];
  isMerged?: boolean;
}

interface DiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  diaryEntries: DiaryEntry[];
  onAddDiary: () => number;
  onGenerateDiary: () => Promise<void>;
  onMergeDiary: (selectedIds: number[]) => Promise<void>;
  onToggleDiary: (id: number) => void;
  onDiaryChange: (id: number, text: string) => void;
  onDiaryKeywordAdd: (id: number, keyword: string) => void;
  onDiaryKeywordRemove: (id: number, keyword: string) => void;
  onDeleteDiary: (id: number) => void;
  scanKeywords: (keywords: string[]) => boolean;
}

export const DiaryModal: React.FC<DiaryModalProps> = ({
  isOpen,
  onClose,
  diaryEntries,
  onAddDiary,
  onGenerateDiary,
  onMergeDiary,
  onToggleDiary,
  onDiaryChange,
  onDiaryKeywordAdd,
  onDiaryKeywordRemove,
  onDeleteDiary,
  scanKeywords,
}) => {
  const [editingDiaryId, setEditingDiaryId] = useState<number | null>(null);
  const [isDiaryMergeMode, setIsDiaryMergeMode] = useState(false);
  const [diaryMergeSelection, setDiaryMergeSelection] = useState<number[]>([]);
  const [isDiaryGenerating, setIsDiaryGenerating] = useState(false);
  const [expandedMergedIds, setExpandedMergedIds] = useState<number[]>([]);

  if (!isOpen) return null;

  const handleAddClick = () => {
    const newId = onAddDiary();
    setEditingDiaryId(newId);
  };

  const handleGenerateClick = async () => {
    setIsDiaryGenerating(true);
    await onGenerateDiary();
    setIsDiaryGenerating(false);
  };

  const handleMergeClick = async () => {
    if (diaryMergeSelection.length < 2) return;
    setIsDiaryGenerating(true); // Using same loading state for simplicity
    await onMergeDiary(diaryMergeSelection);
    setDiaryMergeSelection([]);
    setIsDiaryMergeMode(false);
    setIsDiaryGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative h-[80vh]">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
          <div className="flex items-center">
            <h2 className="text-lg font-bold flex items-center"><Book className="w-5 h-5 mr-2 text-amber-400" /> 日記與記憶</h2>
            <span className="ml-4 text-xs text-stone-400">勾選的項目將會被 AI 讀取並帶入遊戲記憶中</span>
          </div>
          <button 
            className="text-stone-400 hover:text-white transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 border-b border-white/5 bg-stone-900/30 flex gap-2">
          <button
            onClick={handleAddClick}
            className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl bg-stone-800/40 hover:bg-stone-700/50 border border-white/10 hover:border-white/20 transition"
          >
            <span className="text-lg">📝</span>
            <span className="text-[10px] text-stone-400">新增日記</span>
          </button>

          <button
            onClick={handleGenerateClick}
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
                onClick={handleMergeClick}
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
            const isMergedEntry = entry.source === 'merged' && entry.mergedFrom && entry.mergedFrom.length > 0;
            const isExpanded = expandedMergedIds.includes(entry.id);
            const sourceDiaries = isMergedEntry
              ? diaryEntries.filter(e => entry.mergedFrom?.includes(e.id))
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
                  onClick={() => onToggleDiary(entry.id)}
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
                      onChange={(e) => onDiaryChange(entry.id, e.target.value)}
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
                              onClick={() => onDiaryKeywordRemove(entry.id, kw)}
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
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            onDiaryKeywordAdd(entry.id, e.currentTarget.value.trim());
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          setEditingDiaryId(null);
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
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {entry.source === 'ai_generated' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
                        🔮 AI 生成
                      </span>
                    )}
                    {entry.source === 'merged' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-500/20">
                        💫 融合記憶
                      </span>
                    )}
                    {entry.isMerged && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-500 border border-white/5">
                        已融合
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {isMergedEntry && (
                      <button 
                        onClick={() => setExpandedMergedIds(prev => 
                          prev.includes(entry.id) ? prev.filter(id => id !== entry.id) : [...prev, entry.id]
                        )}
                        className="text-stone-500 hover:text-amber-400 transition flex items-center text-[10px]"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                        {isExpanded ? '收起來源' : '檢視來源'}
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingDiaryId(editingDiaryId === entry.id ? null : entry.id)}
                      className="text-stone-500 hover:text-indigo-400 transition"
                      title="編輯"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteDiary(entry.id)}
                      className="text-stone-500 hover:text-rose-400 transition"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {isMergedEntry && isExpanded && sourceDiaries.length > 0 && (
              <div className="ml-8 pl-4 border-l-2 border-amber-900/30 space-y-2">
                {sourceDiaries.map(sourceEntry => (
                  <div key={`source-${sourceEntry.id}`} className="bg-stone-900/30 rounded-xl p-3 border border-white/5 opacity-60">
                    <div className="text-xs whitespace-pre-wrap text-stone-400">
                      {sourceEntry.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </React.Fragment>
            );
          })}
          {diaryEntries.length === 0 && (
            <div className="text-center text-stone-500 py-10 italic">
              目前沒有任何日記。<br/>點擊上方按鈕新增，或使用水晶球自動生成。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
