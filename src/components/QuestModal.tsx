import React from 'react';

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'active' | 'completed';
  createdAt: string;
}

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
}

export const QuestModal: React.FC<QuestModalProps> = ({ isOpen, onClose, quests }) => {
  if (!isOpen) return null;

  const availableQuests = quests.filter(q => q.status === 'available');
  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuests = quests.filter(q => q.status === 'completed');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#f4ebd8]/95 backdrop-blur-md w-full max-w-4xl h-[80vh] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col overflow-hidden text-stone-800 relative">
        
        <button 
          className="absolute top-4 right-4 text-stone-500 hover:text-stone-800 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 hover:bg-stone-300 transition"
          onClick={onClose}
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
              {activeQuests.length > 0 ? (
                activeQuests.map(q => (
                  <div key={q.id} className="bg-white/50 p-4 rounded-xl shadow-sm border border-stone-300">
                    <h3 className="font-bold text-lg text-stone-800 mb-2">{q.title}</h3>
                    <p className="text-stone-600 text-sm">{q.description}</p>
                    <div className="text-xs text-stone-400 mt-2 text-right">{q.createdAt}</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-stone-500 py-10">
                  目前沒有進行中的任務。
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-8 relative bg-gradient-to-r from-stone-900/5 to-transparent overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-stone-800 border-b-2 border-stone-800/20 pb-2">任務清單</h2>
            
            <div className="space-y-4">
              <h4 className="font-bold text-stone-500 uppercase tracking-widest text-sm mb-2">可接取</h4>
              <ul className="space-y-2">
                {availableQuests.length > 0 ? (
                  availableQuests.map(q => (
                    <li key={q.id} className="bg-white/40 p-3 rounded-lg border border-stone-200">
                      <div className="font-bold text-stone-700">{q.title}</div>
                      <div className="text-xs text-stone-500 mt-1">{q.description}</div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-stone-500 italic p-3">目前沒有可接取的任務</li>
                )}
              </ul>

              <h4 className="font-bold text-stone-500 uppercase tracking-widest text-sm mb-2 mt-8">已完成</h4>
              <ul className="space-y-2 opacity-60">
                {completedQuests.length > 0 ? (
                  completedQuests.map(q => (
                    <li key={q.id} className="bg-stone-200/50 p-3 rounded-lg border border-stone-300">
                      <div className="font-bold text-stone-600 line-through">{q.title}</div>
                      <div className="text-xs text-stone-500 mt-1">{q.description}</div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-stone-500 italic p-3">目前沒有已完成的任務</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
