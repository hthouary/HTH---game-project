import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { rollEvents, type EventRollContext, type ResolvedChoice } from '../engine/events';
import { WEATHER_MAP } from '../data/weather';
import { Badge, SectionHeader, cx } from './ui';
import { formatMoney, formatMoneyShort, formatNumber } from '../utils/format';
import { makeRng } from '../utils/rng';

export default function SimulationScreen() {
  const game = useGameStore((s) => s.game);
  const setPhase = useGameStore((s) => s.setPhase);
  const runEdition = useGameStore((s) => s.runEdition);
  const summary = usePlanSummary();
  const [choices, setChoices] = useState<Record<string, number>>({});

  const triggered = useMemo(() => {
    if (!game.festival || !summary) return [];
    const attendance = Math.max(1, summary.projection.expectedAttendance);
    const ctx: EventRollContext = {
      safety: summary.infra.safety,
      location: game.festival.location,
      forecast: game.forecast,
      barCoverage: summary.infra.serves.bars / (attendance * 0.95),
      toiletCoverage: summary.infra.serves.toilets / attendance,
      occupancyEstimate: summary.projection.occupancy,
      marketingAwareness: summary.marketing.awareness,
      reputation: game.reputation,
      avgReliability: summary.lineup.reliability || 80,
    };
    const rng = makeRng(`${game.festival.name}:${game.edition}:events`);
    return rollEvents(ctx, rng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.festival, game.edition, game.forecast, summary]);

  if (!game.festival || !summary) return null;
  const weather = WEATHER_MAP[game.forecast];
  const { projection, lineup, infra } = summary;

  const noStage = infra.stageCapacity <= 0;
  const noArtist = lineup.count <= 0;
  const blocked = noStage || noArtist;

  const eventCost = triggered.reduce((sum, def) => {
    const idx = choices[def.id] ?? 0;
    return sum + (def.options[idx]?.cost ?? 0);
  }, 0);

  const launch = () => {
    const resolved: ResolvedChoice[] = triggered.map((def) => ({
      def,
      optionIndex: choices[def.id] ?? 0,
    }));
    runEdition(resolved);
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
      <SectionHeader
        emoji="🎬"
        title={`Lancement — Édition ${game.edition}`}
        subtitle="Vérifiez votre configuration, gérez les imprévus, puis ouvrez les portes !"
        right={
          <button className="btn-ghost" onClick={() => setPhase('dashboard')}>
            ← Retour à la prépa
          </button>
        }
      />

      {/* Récap */}
      <div className="panel p-4">
        <h3 className="font-bold mb-3">📋 Récapitulatif de l'édition</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Recap label="Météo prévue" value={`${weather.emoji} ${weather.label}`} />
          <Recap label="Tête d'affiche" value={lineup.headliners[0]?.name ?? '—'} />
          <Recap label="Artistes" value={`${lineup.count}`} />
          <Recap label="Capacité" value={formatNumber(projection.capacity)} />
          <Recap label="Affluence prévue" value={formatNumber(projection.expectedAttendance)} />
          <Recap label="Prix billet" value={`${game.plan.ticketPrice} €`} />
          <Recap label="Sponsors" value={`${game.plan.acceptedSponsorIds.length}`} />
          <Recap
            label="Bénéfice projeté"
            value={formatMoneyShort(projection.expectedProfit)}
            tone={projection.expectedProfit >= 0 ? 'mint' : 'danger'}
          />
        </div>
      </div>

      {blocked && (
        <div className="panel p-4 border-festi-danger/50 bg-festi-danger/10">
          <p className="font-semibold text-festi-danger">⚠️ Impossible de lancer le festival :</p>
          <ul className="list-disc list-inside text-sm text-slate-300 mt-1">
            {noStage && <li>Vous devez construire au moins une scène (Infrastructures).</li>}
            {noArtist && <li>Vous devez programmer au moins un artiste (Programmation).</li>}
          </ul>
        </div>
      )}

      {summary.available < 0 && !blocked && (
        <div className="panel p-4 border-festi-gold/50 bg-festi-gold/10 text-sm">
          ⚠️ Vous avez engagé {formatMoney(-summary.available)} de plus que votre trésorerie. Le festival
          peut être déficitaire si les recettes ne suivent pas.
        </div>
      )}

      {/* Événements */}
      <div className="panel p-4">
        <h3 className="font-bold mb-1">🎲 Imprévus de l'édition</h3>
        <p className="text-xs text-slate-400 mb-3">
          Chaque situation appelle une décision. Mieux vaut investir pour limiter la casse… ou tenter le
          coup.
        </p>

        <div className="space-y-3">
          {triggered.map((def) => {
            const sel = choices[def.id] ?? 0;
            return (
              <div key={def.id} className="panel-2 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-bold flex items-center gap-2">
                    <span className="text-xl">{def.emoji}</span> {def.label}
                  </div>
                  <Badge color={def.type === 'positive' ? 'mint' : 'danger'}>
                    {def.type === 'positive' ? 'Opportunité' : 'Incident'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 mb-2.5">{def.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {def.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChoices((c) => ({ ...c, [def.id]: idx }))}
                      className={cx(
                        'text-left p-2.5 rounded-xl border transition-all',
                        sel === idx
                          ? 'border-festi-accent bg-festi-accent/15 ring-1 ring-festi-accent'
                          : 'border-festi-border bg-festi-bg/40 hover:border-festi-accent/50',
                      )}
                    >
                      <div className="font-semibold text-sm leading-snug">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{opt.description}</div>
                      <div className={cx('text-xs font-bold mt-1.5', opt.cost > 0 ? 'text-festi-gold' : 'text-slate-500')}>
                        {opt.cost > 0 ? `Coût : ${formatMoney(opt.cost)}` : 'Gratuit'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {eventCost > 0 && (
          <div className="text-right text-sm mt-3 text-slate-300">
            Coût des décisions : <span className="font-bold text-festi-gold">{formatMoney(eventCost)}</span>
          </div>
        )}
      </div>

      {/* Lancement */}
      <div className="sticky bottom-3 z-10">
        <button
          className="btn-primary w-full text-lg py-4 animate-pulse-glow disabled:animate-none"
          disabled={blocked}
          onClick={launch}
        >
          🎆 Ouvrir les portes du festival !
        </button>
      </div>
    </div>
  );
}

function Recap({ label, value, tone }: { label: string; value: string; tone?: 'mint' | 'danger' }) {
  return (
    <div className="panel-2 p-2.5">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div
        className={cx(
          'font-bold truncate',
          tone === 'mint' && 'text-festi-mint',
          tone === 'danger' && 'text-festi-danger',
        )}
      >
        {value}
      </div>
    </div>
  );
}
