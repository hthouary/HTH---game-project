import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { getReputationLevel, REPUTATION_LEVELS } from '../data/reputation';
import { INFRASTRUCTURES, INFRA_CATEGORIES } from '../data/infrastructures';
import { DEMAND_FRACTION } from '../engine/economy';
import { Badge, SectionHeader, Stepper, cx } from './ui';
import { formatMoney, formatMoneyShort, formatNumber } from '../utils/format';
import type { InfraCategory } from '../types';

const NEED_FRACTION: Record<InfraCategory, number> = {
  stage: 1,
  toilets: 1,
  security: 1,
  staff: 1,
  bars: DEMAND_FRACTION.bars!,
  food: DEMAND_FRACTION.food!,
  parking: DEMAND_FRACTION.parking!,
  camping: DEMAND_FRACTION.camping!,
  vip: DEMAND_FRACTION.vip!,
};

export default function InfrastructurePanel() {
  const game = useGameStore((s) => s.game);
  const incInfra = useGameStore((s) => s.incInfra);
  const summary = usePlanSummary();
  if (!game.festival || !summary) return null;

  const level = getReputationLevel(game.reputation);
  const attendance = Math.max(1, summary.projection.expectedAttendance);
  const { infra } = summary;

  const coveragePct = (cat: InfraCategory) =>
    Math.round((infra.serves[cat] / (attendance * NEED_FRACTION[cat])) * 100);

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="🏗️"
        title="Infrastructures"
        subtitle="Dimensionnez votre festival. Les scènes fixent la capacité ; les autres équipements doivent suivre l'affluence pour éviter les files et les incidents."
      />

      {/* Résumé */}
      <div className="panel p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Capacité (scènes)</div>
          <div className={cx('font-extrabold text-lg', infra.stageCapacity === 0 && 'text-festi-danger')}>
            {formatNumber(infra.stageCapacity)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Affluence prévue</div>
          <div className="font-extrabold text-lg">{formatNumber(summary.projection.expectedAttendance)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Coût infrastructures</div>
          <div className="font-extrabold text-lg">{formatMoneyShort(infra.cost)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Budget dispo</div>
          <div className={cx('font-extrabold text-lg', summary.available < 0 ? 'text-festi-danger' : 'text-festi-mint')}>
            {formatMoneyShort(summary.available)}
          </div>
        </div>
      </div>

      {INFRA_CATEGORIES.map((cat) => {
        const options = INFRASTRUCTURES.filter((o) => o.category === cat.id);
        const cov = coveragePct(cat.id);
        const showCoverage = cat.essential && cat.id !== 'stage';
        return (
          <div key={cat.id} className="panel p-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cat.emoji}</span>
                <div>
                  <h3 className="font-bold">{cat.label}</h3>
                  <p className="text-xs text-slate-400">{cat.hint}</p>
                </div>
              </div>
              {showCoverage && infra.serves[cat.id] >= 0 && (
                <Badge color={cov >= 100 ? 'mint' : cov >= 70 ? 'gold' : 'danger'}>
                  Couverture {Math.min(cov, 999)}%
                </Badge>
              )}
              {cat.id === 'stage' && infra.stageCapacity === 0 && (
                <Badge color="danger">⚠ Aucune scène — impossible de lancer</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {options.map((o) => {
                const qty = game.plan.infrastructures[o.id] ?? 0;
                const locked = o.tier > level.tier;
                const reqLevel = REPUTATION_LEVELS.find((l) => l.tier === o.tier);
                return (
                  <div
                    key={o.id}
                    className={cx(
                      'panel-2 p-3 flex flex-col gap-2',
                      qty > 0 && 'ring-1 ring-festi-accent/50',
                      locked && 'opacity-60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{o.emoji}</span> {o.label}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{o.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold tabular-nums">{formatMoney(o.cost)}</div>
                        <div className="text-[10px] text-slate-500">/ unité</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {o.capacity > 0 && <Badge color="accent">+{formatNumber(o.capacity)} places</Badge>}
                      {o.serves > 0 && <Badge color="muted">sert {formatNumber(o.serves)} pers.</Badge>}
                      {o.revenuePerHead > 0 && <Badge color="gold">+{o.revenuePerHead}€/pers.</Badge>}
                      {o.satisfaction > 0 && <Badge color="mint">😀 +{o.satisfaction}</Badge>}
                      {o.safety > 0 && <Badge color="accent">🛡 -{Math.round(o.safety * 100)}% risque</Badge>}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      {locked ? (
                        <div className="text-xs text-festi-gold">
                          🔒 {reqLevel?.emoji} {reqLevel?.label}
                        </div>
                      ) : (
                        <>
                          <Stepper value={qty} onChange={(v) => incInfra(o.id, v - qty)} max={50} />
                          <div className="text-sm font-bold tabular-nums">
                            {qty > 0 ? formatMoney(o.cost * qty) : '—'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
