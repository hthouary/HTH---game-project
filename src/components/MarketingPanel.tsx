import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { MARKETING_CHANNELS } from '../data/marketing';
import { Badge, SectionHeader, Stepper, cx } from './ui';
import { formatMoney, formatMoneyShort, formatNumber } from '../utils/format';

export default function MarketingPanel() {
  const game = useGameStore((s) => s.game);
  const setMarketing = useGameStore((s) => s.setMarketing);
  const summary = usePlanSummary();
  if (!game.festival || !summary) return null;

  const style = game.festival.style;

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="📣"
        title="Marketing & communication"
        subtitle="Investissez dans les bons canaux pour faire connaître votre festival. L'efficacité dépend de l'adéquation avec votre public."
      />

      <div className="panel p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Budget marketing</div>
          <div className="font-extrabold text-lg">{formatMoneyShort(summary.marketing.cost)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Portée totale</div>
          <div className="font-extrabold text-lg">{formatNumber(summary.marketing.reach)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Notoriété effective</div>
          <div className="font-extrabold text-lg">{formatNumber(summary.marketing.awareness)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Budget dispo</div>
          <div className={cx('font-extrabold text-lg', summary.available < 0 ? 'text-festi-danger' : 'text-festi-mint')}>
            {formatMoneyShort(summary.available)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {MARKETING_CHANNELS.map((ch) => {
          const units = game.plan.marketing.units[ch.id] ?? 0;
          const ideal = style === 'Multi-genres' || ch.bestFor.includes(style);
          const reach = units * ch.reachPerUnit;
          return (
            <div key={ch.id} className={cx('panel-2 p-4 flex flex-col gap-2', units > 0 && 'ring-1 ring-festi-accent/50')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="text-xl">{ch.emoji}</span> {ch.label}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-1">{ch.description}</p>
                </div>
                <Badge color={ideal ? 'mint' : 'muted'}>{ideal ? '🎯 Idéal' : 'Moins ciblé'}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] my-1">
                <div className="panel p-1.5 !rounded-lg">
                  <div className="text-slate-500">Coût/unité</div>
                  <div className="font-bold">{formatMoneyShort(ch.unitCost)}</div>
                </div>
                <div className="panel p-1.5 !rounded-lg">
                  <div className="text-slate-500">Portée/unité</div>
                  <div className="font-bold">{formatNumber(ch.reachPerUnit)}</div>
                </div>
                <div className="panel p-1.5 !rounded-lg">
                  <div className="text-slate-500">Efficacité</div>
                  <div className="font-bold">{Math.round(ch.efficiency * 100)}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-1">
                <Stepper value={units} onChange={(v) => setMarketing(ch.id, v)} max={20} />
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums">{units > 0 ? formatMoney(ch.unitCost * units) : '—'}</div>
                  {reach > 0 && <div className="text-[10px] text-slate-500">{formatNumber(reach)} pers. touchées</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel p-4 text-sm text-slate-400">
        💡 <span className="text-slate-300 font-semibold">Astuce :</span> répartir le budget sur plusieurs
        canaux ciblés est plus efficace que tout miser sur un seul (rendements décroissants par canal).
      </div>
    </div>
  );
}
