import React, { useState } from 'react';
import { BookOpen, Plus, Search, CheckSquare, Square, Trash2 } from 'lucide-react';

export interface LorebookEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  job?: string;
  appearance?: string;
  personality?: string;
  other?: string;
  keywords?: string[];
  secondaryKeys?: string[];
  selective?: boolean;
  insertionOrder?: number;
  homeLocation?: string;
  roamLocations?: string[];
}

interface LorebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  lorebookEntries: LorebookEntry[];
  onAddLorebook: (category: string) => number;
  onUpdateLorebook: (id: number, updates: Partial<LorebookEntry>) => void;
  onDeleteLorebook: (id: number) => void;
  onLorebookKeywordAdd: (id: number, field: 'keywords' | 'secondaryKeys', keyword: string) => void;
  onLorebookKeywordRemove: (id: number, field: 'keywords' | 'secondaryKeys', keyword: string) => void;
  showToast: (msg: string) => void;
}

export const LorebookModal: React.FC<LorebookModalProps> = ({
  isOpen,
  onClose,
  lorebookEntries,
  onAddLorebook,
  onUpdateLorebook,
  onDeleteLorebook,
  onLorebookKeywordAdd,
  onLorebookKeywordRemove,
  showToast,
}) => {
  const [editingLorebookId, setEditingLorebookId] = useState<number | null>(null);
  const [lorebookFilter, setLorebookFilter] = useState<string>('地點');
  const [lorebookSearch, setLorebookSearch] = useState<string>('');

  if (!isOpen) return null;

  const handleAdd = () => {
    const newId = onAddLorebook(lorebookFilter);
    setEditingLorebookId(newId);
  };

  const handleDelete = (id: number) => {
    onDeleteLorebook(id);
    if (editingLorebookId === id) setEditingLorebookId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-3xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative h-[85vh]">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
          <div className="flex items-center">
            <h2 className="text-lg font-bold flex items-center"><BookOpen className="w-5 h-5 mr-2 text-indigo-400" /> 世界觀與設定集</h2>
            <span className="ml-4 text-xs text-stone-400">勾選的項目將會被 AI 讀取並作為背景知識</span>
          </div>
          <button 
            className="text-stone-400 hover:text-white transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 border-b border-white/5 bg-stone-900/30 flex gap-3 items-center">
          <button 
            onClick={handleAdd}
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
                onClick={() => onUpdateLorebook(entry.id, { isActive: !entry.isActive })}
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
                        onChange={(e) => onUpdateLorebook(entry.id, { title: e.target.value })}
                        className="flex-1 bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-2.5 text-sm text-stone-100 font-bold focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition"
                        placeholder="設定標題..."
                      />
                      <select
                        value={entry.category}
                        onChange={(e) => onUpdateLorebook(entry.id, { category: e.target.value })}
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
                          onChange={(e) => onUpdateLorebook(entry.id, { job: e.target.value })}
                          className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition"
                          placeholder="職業..."
                        />
                        <textarea
                          value={entry.appearance || ''}
                          onChange={(e) => onUpdateLorebook(entry.id, { appearance: e.target.value })}
                          className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                          placeholder="外貌描述..."
                        />
                        <textarea
                          value={entry.personality || ''}
                          onChange={(e) => onUpdateLorebook(entry.id, { personality: e.target.value })}
                          className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                          placeholder="個性描述..."
                        />
                        <textarea
                          value={entry.other || ''}
                          onChange={(e) => onUpdateLorebook(entry.id, { other: e.target.value })}
                          className="w-full bg-stone-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-sm text-stone-100 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition resize-none h-20"
                          placeholder="其他..."
                        />
                      </div>
                    ) : (
                      <textarea 
                        value={entry.content}
                        onChange={(e) => onUpdateLorebook(entry.id, { content: e.target.value })}
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
                              <button onClick={() => onLorebookKeywordRemove(entry.id, 'keywords', kw)} className="text-indigo-400 hover:text-rose-400 transition leading-none">×</button>
                            </span>
                          ))}
                        </div>
                        <input type="text" placeholder="輸入後按 Enter..."
                          className="w-full bg-stone-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-indigo-500/50 transition"
                          onKeyDown={(e) => { if (e.key === 'Enter') { onLorebookKeywordAdd(entry.id, 'keywords', e.currentTarget.value); e.currentTarget.value = ''; }}} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <button
                            onClick={() => onUpdateLorebook(entry.id, { selective: !entry.selective })}
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
                                  <button onClick={() => onLorebookKeywordRemove(entry.id, 'secondaryKeys', kw)} className="text-amber-400 hover:text-rose-400 transition leading-none">×</button>
                                </span>
                              ))}
                            </div>
                            <input type="text" placeholder="次要關鍵字，輸入後按 Enter..."
                              className="w-full bg-stone-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500/50 transition"
                              onKeyDown={(e) => { if (e.key === 'Enter') { onLorebookKeywordAdd(entry.id, 'secondaryKeys', e.currentTarget.value); e.currentTarget.value = ''; }}} />
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider whitespace-nowrap">注入順序</span>
                        <input
                          type="number" min={0} max={999}
                          value={entry.insertionOrder ?? 100}
                          onChange={(e) => onUpdateLorebook(entry.id, { insertionOrder: parseInt(e.target.value) || 0 })}
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
                onClick={() => handleDelete(entry.id)}
                className="mt-1 text-stone-500 hover:text-rose-400 transition flex-shrink-0"
                title="刪除"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {lorebookEntries.filter(entry => entry.category === lorebookFilter).length === 0 && (
            <div className="text-center text-stone-500 py-10">此分類尚無設定</div>
          )}
        </div>
      </div>
    </div>
  );
};
