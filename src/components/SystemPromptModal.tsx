import React from 'react';
import { Brain, Globe, Shield, Sparkles } from 'lucide-react';

import { SystemPrompt } from '../types';

interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: SystemPrompt;
  setSystemPrompt: (prompt: SystemPrompt) => void;
  showToast: (msg: string) => void;
}

export const SystemPromptModal: React.FC<SystemPromptModalProps> = ({
  isOpen,
  onClose,
  systemPrompt,
  setSystemPrompt,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative h-[80vh]">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
          <div className="flex items-center">
            <h2 className="text-lg font-bold flex items-center"><Brain className="w-5 h-5 mr-2 text-fuchsia-400" /> 系統底層邏輯</h2>
            <span className="ml-4 text-xs text-stone-400">定義 AI 的扮演規則、世界觀與文筆風格</span>
          </div>
          <button 
            className="text-stone-400 hover:text-white transition"
            onClick={onClose}
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
              onClose();
              showToast('已儲存系統底層邏輯');
            }}
            className="bg-fuchsia-600/80 hover:bg-fuchsia-500/80 backdrop-blur-sm text-white px-6 py-2 rounded-xl transition shadow-[0_0_15px_rgba(217,70,239,0.2)]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
