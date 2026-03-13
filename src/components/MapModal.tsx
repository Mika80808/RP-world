import React from 'react';
import { Map as MapIcon, Navigation, Globe, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Location {
  id: string;
  name: string;
  desc: string;
  x: number;
  y: number;
}

export interface DynamicLocation {
  id: string;
  name: string;
  desc: string;
  location: string;
  isPinned: boolean;
}

export interface WorldMap {
  fixed: Location[];
  dynamic: DynamicLocation[];
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldMap: WorldMap;
  setWorldMap: React.Dispatch<React.SetStateAction<WorldMap>>;
  mapOrigin: string | null;
  setMapOrigin: (id: string | null) => void;
  mapDestination: string | null;
  setMapDestination: (id: string | null) => void;
  calculateTravelTime: () => { distance: number; walkTimeStr: string; carriageTimeStr: string; } | null;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  worldMap,
  setWorldMap,
  mapOrigin,
  setMapOrigin,
  mapDestination,
  setMapDestination,
  calculateTravelTime,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
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
                onClick={onClose}
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
  );
};
