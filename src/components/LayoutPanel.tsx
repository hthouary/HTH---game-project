import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { INFRA_MAP, INFRA_CATEGORIES } from '../data/infrastructures';
import { analyzeLayout, computeCrowdZone, type LayoutIssue } from '../engine/layout';
import { SectionHeader, cx } from './ui';
import { GRID_COLS, GRID_ROWS } from '../types';
import type { PlacedItem } from '../types';
import type { InfraOption } from '../types';

type Zone = 'stage' | 'entrance' | 'normal';

function cellZone(y: number): Zone {
  if (y <= 2) return 'stage';
  if (y >= GRID_ROWS - 2) return 'entrance';
  return 'normal';
}

// ---- Sub-components ---------------------------------------------------------

interface CellProps {
  x: number;
  y: number;
  zone: Zone;
  isCrowdZone: boolean;
  placed: PlacedItem | undefined;
  selectedInfraId: string | null;
  infraMap: Record<string, InfraOption>;
  onClick: () => void;
}

function GridCell({ x, y, zone, isCrowdZone, placed, selectedInfraId, infraMap, onClick }: CellProps) {
  const def = placed ? infraMap[placed.infraId] : null;
  const canPlace = !!selectedInfraId && !placed;

  const bg = isCrowdZone
    ? 'bg-violet-950/60 border-violet-800/40'
    : zone === 'stage'
    ? 'bg-blue-950/60 border-blue-900/30'
    : zone === 'entrance'
    ? 'bg-amber-950/50 border-amber-900/25'
    : 'bg-slate-800/30 border-festi-border/20';

  return (
    <button
      className={cx(
        'w-10 h-10 rounded-sm border flex items-center justify-center transition-all select-none',
        bg,
        placed ? 'hover:ring-2 hover:ring-festi-danger/70 cursor-pointer' : canPlace ? 'hover:bg-festi-accent/20 hover:border-festi-accent/50 cursor-cell' : 'cursor-default',
      )}
      onClick={onClick}
      title={def ? `${def.label} — cliquer pour retirer` : canPlace ? 'Placer ici' : `(${x},${y})`}
    >
      {def ? (
        <span className="text-lg leading-none">{def.emoji}</span>
      ) : canPlace ? (
        <span className="text-[10px] text-slate-700">+</span>
      ) : null}
    </button>
  );
}

interface InventoryItem {
  id: string;
  owned: number;
  placed: number;
  def: InfraOption;
}

interface SidebarProps {
  items: InventoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placedCount: number;
  totalOwned: number;
}

