import React from 'react';
import { User, Save } from 'lucide-react';

import { Profile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  setProfile: (profile: Profile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  setProfile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900/70 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden text-stone-200 border border-white/10 relative">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
          <h2 className="text-lg font-bold flex items-center"><User className="w-5 h-5 mr-2 text-indigo-400" /> 個人資訊</h2>
          <button 
            className="text-stone-400 hover:text-white transition"
            onClick={onClose}
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
            onClick={onClose}
          >
            <Save className="w-4 h-4 mr-2" /> 儲存設定
          </button>
        </div>
      </div>
    </div>
  );
};
