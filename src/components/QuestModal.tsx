import React from 'react';
import { Book, X, CheckCircle, XCircle, Clock, Coins } from 'lucide-react';

export interface Quest {
  id: string;
  title: string;
  giver: string;
  description: string;
  reward: {
    gold?: number;
    items?: string[];
  };
  deadline?: number;           // 遊戲天數，undefined = 無期限
  status: 'active' | 'completed' | 'failed';
  createdAt: string;           // 顯示用 M/D
  createdAtTotalDays: number;  // 計算期限用
  completedAt?: string;        // 完成日期 M/D
}

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
  currentTotalDays: number;
}

export const QuestModal: React.FC<QuestModalProps> = ({ isOpen, onClose, quests, currentTotalDays }) => {
  if (!isOpen) return null;

  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuests = quests.filter(q => q.status === 'completed');
  const failedQuests = quests.filter(q => q.status === 'failed');

  const getRemaining = (q: Quest): string | null => {
    if (q.deadline == null) return null;
    const elapsed = currentTotalDays - q.createdAtTotalDays;
    const left = q.deadline - elapsed;
    return left > 0 ? `${left} 天` : '0 天';
  };

  const renderReward = (q: Quest) => {
    const parts: string[] = [];
    if (q.reward?.gold) parts.push(`${q.reward.gold} 銅`);
    if (q.reward?.items?.length) parts.push(...q.reward.items);
    return parts.length > 0 ? parts.join('、') : '無';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900/95 backdrop-blur-xl w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col overflow-hidden text-stone-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-stone-100">任務日誌</h2>
          </div>

          {/* Status counts */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              <span className="text-emerald-400 font-medium">{activeQuests.length}</span>
              <span className="text-stone-400">進行中</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-stone-500 inline-block"></span>
              <span className="text-stone-300 font-medium">{completedQuests.length}</span>
              <span className="text-stone-500">已完成</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              <span className="text-red-400 font-medium">{failedQuests.length}</span>
              <span className="text-stone-500">失敗</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quest list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Active quests */}
          {activeQuests.map(q => {
            const remaining = getRemaining(q);
            return (
              <div key={q.id} className="border border-emerald-500/30 bg-emerald-950/20 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-stone-100 leading-snug">{q.title}</h3>
                  <span className="flex-shrink-0 flex items-center gap-1 text-xs text-emerald-300 bg-emerald-900/40 border border-emerald-700/30 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    {remaining !== null ? `剩 ${remaining}` : '無期限'}
                  </span>
                </div>
                <p className="text-xs text-amber-300/80 mb-2">委託：{q.giver || '—'}</p>
                <p className="text-sm text-stone-300 leading-relaxed">{q.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <Coins className="w-3 h-3 text-amber-400" />
                    {renderReward(q)}
                  </span>
                  <span className="text-xs text-stone-500">接受：{q.createdAt}</span>
                </div>
              </div>
            );
          })}

          {/* Completed quests */}
          {completedQuests.map(q => (
            <div key={q.id} className="border border-stone-600/20 bg-stone-800/20 rounded-xl p-4 opacity-65">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-stone-500 line-through leading-snug">{q.title}</h3>
                <span className="flex-shrink-0 flex items-center gap-1 text-xs text-emerald-500 bg-emerald-900/20 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  完成 {q.completedAt || ''}
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-2">委託：{q.giver || '—'}</p>
              <p className="text-sm text-stone-500 leading-relaxed line-through">{q.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="flex items-center gap-1 text-xs text-stone-600">
                  <Coins className="w-3 h-3" />
                  {renderReward(q)}
                </span>
                <span className="text-xs text-stone-600">接受：{q.createdAt}</span>
              </div>
            </div>
          ))}

          {/* Failed quests */}
          {failedQuests.map(q => (
            <div key={q.id} className="border border-red-900/30 bg-red-950/10 rounded-xl p-4 opacity-55">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-stone-500 line-through leading-snug">{q.title}</h3>
                <span className="flex-shrink-0 flex items-center gap-1 text-xs text-red-400 bg-red-900/20 border border-red-800/30 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" />
                  期限超過
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-2">委託：{q.giver || '—'}</p>
              <p className="text-sm text-stone-500 leading-relaxed line-through">{q.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="flex items-center gap-1 text-xs text-stone-600">
                  <Coins className="w-3 h-3" />
                  {renderReward(q)}
                </span>
                <span className="text-xs text-stone-600">接受：{q.createdAt}</span>
              </div>
            </div>
          ))}

          {quests.length === 0 && (
            <div className="text-center text-stone-500 py-16">
              <Book className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>尚無任何任務記錄</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