function InventorySidebar({ items, selectedId, onSelect, placedCount, totalOwned }: SidebarProps) {
  return (
    <div className="panel p-3 space-y-3 xl:max-h-[560px] xl:overflow-y-auto">
      <div className="font-semibold text-sm flex items-center justify-between">
        <span>🏗️ Équipements</span>
        {totalOwned > 0 && (
          <span className={cx('text-xs tabular-nums', placedCount >= totalOwned ? 'text-festi-mint' : 'text-slate-400')}>
            {placedCount}/{totalOwned} placés
          </span>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-500 italic">Achetez des équipements dans la section Infrastructures.</p>
      )}

      {INFRA_CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.def.category === cat.id);
        if (catItems.length === 0) return null;
        return (
          <div key={cat.id}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">{cat.emoji} {cat.label}</div>
            <div className="space-y-1">
              {catItems.map((item) => {
                const unplaced = item.owned - item.placed;
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => unplaced > 0 && onSelect(item.id)}
                    disabled={unplaced === 0}
                    className={cx(
                      'w-full text-left panel-2 px-2.5 py-1.5 text-xs transition-all',
                      isSelected && 'ring-2 ring-festi-accent bg-festi-accent/10',
                      unplaced === 0 && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">{item.def.emoji}</span>
                        <span className="font-semibold truncate">{item.def.label}</span>
                      </span>
                      <span className={cx('shrink-0 font-bold tabular-nums', unplaced > 0 ? 'text-festi-accent' : 'text-slate-500')}>
                        {item.placed}/{item.owned}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selectedId && (
        <button
          className="w-full text-xs text-slate-500 hover:text-white text-center py-1 border-t border-festi-border mt-2"
          onClick={() => onSelect(selectedId)}
        >
          × Désélectionner
        </button>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: LayoutIssue }) {
  return (
    <div
      className={cx(
        'flex items-start gap-2 text-sm rounded-lg px-2.5 py-1.5',
        issue.type === 'bonus'
          ? 'bg-festi-mint/10 text-festi-mint'
          : 'bg-festi-danger/10 text-festi-danger',
      )}
    >
      <span className="shrink-0 mt-0.5 font-bold">{issue.type === 'bonus' ? '✓' : '⚠'}</span>
      <span className="flex-1">{issue.message}</span>
      <span className="shrink-0 font-bold tabular-nums">
        {issue.points > 0 ? `+${issue.points}` : issue.points}
      </span>
    </div>
  );
}

// ---- Main component ---------------------------------------------------------

export default function LayoutPanel() {
  const [selectedInfraId, setSelectedInfraId] = useState<string | null>(null);

  const game = useGameStore((s) => s.game);
  const placeLayoutItem = useGameStore((s) => s.placeLayoutItem);
  const removeLayoutItem = useGameStore((s) => s.removeLayoutItem);
  const clearLayout = useGameStore((s) => s.clearLayout);

  if (!game.festival) return null;

  const plan = game.plan;
  const layout = plan.layout ?? [];
  const ownedInfra = plan.infrastructures;

  // Build inventory list
  const inventoryItems: InventoryItem[] = Object.entries(ownedInfra)
    .filter(([, qty]) => qty > 0)
    .map(([id, owned]) => ({
      id,
      owned,
      placed: layout.filter((p) => p.infraId === id).length,
      def: INFRA_MAP[id],
    }))
    .filter((item): item is InventoryItem => item.def != null)
    .sort((a, b) => {
      const catOrder = INFRA_CATEGORIES.findIndex((c) => c.id === a.def.category) -
        INFRA_CATEGORIES.findIndex((c) => c.id === b.def.category);
      return catOrder !== 0 ? catOrder : a.def.label.localeCompare(b.def.label);
    });

  // Dynamic crowd zones from placed stages
  const crowdZones = useMemo(() => computeCrowdZone(layout, INFRA_MAP), [layout]);

  // Layout analysis
  const analysis = useMemo(
    () => analyzeLayout(layout, INFRA_MAP, ownedInfra),
    [layout, ownedInfra],
  );

  const getAt = (x: number, y: number) => layout.find((p) => p.x === x && p.y === y);

  const handleCellClick = (x: number, y: number) => {
    const existing = getAt(x, y);
    if (existing) {
      removeLayoutItem(x, y);
      return;
    }
    if (!selectedInfraId) return;
    const item = inventoryItems.find((i) => i.id === selectedInfraId);
    if (!item || item.placed >= item.owned) return;
    placeLayoutItem(selectedInfraId, x, y);
    // Auto-deselect when last instance placed
    if (item.placed + 1 >= item.owned) {
      setSelectedInfraId(null);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedInfraId(id === selectedInfraId ? null : id);
  };

  const scoreColor =
    analysis.score >= 70
      ? 'text-festi-mint'
      : analysis.score >= 45
      ? 'text-festi-gold'
      : 'text-festi-danger';

  const sortedIssues = [...analysis.issues].sort((a, b) => Math.abs(b.points) - Math.abs(a.points));

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="📍"
        title="Plan du festival"
        subtitle="Positionnez vos équipements sur le terrain. Un bon plan améliore la circulation, réduit les files et maximise la satisfaction."
        right={
          layout.length > 0 ? (
            <button className="btn-ghost py-1.5 px-3 text-sm" onClick={clearLayout}>
              🗑️ Effacer
            </button>
          ) : undefined
        }
      />

      {/* Selected item banner */}
      {selectedInfraId && (() => {
        const def = INFRA_MAP[selectedInfraId];
        return (
          <div className="panel p-3 flex items-center gap-3 bg-festi-accent/10 border-festi-accent/40">
            <span className="text-2xl">{def?.emoji}</span>
            <div className="flex-1 text-sm">
              <span className="font-semibold">{def?.label}</span>
              <span className="text-slate-400"> — Cliquez une case pour placer. Cliquez un item existant pour le retirer.</span>
            </div>
            <button className="btn-ghost py-1 px-2 text-xs" onClick={() => setSelectedInfraId(null)}>
              × Annuler
            </button>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar */}
        <InventorySidebar
          items={inventoryItems}
          selectedId={selectedInfraId}
          onSelect={handleSelect}
          placedCount={analysis.placedCount}
          totalOwned={analysis.totalOwned}
        />

        {/* Grid */}
        <div className="panel p-3 sm:p-4">
          {/* Zone legend */}
          <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-blue-900/80 border border-blue-700/50 inline-block" />
              Zone scènes (haut)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-violet-900/80 border border-violet-700/50 inline-block" />
              Zone foule (devant scènes)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-amber-900/70 border border-amber-700/40 inline-block" />
              Zone entrée (bas)
            </span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="inline-block">
              {/* Top label */}
              <p className="text-[10px] text-blue-500/50 text-center mb-0.5 select-none">
                ▲ Haut — zone scènes recommandée
              </p>

              {/* Grid cells */}
              <div
                className="grid gap-px"
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 2.5rem)` }}
              >
                {Array.from({ length: GRID_ROWS }, (_, y) =>
                  Array.from({ length: GRID_COLS }, (_, x) => (
                    <GridCell
                      key={`${x}-${y}`}
                      x={x}
                      y={y}
                      zone={cellZone(y)}
                      isCrowdZone={crowdZones.has(`${x},${y}`)}
                      placed={getAt(x, y)}
                      selectedInfraId={selectedInfraId}
                      infraMap={INFRA_MAP}
                      onClick={() => handleCellClick(x, y)}
                    />
                  )),
                )}
              </div>

              {/* Bottom label */}
              <p className="text-[10px] text-amber-500/50 text-center mt-0.5 select-none">
                ▼ Bas — entrée, sécurité &amp; parking recommandés ici 🚪
              </p>
            </div>
          </div>

          {/* Score bar */}
          {analysis.placedCount > 0 && (
            <div className="mt-4 pt-3 border-t border-festi-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-slate-300">Score du plan</span>
                <span className={cx('text-2xl font-black tabular-nums', scoreColor)}>
                  {analysis.score}/100
                </span>
              </div>
              <div className="w-full bg-festi-panel2 rounded-full h-2 overflow-hidden">
                <div
                  className={cx(
                    'h-full rounded-full transition-all duration-500',
                    analysis.score >= 70 ? 'bg-festi-mint' : analysis.score >= 45 ? 'bg-festi-gold' : 'bg-festi-danger',
                  )}
                  style={{ width: `${analysis.score}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Impact sur la satisfaction infrastructure :{' '}
                <span className={cx('font-semibold', scoreColor)}>
                  {analysis.score >= 70
                    ? `+${Math.round((0.70 + 0.55 * (analysis.score / 100) - 1) * 100)}%`
                    : `${Math.round((0.70 + 0.55 * (analysis.score / 100) - 1) * 100)}%`}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Issues & bonuses */}
      {analysis.placedCount > 0 && sortedIssues.length > 0 && (
        <div className="panel p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
            📊 Analyse du placement
            <span className="text-xs text-slate-400 font-normal">
              ({sortedIssues.filter((i) => i.type === 'bonus').length} bonus,{' '}
              {sortedIssues.filter((i) => i.type === 'penalty').length} problèmes)
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sortedIssues.slice(0, 10).map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {analysis.placedCount === 0 && inventoryItems.length > 0 && (
        <div className="panel p-4 text-center text-slate-400 text-sm">
          💡 Sélectionnez un équipement dans l'inventaire à gauche, puis cliquez sur une case de la grille pour le placer.
        </div>
      )}
    </div>
  );
}
