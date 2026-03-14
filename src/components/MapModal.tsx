import React, { useState, useRef, useCallback } from 'react';
import { Map as MapIcon, X, Scroll } from 'lucide-react';
import { LorebookEntry, Profile, MemoryEntry } from '../types';

const SVG_W = 680;
const SVG_H = 540;
const MAP_SCALE = 2.0;

function toSvg(x: number, y: number, panX: number, panY: number) {
  return {
    cx: SVG_W / 2 + x * MAP_SCALE + panX,
    cy: SVG_H / 2 - y * MAP_SCALE + panY,
  };
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lorebookEntries: LorebookEntry[];
  currentLocation: string;
  profile: Profile;
  memories: MemoryEntry[];
  onTravel: (destName: string, byCarriage: boolean) => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen, onClose, lorebookEntries, currentLocation, profile, memories, onTravel,
}) => {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const [goldWarning, setGoldWarning] = useState(false);
  const isDragging = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  if (!isOpen) return null;

  // Map nodes: lorebook entries with category='地點' and mapX defined
  const mapNodes = lorebookEntries.filter(e => e.category === '地點' && e.mapX != null);
  // Undiscovered list: lorebook entries '地點' without mapX (added by LOCATION_DISCOVER)
  const undiscoveredList = lorebookEntries.filter(e => e.category === '地點' && e.mapX == null);

  const currentNode = mapNodes.find(e => e.title === currentLocation);
  const selectedNode = selectedTitle ? mapNodes.find(e => e.title === selectedTitle) : null;
  const isAtSelected = selectedTitle === currentLocation;

  const selectedMemories = selectedNode
    ? memories.filter(m =>
        m.type === 'region' &&
        (m.tags?.locations ?? []).includes(selectedNode.title)
      )
    : [];

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-node]')) return;
    isDragging.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    setPanX(p => Math.max(-300, Math.min(300, p + e.clientX - lastPan.current.x)));
    setPanY(p => Math.max(-300, Math.min(300, p + e.clientY - lastPan.current.y)));
    lastPan.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(() => { isDragging.current = false; }, []);

  const handleNodeClick = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoldWarning(false);
    setSelectedTitle(prev => prev === title ? null : title);
  };

  const handleTravel = (byCarriage: boolean) => {
    if (!selectedTitle || !selectedNode) return;
    if (byCarriage) {
      const fare = selectedNode.cartFare ?? 0;
      if (profile.gold < fare) { setGoldWarning(true); return; }
    }
    onTravel(selectedTitle, byCarriage);
    setSelectedTitle(null);
  };

  // Cubic bezier from currentLocation to selected (if different)
  const bezierPath = (() => {
    if (!currentNode || !selectedNode || isAtSelected) return null;
    const p1 = toSvg(currentNode.mapX!, currentNode.mapY!, panX, panY);
    const p2 = toSvg(selectedNode.mapX!, selectedNode.mapY!, panX, panY);
    const cx1 = p1.cx + (p2.cx - p1.cx) * 0.5;
    const cy1 = p1.cy - 60;
    const cx2 = p2.cx - (p2.cx - p1.cx) * 0.2;
    const cy2 = p2.cy - 60;
    return `M ${p1.cx} ${p1.cy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.cx} ${p2.cy}`;
  })();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900/95 backdrop-blur-xl w-full max-w-5xl rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-stone-200 border border-white/10 h-[86vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-amber-400" />
            世界地圖
          </h2>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300 inline-block" /> 你在這裡
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-stone-500 border border-stone-400 inline-block" /> 已知
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-stone-700 border border-dashed border-stone-500 inline-block" /> 未踏足
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* SVG Map Canvas */}
          <div className="flex-[3] relative bg-stone-950 overflow-hidden select-none">
            <svg
              width="100%" height="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <defs>
                <pattern id="mg" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#292524" strokeWidth="0.5" />
                </pattern>
                <radialGradient id="vig" cx="50%" cy="50%" r="70%">
                  <stop offset="50%" stopColor="transparent" />
                  <stop offset="100%" stopColor="#0c0a09" stopOpacity="0.85" />
                </radialGradient>
                <filter id="glow-green" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-amber" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Background */}
              <rect width={SVG_W} height={SVG_H} fill="#0c0a09" />
              <rect width={SVG_W} height={SVG_H} fill="url(#mg)" opacity={0.6} />

              {/* Bezier path (when selection != currentLocation) */}
              {bezierPath && (
                <path d={bezierPath} fill="none" stroke="#f59e0b" strokeWidth="2"
                  strokeDasharray="10 5" opacity={0.65} />
              )}

              {/* Map nodes */}
              {mapNodes.map(loc => {
                const { cx, cy } = toSvg(loc.mapX!, loc.mapY!, panX, panY);
                const isCurrent = loc.title === currentLocation;
                const isSelected = loc.title === selectedTitle;
                const isKnown = loc.mapStatus === 'known' || isCurrent;
                const isHovered = hoveredTitle === loc.title;
                const r = isCurrent ? 13 : isKnown ? 10 : 9;

                const fillColor = isCurrent ? '#10b981' : isSelected ? '#f59e0b' : isKnown ? '#78716c' : '#292524';
                const strokeColor = isCurrent ? '#6ee7b7' : isSelected ? '#fcd34d' : isKnown ? '#a8a29e' : '#57534e';
                const filterAttr = isCurrent ? 'url(#glow-green)' : isSelected ? 'url(#glow-amber)' : undefined;

                return (
                  <g key={loc.id} data-node="true"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => handleNodeClick(loc.title, e)}
                    onMouseEnter={() => setHoveredTitle(loc.title)}
                    onMouseLeave={() => setHoveredTitle(null)}
                  >
                    {/* Selection ring */}
                    {(isCurrent || isSelected) && (
                      <circle cx={cx} cy={cy} r={r + 7}
                        fill="none"
                        stroke={isCurrent ? '#10b981' : '#f59e0b'}
                        strokeWidth="1.5" opacity={0.5}
                      />
                    )}
                    {/* Hover ring */}
                    {isHovered && !isCurrent && !isSelected && (
                      <circle cx={cx} cy={cy} r={r + 5}
                        fill="none" stroke="#a8a29e" strokeWidth="1" opacity={0.4}
                      />
                    )}
                    {/* Main circle node */}
                    <circle cx={cx} cy={cy} r={r}
                      fill={fillColor} stroke={strokeColor} strokeWidth={1.5}
                      strokeDasharray={!isKnown ? '3 2' : undefined}
                      opacity={!isKnown ? 0.55 : 1}
                      filter={filterAttr}
                    />
                    {/* Question mark for undiscovered */}
                    {!isKnown && (
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10"
                        fill="#78716c" style={{ pointerEvents: 'none' }}>?</text>
                    )}
                    {/* Label */}
                    <text
                      x={cx} y={cy + r + 14}
                      textAnchor="middle" fontSize="11"
                      fontWeight={isCurrent || isSelected ? '700' : '400'}
                      fill={isCurrent ? '#6ee7b7' : isSelected ? '#fcd34d' : isKnown ? '#d6d3d1' : '#57534e'}
                      style={{ pointerEvents: 'none', textShadow: '0 1px 3px #000' }}
                    >
                      {isKnown ? loc.title : '???'}
                    </text>
                    {/* Hover tooltip */}
                    {isHovered && isKnown && (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={cx - 80} y={cy - r - 62} width={160} height={50}
                          rx={7} fill="#1c1917" stroke="#44403c" strokeWidth="1" opacity={0.95} />
                        <text x={cx} y={cy - r - 46} textAnchor="middle"
                          fontSize="11" fontWeight="700" fill="#e7e5e4">{loc.title}</text>
                        <foreignObject x={cx - 73} y={cy - r - 40} width={146} height={30}>
                          <div xmlns="http://www.w3.org/1999/xhtml"
                            style={{ fontSize: 9, color: '#a8a29e', lineHeight: 1.4, overflow: 'hidden',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {loc.content}
                          </div>
                        </foreignObject>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Vignette */}
              <rect width={SVG_W} height={SVG_H} fill="url(#vig)" style={{ pointerEvents: 'none' }} />
            </svg>

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
          <div className="w-64 flex flex-col bg-stone-900/60 border-l border-white/5 overflow-hidden">
            {selectedNode ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Location title */}
                <div>
                  <h3 className="font-bold text-stone-100 text-base leading-snug">{selectedNode.title}</h3>
                  {isAtSelected && (
                    <span className="inline-block mt-1 text-[10px] text-emerald-400 border border-emerald-700/40 bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                      📍 你在這裡
                    </span>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs text-stone-400 leading-relaxed">{selectedNode.content}</p>

                {/* Region memories */}
                {selectedMemories.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Scroll className="w-3 h-3" /> 區域記憶
                    </h4>
                    <div className="space-y-1.5">
                      {selectedMemories.map(m => (
                        <div key={m.id} className="text-[11px] text-stone-400 bg-stone-800/40 rounded-lg px-2.5 py-1.5 border border-white/5">
                          {m.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Travel buttons (only when not at selected location) */}
                {!isAtSelected && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">前往方式</h4>

                    {/* Carriage (only if cartFare > 0) */}
                    {(selectedNode.cartFare ?? 0) > 0 && (
                      <div>
                        <button
                          onClick={() => handleTravel(true)}
                          className="w-full py-2 text-sm bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/40 text-amber-300 rounded-xl transition font-medium"
                        >
                          🐴 坐馬車（{selectedNode.cartFare} 銅）
                        </button>
                        {goldWarning && (
                          <p className="text-[11px] text-red-400 text-center mt-1">阮囊羞澀</p>
                        )}
                      </div>
                    )}

                    {/* Walk */}
                    <button
                      onClick={() => handleTravel(false)}
                      className="w-full py-2 text-sm bg-stone-800/60 hover:bg-stone-700/60 border border-white/10 text-stone-300 rounded-xl transition font-medium"
                    >
                      🚶 徒步前往
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <MapIcon className="w-10 h-10 text-stone-700 mb-3" />
                <p className="text-xs text-stone-500 leading-relaxed">點選地圖上的節點<br />查看地點資訊與旅行選項</p>
              </div>
            )}

            {/* Undiscovered locations list (no mapX) */}
            {undiscoveredList.length > 0 && (
              <div className="border-t border-white/5 p-3 space-y-1.5 max-h-40 overflow-y-auto shrink-0">
                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">旅途發現</h4>
                {undiscoveredList.map(loc => (
                  <div key={loc.id} className="text-[11px] bg-stone-800/40 rounded-lg px-2.5 py-1.5 border border-white/5">
                    <span className="text-amber-400 font-medium">{loc.title}</span>
                    <span className="text-stone-600 ml-1.5">{loc.mapStatus === 'known' ? '✓' : '?'}</span>
                    <p className="text-stone-500 text-[10px] mt-0.5">{loc.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
