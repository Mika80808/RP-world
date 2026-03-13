import React, { useState, useRef, useCallback } from 'react';
import { Map as MapIcon, Navigation, Globe, MapPin, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Location {
  id: string;
  name: string;
  desc: string;
  x: number;
  y: number;
  type?: 'town' | 'danger' | 'city' | 'poi';
  discovered?: boolean;
}

export interface DynamicLocation {
  id: string;
  name: string;
  desc: string;
  location: string;
  isPinned: boolean;
  discovered?: boolean;
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

// SVG coordinate system: map data uses x/y in -150..150, SVG canvas is 700x600
const SVG_W = 700;
const SVG_H = 600;
const MAP_RANGE = 320; // how many data units fit across SVG_W

function toSvg(x: number, y: number, panX: number, panY: number) {
  return {
    cx: SVG_W / 2 + (x / MAP_RANGE) * SVG_W + panX,
    cy: SVG_H / 2 - (y / MAP_RANGE) * SVG_W + panY,
  };
}

const TYPE_STYLES: Record<string, { fill: string; stroke: string; label: string; shape: 'circle' | 'hex' | 'diamond' | 'square' }> = {
  town:    { fill: '#ca8a04', stroke: '#fcd34d', label: '城鎮', shape: 'circle' },
  danger:  { fill: '#dc2626', stroke: '#fca5a5', label: '危險', shape: 'hex' },
  city:    { fill: '#7c3aed', stroke: '#c4b5fd', label: '城市', shape: 'square' },
  poi:     { fill: '#0891b2', stroke: '#67e8f9', label: '興趣點', shape: 'diamond' },
  unknown: { fill: '#44403c', stroke: '#78716c', label: '未知', shape: 'circle' },
};

function NodeShape({ cx, cy, type, r = 10, isOrigin, isDest, discovered = true }: {
  cx: number; cy: number; type: string; r?: number;
  isOrigin: boolean; isDest: boolean; discovered?: boolean;
}) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.unknown;
  const fill = isOrigin ? '#10b981' : isDest ? '#6366f1' : discovered ? style.fill : '#292524';
  const stroke = isOrigin ? '#6ee7b7' : isDest ? '#a5b4fc' : discovered ? style.stroke : '#57534e';
  const glowId = isOrigin ? 'glow-green' : isDest ? 'glow-indigo' : discovered ? `glow-${type}` : '';
  const filter = (isOrigin || isDest) ? `url(#${glowId})` : undefined;

  if (!discovered) {
    return (
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.5}
        strokeDasharray="3 2" opacity={0.5} />
    );
  }

  if (style.shape === 'hex') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.5} filter={filter} />;
  }
  if (style.shape === 'diamond') {
    const pts = `${cx},${cy - r * 1.2} ${cx + r},${cy} ${cx},${cy + r * 1.2} ${cx - r},${cy}`;
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.5} filter={filter} />;
  }
  if (style.shape === 'square') {
    return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={3}
      fill={fill} stroke={stroke} strokeWidth={1.5} filter={filter} />;
  }
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} filter={filter} />;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen, onClose, worldMap, setWorldMap,
  mapOrigin, setMapOrigin, mapDestination, setMapDestination, calculateTravelTime,
}) => {
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isDragging = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-pin]')) return;
    isDragging.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPan.current.x;
    const dy = e.clientY - lastPan.current.y;
    lastPan.current = { x: e.clientX, y: e.clientY };
    setPanX(p => Math.max(-200, Math.min(200, p + dx)));
    setPanY(p => Math.max(-200, Math.min(200, p + dy)));
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlePinClick = (locId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mapOrigin) setMapOrigin(locId);
    else if (!mapDestination && locId !== mapOrigin) setMapDestination(locId);
    else { setMapOrigin(locId); setMapDestination(null); }
  };

  const travelResult = calculateTravelTime();

  const filteredFixed = searchQuery
    ? worldMap.fixed.filter(l => l.name.includes(searchQuery) || l.desc.includes(searchQuery))
    : worldMap.fixed;

  // Edge connections (draw simple lines between nearby towns for atmosphere)
  const connections: [Location, Location][] = [];
  const fixedLocs = worldMap.fixed;
  for (let i = 0; i < fixedLocs.length; i++) {
    for (let j = i + 1; j < fixedLocs.length; j++) {
      const a = fixedLocs[i], b = fixedLocs[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 80) connections.push([a, b]);
    }
  }

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
            className="bg-stone-900/90 backdrop-blur-xl w-full max-w-6xl rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-stone-200 border border-white/10 h-[88vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-900/60 shrink-0">
              <h2 className="text-lg font-bold flex items-center">
                <MapIcon className="w-5 h-5 mr-2 text-indigo-400" /> 世界地圖
              </h2>
              <button className="text-stone-400 hover:text-white transition" onClick={onClose}>✕</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">

              {/* SVG Map */}
              <div className="flex-[3] relative bg-stone-950 overflow-hidden select-none" style={{ minHeight: 320 }}>
                <svg
                  ref={svgRef}
                  width="100%" height="100%"
                  viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <defs>
                    {/* Grid pattern */}
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#292524" strokeWidth="0.5" />
                    </pattern>
                    {/* Subtle radial vignette */}
                    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
                      <stop offset="60%" stopColor="transparent" />
                      <stop offset="100%" stopColor="#0c0a09" stopOpacity="0.8" />
                    </radialGradient>
                    {/* Glows */}
                    <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glow-indigo" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="fog" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" />
                    </filter>
                    {/* Parchment texture overlay */}
                    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1c1917" />
                      <stop offset="100%" stopColor="#0c0a09" />
                    </linearGradient>
                  </defs>

                  {/* Background */}
                  <rect width={SVG_W} height={SVG_H} fill="url(#bg-grad)" />
                  <rect width={SVG_W} height={SVG_H} fill="url(#grid)" opacity={0.6} />

                  {/* Decorative terrain lines (rivers / mountain ranges) */}
                  <g opacity={0.18} stroke="#78716c" strokeWidth="1.5" fill="none" strokeLinecap="round">
                    {/* River from center-right to bottom */}
                    <path d={`M ${SVG_W/2 + panX + 60} ${SVG_H/2 + panY - 20} Q ${SVG_W/2 + panX + 90} ${SVG_H/2 + panY + 40} ${SVG_W/2 + panX + 70} ${SVG_H/2 + panY + 120}`} strokeDasharray="6 3" />
                    {/* Mountain ridge top-right */}
                    <path d={`M ${SVG_W/2 + panX + 160} ${SVG_H/2 + panY - 100} L ${SVG_W/2 + panX + 190} ${SVG_H/2 + panY - 80} L ${SVG_W/2 + panX + 175} ${SVG_H/2 + panY - 110} L ${SVG_W/2 + panX + 205} ${SVG_H/2 + panY - 90}`} />
                    {/* Coastline left */}
                    <path d={`M ${SVG_W/2 + panX - 180} ${SVG_H/2 + panY - 40} Q ${SVG_W/2 + panX - 170} ${SVG_H/2 + panY + 10} ${SVG_W/2 + panX - 185} ${SVG_H/2 + panY + 60}`} strokeDasharray="4 2" />
                  </g>

                  {/* Connection lines between nearby locations */}
                  <g opacity={0.2}>
                    {connections.map(([a, b], i) => {
                      const pa = toSvg(a.x, a.y, panX, panY);
                      const pb = toSvg(b.x, b.y, panX, panY);
                      return (
                        <line key={i}
                          x1={pa.cx} y1={pa.cy} x2={pb.cx} y2={pb.cy}
                          stroke="#a8a29e" strokeWidth="1" strokeDasharray="4 3"
                        />
                      );
                    })}
                  </g>

                  {/* Travel path highlight */}
                  {mapOrigin && mapDestination && (() => {
                    const o = worldMap.fixed.find(l => l.id === mapOrigin);
                    const d = worldMap.fixed.find(l => l.id === mapDestination);
                    if (!o || !d) return null;
                    const po = toSvg(o.x, o.y, panX, panY);
                    const pd = toSvg(d.x, d.y, panX, panY);
                    return (
                      <line
                        x1={po.cx} y1={po.cy} x2={pd.cx} y2={pd.cy}
                        stroke="#6366f1" strokeWidth="2" strokeDasharray="8 4" opacity={0.7}
                      />
                    );
                  })()}

                  {/* Fixed location nodes */}
                  {worldMap.fixed.map(loc => {
                    const { cx, cy } = toSvg(loc.x, loc.y, panX, panY);
                    const isOrigin = mapOrigin === loc.id;
                    const isDest = mapDestination === loc.id;
                    const isHovered = hoveredId === loc.id;
                    const discovered = loc.discovered !== false;
                    const r = loc.type === 'city' ? 13 : loc.type === 'town' ? 11 : 9;

                    return (
                      <g key={loc.id} data-pin="true"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => handlePinClick(loc.id, e)}
                        onMouseEnter={() => setHoveredId(loc.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {/* Selection ring */}
                        {(isOrigin || isDest) && (
                          <circle cx={cx} cy={cy} r={r + 6}
                            fill="none"
                            stroke={isOrigin ? '#10b981' : '#6366f1'}
                            strokeWidth="1.5" opacity={0.6}
                          />
                        )}
                        {/* Hover ring */}
                        {isHovered && !isOrigin && !isDest && (
                          <circle cx={cx} cy={cy} r={r + 5}
                            fill="none" stroke="#a8a29e" strokeWidth="1" opacity={0.5}
                          />
                        )}

                        <NodeShape cx={cx} cy={cy} type={loc.type || 'poi'} r={r}
                          isOrigin={isOrigin} isDest={isDest} discovered={discovered} />

                        {/* Label */}
                        <text
                          x={cx} y={cy + r + 14}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={isOrigin || isDest ? '700' : '500'}
                          fill={isOrigin ? '#6ee7b7' : isDest ? '#a5b4fc' : discovered ? '#d6d3d1' : '#78716c'}
                          style={{ pointerEvents: 'none', textShadow: '0 1px 3px #000' }}
                        >
                          {discovered ? loc.name : '???'}
                        </text>

                        {/* Hover tooltip */}
                        {isHovered && discovered && (
                          <g style={{ pointerEvents: 'none' }}>
                            <rect
                              x={cx - 80} y={cy - r - 68}
                              width={160} height={60}
                              rx={8} fill="#1c1917" stroke="#44403c" strokeWidth="1"
                              opacity={0.95}
                            />
                            <text x={cx} y={cy - r - 50} textAnchor="middle" fontSize="12" fontWeight="700" fill="#e7e5e4">
                              {loc.name}
                            </text>
                            <foreignObject x={cx - 72} y={cy - r - 44} width={144} height={36}>
                              <div xmlns="http://www.w3.org/1999/xhtml"
                                style={{ fontSize: 9, color: '#a8a29e', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {loc.desc}
                              </div>
                            </foreignObject>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Dynamic (discovered) locations */}
                  {worldMap.dynamic.filter(d => d.isPinned || d.discovered).map(loc => {
                    // Dynamic locs don't have x/y; show as floating label in bottom area
                    return null; // handled in sidebar
                  })}

                  {/* Vignette overlay */}
                  <rect width={SVG_W} height={SVG_H} fill="url(#vignette)" style={{ pointerEvents: 'none' }} />
                </svg>

                {/* Legend */}
                <div className="absolute bottom-3 left-3 bg-stone-900/85 backdrop-blur-md border border-white/10 p-2.5 rounded-xl text-[10px] space-y-1.5 shadow-lg">
                  <div className="font-bold text-stone-300 mb-1 text-xs">圖例</div>
                  {Object.entries(TYPE_STYLES).filter(([k]) => k !== 'unknown').map(([key, s]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        {key === 'danger' ? (
                          <polygon points="6,1 11,10 1,10" fill={s.fill} stroke={s.stroke} strokeWidth="1" />
                        ) : key === 'poi' ? (
                          <polygon points="6,0 12,6 6,12 0,6" fill={s.fill} stroke={s.stroke} strokeWidth="1" />
                        ) : key === 'city' ? (
                          <rect x="1" y="1" width="10" height="10" rx="2" fill={s.fill} stroke={s.stroke} strokeWidth="1" />
                        ) : (
                          <circle cx="6" cy="6" r="5" fill={s.fill} stroke={s.stroke} strokeWidth="1" />
                        )}
                      </svg>
                      <span className="text-stone-400">{s.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-stone-700">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300" />
                    <span className="text-stone-400">起點</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 border border-indigo-300" />
                    <span className="text-stone-400">終點</span>
                  </div>
                  <div className="text-stone-600 pt-1 border-t border-stone-700">拖曳可移動地圖</div>
                </div>

                {/* Reset pan button */}
                {(panX !== 0 || panY !== 0) && (
                  <button
                    className="absolute top-3 right-3 bg-stone-800/80 border border-white/10 text-stone-400 hover:text-white px-2 py-1 rounded-lg text-xs transition"
                    onClick={() => { setPanX(0); setPanY(0); }}
                  >
                    重置視角
                  </button>
                )}
              </div>

              {/* Right Panel */}
              <div className="flex-[1] flex flex-col bg-stone-900/60 overflow-hidden min-w-[240px]">

                {/* Travel Calculator */}
                <div className="p-4 border-b border-stone-700/50 shrink-0">
                  <h3 className="text-sm font-bold text-stone-300 mb-3 flex items-center">
                    <Navigation className="w-4 h-4 mr-2 text-indigo-400" /> 旅行計算
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between bg-stone-900/60 p-2.5 rounded-xl border border-white/5">
                      <span className="text-stone-500 text-xs">起點</span>
                      <span className="font-bold text-emerald-400 text-xs">
                        {mapOrigin ? worldMap.fixed.find(l => l.id === mapOrigin)?.name : '點擊地圖選擇'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-stone-900/60 p-2.5 rounded-xl border border-white/5">
                      <span className="text-stone-500 text-xs">終點</span>
                      <span className="font-bold text-indigo-400 text-xs">
                        {mapDestination ? worldMap.fixed.find(l => l.id === mapDestination)?.name : '點擊地圖選擇'}
                      </span>
                    </div>

                    {travelResult && (
                      <div className="space-y-1.5 animate-in fade-in zoom-in duration-300">
                        <div className="p-2.5 bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-center">
                          <div className="text-[10px] text-indigo-300 mb-0.5">步行（距離 {travelResult.distance}）</div>
                          <div className="text-base font-bold text-indigo-100">{travelResult.walkTimeStr}</div>
                        </div>
                        <div className="p-2.5 bg-amber-900/20 border border-amber-500/30 rounded-xl text-center">
                          <div className="text-[10px] text-amber-300 mb-0.5">馬車（3倍速）</div>
                          <div className="text-base font-bold text-amber-100">{travelResult.carriageTimeStr}</div>
                        </div>
                      </div>
                    )}

                    {(mapOrigin || mapDestination) && (
                      <button
                        onClick={() => { setMapOrigin(null); setMapDestination(null); }}
                        className="w-full py-1.5 text-xs bg-stone-800/60 border border-white/5 hover:bg-stone-700/60 rounded-xl transition text-stone-400"
                      >
                        重置
                      </button>
                    )}
                  </div>
                </div>

                {/* Location List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="搜尋地點..."
                      className="w-full bg-stone-800/50 border border-white/5 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-300 outline-none focus:border-indigo-500/40 transition"
                    />
                  </div>

                  {/* Fixed Locations */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3 h-3" /> 已知地標
                    </h3>
                    {filteredFixed.map(loc => {
                      const style = TYPE_STYLES[loc.type || 'poi'];
                      return (
                        <div
                          key={loc.id}
                          className={`p-2.5 rounded-xl border cursor-pointer transition ${
                            mapOrigin === loc.id ? 'border-emerald-500/50 bg-emerald-900/20'
                            : mapDestination === loc.id ? 'border-indigo-500/50 bg-indigo-900/20'
                            : 'border-white/5 bg-stone-800/30 hover:border-white/15'
                          }`}
                          onClick={() => handlePinClick(loc.id, { stopPropagation: () => {} } as React.MouseEvent)}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md border font-medium"
                              style={{ color: style.stroke, borderColor: style.fill + '60', background: style.fill + '20' }}>
                              {style.label}
                            </span>
                            <span className={`font-bold text-xs ${mapOrigin === loc.id ? 'text-emerald-400' : mapDestination === loc.id ? 'text-indigo-400' : 'text-stone-300'}`}>
                              {loc.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500 leading-relaxed line-clamp-2">{loc.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Locations */}
                  {worldMap.dynamic.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> 旅途發現
                      </h3>
                      {worldMap.dynamic.map(loc => (
                        <div key={loc.id} className="bg-stone-800/30 border border-white/5 p-2.5 rounded-xl relative">
                          {loc.discovered === false && (
                            <span className="absolute top-2 right-2 text-[9px] text-amber-400 border border-amber-500/40 bg-amber-900/20 px-1.5 py-0.5 rounded-md">待探索</span>
                          )}
                          <div className="font-bold text-xs text-amber-400 mb-0.5">{loc.name}</div>
                          <div className="text-[9px] text-stone-500 mb-1">位於：{loc.location}</div>
                          <p className="text-[10px] text-stone-400 leading-relaxed">{loc.desc}</p>
                          <button
                            className={`mt-2 text-[10px] px-2 py-0.5 rounded-lg border transition ${
                              loc.isPinned
                                ? 'bg-stone-700/60 border-stone-600 text-stone-300'
                                : 'border-white/10 text-stone-400 hover:border-white/25'
                            }`}
                            onClick={() => setWorldMap(prev => ({
                              ...prev,
                              dynamic: prev.dynamic.map(d => d.id === loc.id ? { ...d, isPinned: !d.isPinned } : d)
                            }))}
                          >
                            {loc.isPinned ? '取消保留' : '標記保留'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
