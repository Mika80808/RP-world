import React, { useState, useRef, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { LorebookEntry, Profile, MemoryEntry } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const SVG_W = 680;
const SVG_H = 520;
const MAP_SCALE = 2.2;
const CLUSTER_THRESHOLD = 20; // 地圖單位，小於此距離的地點合併為一群

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toSvg(x: number, y: number, panX: number, panY: number) {
  return {
    cx: SVG_W / 2 + x * MAP_SCALE + panX,
    cy: SVG_H / 2 - y * MAP_SCALE + panY,
  };
}

function starPoints(cx: number, cy: number, r1: number, r2: number, n = 8): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const angle = (Math.PI / n) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Cluster {
  primary: LorebookEntry;
  members: LorebookEntry[];
}

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lorebookEntries: LorebookEntry[];
  currentLocation: string;
  profile: Profile;
  memories: MemoryEntry[];
  onTravel: (destName: string, byCarriage: boolean) => void;
  showToast: (msg: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const MapModal: React.FC<MapModalProps> = ({
  isOpen, onClose, lorebookEntries, currentLocation, profile, memories, onTravel, showToast,
}) => {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'walk' | 'carriage' | null>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [goldWarning, setGoldWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resetHint, setResetHint] = useState(false);
  const isDragging = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  // ── Drag（必須在 early return 前，否則違反 Rules of Hooks）──────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-node]')) return;
    isDragging.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    setPanX(p => Math.max(-350, Math.min(350, p + e.clientX - lastPan.current.x)));
    setPanY(p => Math.max(-350, Math.min(350, p + e.clientY - lastPan.current.y)));
    lastPan.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(() => { isDragging.current = false; }, []);

  if (!isOpen) return null;

  // ── Data ────────────────────────────────────────────────────────────────────
  const mapNodes = lorebookEntries.filter(e => e.category === '地點' && e.mapX != null && e.mapY != null);
  const undiscoveredList = lorebookEntries.filter(e => e.category === '地點' && e.mapX == null);

  // 座標分群：距離 < CLUSTER_THRESHOLD 的節點合為一群
  const clusters: Cluster[] = [];
  const assignedIds = new Set<number>();
  for (const node of mapNodes) {
    if (assignedIds.has(node.id)) continue;
    const members: LorebookEntry[] = [node];
    assignedIds.add(node.id);
    for (const other of mapNodes) {
      if (assignedIds.has(other.id)) continue;
      const dist = Math.sqrt((other.mapX! - node.mapX!) ** 2 + (other.mapY! - node.mapY!) ** 2);
      if (dist < CLUSTER_THRESHOLD) {
        members.push(other);
        assignedIds.add(other.id);
      }
    }
    clusters.push({ primary: node, members });
  }

  // 找出 selectedTitle 屬於哪個群
  const selectedCluster = selectedTitle
    ? clusters.find(c => c.members.some(m => m.title === selectedTitle)) ?? null
    : null;

  const selectedNode = selectedTitle
    ? mapNodes.find(e => e.title === selectedTitle) ?? null
    : null;

  const isAtSelected = selectedTitle === currentLocation;

  // currentLocation 屬於哪個群（bezier 起點用）
  const currentCluster = clusters.find(c => c.members.some(m => m.title === currentLocation));
  const currentNode = currentCluster?.primary ?? null;
  const selectedPrimary = selectedCluster?.primary ?? null;

  const selectedMemories = selectedNode
    ? memories.filter(m =>
        m.type === 'region' &&
        (m.tags?.locations ?? []).includes(selectedNode.title)
      )
    : [];

  const filteredNodes = searchQuery.trim()
    ? mapNodes.filter(e => e.title.includes(searchQuery) || (e.content || '').includes(searchQuery))
    : mapNodes;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleClusterClick = (cluster: Cluster, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoldWarning(false);
    setTravelMode(null);
    if (cluster.members.length === 1) {
      setSelectedTitle(prev => prev === cluster.primary.title ? null : cluster.primary.title);
    } else {
      // 多成員群：若已選取該群則取消，否則選取群的 primary
      const alreadySelected = selectedCluster === cluster;
      setSelectedTitle(alreadySelected ? null : cluster.primary.title);
    }
  };

  const handleSubLabelClick = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoldWarning(false);
    setTravelMode(null);
    setSelectedTitle(prev => prev === title ? null : title);
  };

  const handleDepart = () => {
    if (!selectedTitle || !selectedNode || !travelMode) return;
    if (travelMode === 'carriage') {
      const fare = selectedNode.cartFare ?? 0;
      if (profile.gold < fare) { setGoldWarning(true); return; }
    }
    onTravel(selectedTitle, travelMode === 'carriage');
    setSelectedTitle(null);
    setTravelMode(null);
  };

  const handleCompassClick = () => {
    setPanX(0);
    setPanY(0);
    setResetHint(true);
    showToast('🧭 視角已重置');
    setTimeout(() => setResetHint(false), 1500);
  };

  // ── Bezier ───────────────────────────────────────────────────────────────────
  const bezierPath = (() => {
    if (!currentNode || !selectedPrimary || currentCluster === selectedCluster) return null;
    const p1 = toSvg(currentNode.mapX!, currentNode.mapY!, panX, panY);
    const p2 = toSvg(selectedPrimary.mapX!, selectedPrimary.mapY!, panX, panY);
    const cx1 = p1.cx + (p2.cx - p1.cx) * 0.5;
    const cy1 = p1.cy - 55;
    const cx2 = p2.cx - (p2.cx - p1.cx) * 0.2;
    const cy2 = p2.cy - 55;
    return `M ${p1.cx} ${p1.cy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.cx} ${p2.cy}`;
  })();

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-5xl rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden h-[87vh]"
        style={{ background: '#0d1f3c', border: '0.5px solid #2a4a7f', borderTop: '1.5px solid #c9a84c' }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: '0.5px solid #2a4a7f' }}>
          <h2 className="text-base font-bold tracking-widest shrink-0" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            ✦ 世界地圖
          </h2>
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4a7ac9' }} />
            <input
              type="text"
              placeholder="搜尋地點..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-none outline-none bg-transparent"
              style={{ borderBottom: '1px solid #2a4a7f', color: '#8ab4e8', fontFamily: 'Georgia, serif' }}
            />
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition"
            style={{ background: '#0a1628', border: '0.5px solid #2a4a7f', color: '#4a7ac9' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4a7ac9')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* ── SVG Map ─────────────────────────────────────────────────── */}
          <div className="flex-[3] relative overflow-hidden select-none" style={{ background: '#0a1628' }}>
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
                <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="rgba(100,140,200,0.025)" />
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,140,200,0.07)" strokeWidth="0.5" />
                </pattern>
                <radialGradient id="map-vig" cx="50%" cy="50%" r="70%">
                  <stop offset="45%" stopColor="transparent" />
                  <stop offset="100%" stopColor="rgba(5,12,28,0.75)" />
                </radialGradient>
                {/* 金色暈光 filter */}
                <filter id="glow-gold" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* 深紅暈光 filter */}
                <filter id="glow-red" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* 藍色暈光 filter（hover） */}
                <filter id="glow-blue" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <rect width={SVG_W} height={SVG_H} fill="#0a1628" />
              <rect width={SVG_W} height={SVG_H} fill="url(#map-grid)" />

              {/* 四角 L 型金色裝飾線 */}
              {[
                `M 8 28 L 8 8 L 28 8`,
                `M ${SVG_W - 8} 28 L ${SVG_W - 8} 8 L ${SVG_W - 28} 8`,
                `M 8 ${SVG_H - 28} L 8 ${SVG_H - 8} L 28 ${SVG_H - 8}`,
                `M ${SVG_W - 8} ${SVG_H - 28} L ${SVG_W - 8} ${SVG_H - 8} L ${SVG_W - 28} ${SVG_H - 8}`,
              ].map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity={0.7} />
              ))}

              {/* Bezier 曲線 */}
              {bezierPath && (
                <path d={bezierPath} fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeDasharray="5 3" opacity={0.75} />
              )}

              {/* 節點（只渲染各群的 primary） */}
              {clusters.map(cluster => {
                const loc = cluster.primary;
                const { cx, cy } = toSvg(loc.mapX!, loc.mapY!, panX, panY);

                // 判斷此群是否有任一成員是 currentLocation 或 selectedTitle
                const isCurrent = cluster.members.some(m => m.title === currentLocation);
                const isSelected = cluster === selectedCluster;
                const isKnown = cluster.members.some(m => m.mapStatus === 'known') || isCurrent;
                const isMulti = cluster.members.length > 1;

                return (
                  <g
                    key={loc.id}
                    data-node="true"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => handleClusterClick(cluster, e)}
                  >
                    {/* ── Discovered: 虛線圓圈 ── */}
                    {!isKnown && (
                      <>
                        {isSelected && (
                          <circle cx={cx} cy={cy} r={18} fill="rgba(204,68,34,0.12)"
                            stroke="#cc4422" strokeWidth="0" filter="url(#glow-red)" />
                        )}
                        <circle
                          cx={cx} cy={cy} r={8}
                          fill={isSelected ? 'rgba(204,68,34,0.18)' : '#0a1628'}
                          stroke={isSelected ? '#cc4422' : '#5a8fc9'}
                          strokeWidth={isSelected ? '1.5' : '1.2'}
                          strokeDasharray="3 2"
                          opacity={isSelected ? 0.85 : 0.38}
                        />
                        <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize="9"
                          fill={isSelected ? '#ff8866' : '#5a8fc9'}
                          opacity={isSelected ? 0.9 : 0.5}
                          style={{ pointerEvents: 'none' }}>?</text>
                        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="10"
                          fill={isSelected ? '#ff8866' : '#2a4a7f'}
                          style={{ pointerEvents: 'none', fontFamily: 'Georgia, serif' }}>???</text>
                      </>
                    )}

                    {/* ── Known: 八角星芒 ── */}
                    {isKnown && (() => {
                      const r1 = isCurrent ? 14 : isSelected ? 13 : 10;
                      const r2 = isCurrent ? 6 : isSelected ? 5 : 4;
                      const starColor = isCurrent ? '#c9a84c' : isSelected ? '#cc4422' : '#4a7ac9';
                      const centerColor = isCurrent ? '#fde68a' : isSelected ? '#ff8866' : '#8ab4e8';

                      return (
                        <>
                          {/* 選取/當前位置：圓型發光（取代外框線） */}
                          {(isCurrent || isSelected) && (
                            <circle
                              cx={cx} cy={cy}
                              r={r1 + 10}
                              fill={isCurrent ? 'rgba(201,168,76,0.18)' : 'rgba(204,68,34,0.18)'}
                              filter={isCurrent ? 'url(#glow-gold)' : 'url(#glow-red)'}
                            />
                          )}
                          {/* 星芒主體 */}
                          <polygon
                            points={starPoints(cx, cy, r1, r2)}
                            fill={starColor}
                            opacity={0.92}
                          />
                          {/* 中心亮點 */}
                          <circle cx={cx} cy={cy} r={r2 * 0.6} fill={centerColor} opacity={0.85} />
                          {/* 地名標籤 */}
                          <text
                            x={cx} y={cy + r1 + 14}
                            textAnchor="middle"
                            fontSize={isCurrent || isSelected ? '12' : '11'}
                            fontWeight={isCurrent || isSelected ? '700' : '500'}
                            fill={isCurrent ? '#fde68a' : isSelected ? '#ff8866' : '#8ab4e8'}
                            style={{ pointerEvents: 'none', fontFamily: 'Georgia, serif', textShadow: '0 1px 4px #000' }}
                          >
                            {isKnown ? loc.title : '???'}
                            {isMulti && isKnown && ' ◆'}
                          </text>
                        </>
                      );
                    })()}

                    {/* ── 多成員群選取後：浮現子地名標籤 ── */}
                    {isMulti && isKnown && isSelected && (() => {
                      const r1 = isCurrent ? 14 : 13;
                      return cluster.members.map((member, mi) => {
                        const isActiveSub = selectedTitle === member.title;
                        const offsetX = mi % 2 === 0 ? -50 : 50;
                        const offsetY = -r1 - 30 - Math.floor(mi / 2) * 24;
                        return (
                          <g
                            key={member.id}
                            data-node="true"
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => handleSubLabelClick(member.title, e)}
                          >
                            <rect
                              x={cx + offsetX - 38} y={cy + offsetY - 11}
                              width={76} height={20} rx={4}
                              fill={isActiveSub ? '#c9a84c' : '#0d1f3c'}
                              stroke={isActiveSub ? '#fde68a' : '#c9a84c'}
                              strokeWidth="0.8"
                              opacity={0.95}
                            />
                            <text
                              x={cx + offsetX} y={cy + offsetY + 3}
                              textAnchor="middle" fontSize="10"
                              fontWeight={isActiveSub ? '700' : '500'}
                              fill={isActiveSub ? '#0a1628' : '#c9a84c'}
                              style={{ pointerEvents: 'none', fontFamily: 'Georgia, serif' }}
                            >
                              {member.title}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </g>
                );
              })}

              <rect width={SVG_W} height={SVG_H} fill="url(#map-vig)" style={{ pointerEvents: 'none' }} />
            </svg>

            {/* ── 羅盤 ──────────────────────────────────────────────────── */}
            <button
              className="absolute bottom-3 left-3 transition-opacity"
              style={{ opacity: 0.8, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.5')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
              onClick={handleCompassClick}
              title="重置視角"
            >
              <svg width="54" height="54" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r="24" fill="#0a1628" stroke="#2a4a7f" strokeWidth="1" opacity="0.9" />
                <polygon points={starPoints(27, 27, 20, 9, 8)} fill="none" stroke="#2a4a7f" strokeWidth="0.8" />
                <polygon points="27,6 23.5,18 30.5,18" fill="#c9a84c" opacity="0.9" />
                <polygon points="27,48 23.5,36 30.5,36" fill="#4a7ac9" opacity="0.65" />
                <polygon points="6,27 18,23.5 18,30.5" fill="#4a7ac9" opacity="0.5" />
                <polygon points="48,27 36,23.5 36,30.5" fill="#4a7ac9" opacity="0.5" />
                <circle cx="27" cy="27" r="4" fill="#0d1f3c" stroke="#c9a84c" strokeWidth="0.8" />
                <circle cx="27" cy="27" r="2" fill="#c9a84c" opacity="0.8" />
                <text x="27" y="4" textAnchor="middle" fontSize="6" fill="#c9a84c" fontWeight="700" style={{ fontFamily: 'Georgia, serif' }}>N</text>
              </svg>
            </button>

            {resetHint && (
              <div className="absolute bottom-16 left-3 text-[11px] px-2 py-1 rounded"
                style={{ background: '#0d1f3c', border: '0.5px solid #c9a84c', color: '#c9a84c' }}>
                視角已重置
              </div>
            )}
          </div>

          {/* ── Right Panel ─────────────────────────────────────────────── */}
          <div
            className="w-64 flex flex-col overflow-hidden shrink-0"
            style={{ background: '#0d1f3c', borderLeft: '0.5px solid #2a4a7f' }}
          >
            {selectedNode ? (
              <>
                {/* ── 上：地點資訊（可捲動） ── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">

                  {/* 地點名稱 */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base leading-snug"
                        style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                        ✦ 【{selectedNode.title}】
                      </h3>
                      {isAtSelected ? (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm mt-0.5"
                          style={{ background: 'rgba(201,168,76,0.15)', border: '0.5px solid #c9a84c', color: '#c9a84c' }}>
                          你在這裡
                        </span>
                      ) : (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-sm mt-0.5"
                          style={{ background: 'rgba(204,68,34,0.15)', border: '0.5px solid #cc4422', color: '#ff8866' }}>
                          目標
                        </span>
                      )}
                    </div>
                    {/* 菱形分隔線 */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex-1 h-px" style={{ background: '#2a4a7f' }} />
                      <span style={{ color: '#c9a84c', fontSize: 10 }}>◆</span>
                      <div className="flex-1 h-px" style={{ background: '#2a4a7f' }} />
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className="text-xs leading-relaxed"
                    style={{ color: '#8ab4e8', fontFamily: 'Georgia, serif' }}>
                    {selectedNode.content || '這個地方充滿了未知的故事，等待著探索。'}
                  </p>

                  {/* 區域記憶（中間，始終顯示區塊） */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex-1 h-px" style={{ background: '#1a2a4a' }} />
                      <h4 className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', flexShrink: 0 }}>
                        ✦ 區域記憶
                      </h4>
                      <div className="flex-1 h-px" style={{ background: '#1a2a4a' }} />
                    </div>
                    {selectedMemories.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedMemories.map(m => (
                          <div key={m.id} className="text-[11px] pl-2.5 py-1.5 pr-2 rounded-r"
                            style={{
                              color: '#8ab4e8',
                              borderLeft: '2px solid #c9a84c',
                              background: 'rgba(74,122,201,0.06)',
                              fontFamily: 'Georgia, serif',
                              lineHeight: 1.5,
                            }}>
                            {m.content}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-center py-2"
                        style={{ color: '#2a4a7f', fontFamily: 'Georgia, serif' }}>
                        暫無區域記憶
                      </p>
                    )}
                  </div>
                </div>

                {/* ── 下：前往方式（固定在底部） ── */}
                {!isAtSelected && (
                  <div className="shrink-0 p-4 space-y-2" style={{ borderTop: '0.5px solid #2a4a7f' }}>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: '#4a7ac9', fontFamily: 'Georgia, serif' }}>
                      前往方式
                    </h4>
                    <div className="flex gap-2">
                      {/* 徒步 */}
                      <button
                        onClick={() => { setTravelMode(prev => prev === 'walk' ? null : 'walk'); setGoldWarning(false); }}
                        className="flex-1 py-1.5 text-xs rounded transition"
                        style={{
                          border: `1px solid ${travelMode === 'walk' ? '#8ab4e8' : '#2a4a7f'}`,
                          color: travelMode === 'walk' ? '#fff' : '#8ab4e8',
                          background: travelMode === 'walk' ? 'rgba(74,122,201,0.25)' : 'transparent',
                          fontFamily: 'Georgia, serif',
                        }}
                      >
                        🚶 徒步
                      </button>
                      {/* 馬車 */}
                      {(selectedNode.cartFare ?? 0) > 0 && (
                        <button
                          onClick={() => { setTravelMode(prev => prev === 'carriage' ? null : 'carriage'); setGoldWarning(false); }}
                          className="flex-1 py-1.5 text-xs rounded transition"
                          style={{
                            border: `1px solid ${travelMode === 'carriage' ? '#c9a84c' : '#4a4a2a'}`,
                            color: travelMode === 'carriage' ? '#fde68a' : '#c9a84c',
                            background: travelMode === 'carriage' ? 'rgba(201,168,76,0.2)' : 'transparent',
                            fontFamily: 'Georgia, serif',
                          }}
                        >
                          🐴 {selectedNode.cartFare}G
                        </button>
                      )}
                    </div>
                    {goldWarning && (
                      <p className="text-[11px] text-center" style={{ color: '#ef4444' }}>阮囊羞澀</p>
                    )}
                    {travelMode && (
                      <button
                        onClick={handleDepart}
                        className="w-full py-2 text-sm font-bold rounded tracking-widest transition"
                        style={{ background: '#c9a84c', color: '#0a1628', fontFamily: 'Georgia, serif' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#e0bc62')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#c9a84c')}
                      >
                        ✦ 啟程
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* 無選取 → 地點清單 */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 pt-4 pb-2 shrink-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: '#4a7ac9', fontFamily: 'Georgia, serif' }}>
                    已知地點
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                  {(searchQuery.trim() ? filteredNodes : mapNodes)
                    .filter(e => e.mapStatus === 'known' || e.title === currentLocation)
                    .map(loc => (
                      <button key={loc.id}
                        onClick={() => { setSelectedTitle(loc.title); setTravelMode(null); setGoldWarning(false); }}
                        className="w-full text-left px-2.5 py-2 rounded text-xs transition"
                        style={{
                          background: loc.title === currentLocation ? 'rgba(201,168,76,0.1)' : 'transparent',
                          border: `0.5px solid ${loc.title === currentLocation ? '#4a4a2a' : '#1a2a4a'}`,
                          color: loc.title === currentLocation ? '#c9a84c' : '#8ab4e8',
                          fontFamily: 'Georgia, serif',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,122,201,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = loc.title === currentLocation ? 'rgba(201,168,76,0.1)' : 'transparent')}
                      >
                        {loc.title === currentLocation ? '📍 ' : '✦ '}{loc.title}
                      </button>
                    ))
                  }
                  {(searchQuery.trim() ? filteredNodes : mapNodes)
                    .filter(e => e.mapStatus !== 'known' && e.title !== currentLocation).length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="flex-1 h-px" style={{ background: '#1a2a4a' }} />
                        <span style={{ color: '#2a4a7f', fontSize: 9 }}>未踏足</span>
                        <div className="flex-1 h-px" style={{ background: '#1a2a4a' }} />
                      </div>
                      {(searchQuery.trim() ? filteredNodes : mapNodes)
                        .filter(e => e.mapStatus !== 'known' && e.title !== currentLocation)
                        .map(loc => (
                          <button key={loc.id}
                            onClick={() => { setSelectedTitle(loc.title); setTravelMode(null); setGoldWarning(false); }}
                            className="w-full text-left px-2.5 py-2 rounded text-xs transition"
                            style={{ background: 'transparent', border: '0.5px solid #1a2a4a', color: '#2a4a7f', fontFamily: 'Georgia, serif' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#4a7ac9')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#2a4a7f')}
                          >
                            ? {loc.title}
                          </button>
                        ))
                      }
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 旅途發現（無 mapX 的條目） */}
            {undiscoveredList.length > 0 && (
              <div className="shrink-0 p-3 space-y-1.5 max-h-36 overflow-y-auto"
                style={{ borderTop: '0.5px solid #2a4a7f' }}>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: '#4a7ac9', fontFamily: 'Georgia, serif' }}>
                  旅途發現
                </h4>
                {undiscoveredList.map(loc => (
                  <div key={loc.id} className="text-[11px] px-2.5 py-1.5 rounded"
                    style={{ background: 'rgba(74,122,201,0.06)', border: '0.5px solid #1a2a4a', fontFamily: 'Georgia, serif' }}>
                    <span style={{ color: '#c9a84c', fontWeight: 600 }}>{loc.title}</span>
                    <span style={{ color: '#2a4a7f', marginLeft: 6, fontSize: 9 }}>
                      {loc.mapStatus === 'known' ? '✓' : '?'}
                    </span>
                    <p style={{ color: '#4a7ac9', fontSize: 9, marginTop: 2 }}>{loc.content}</p>
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
