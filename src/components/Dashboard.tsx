import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { reputationProgress, getReputationLevel } from '../data/reputation';
import { WEATHER_MAP } from '../data/weather';
import { STYLE_MAP } from '../data/styles';
import { LOCATION_MAP } from '../data/locations';
import { INFRA_MAP } from '../data/infrastructures';
import { analyzeLayout } from '../engine/layout';
import { Meter, ProgressBar, SectionHeader, StatTile, cx } from './ui';
import {
  deltaColor,
  formatMoney,
  formatMoneyShort,
  formatNumber,
  ratingColor,
} from '../utils/format';
import type { GamePhase } from '../types';

export default function Dashboard() {
  const game = useGameStore((s) => s.game);
  const setPhase = useGameStore((s) => s.setPhase);
  const summary = usePlanSummary();
  if (!game.festival || !summary) return null;

  const level = getReputationLevel(game.reputation);
  const { next, progress } = reputationProgress(game.reputation);
  const weather = WEATHER_MAP[game.forecast];
  const style = STYLE_MAP[game.festival.style];
  const location = LOCATION_MAP[game.festival.location];
  const { projection, lineup } = summary;

  const layoutAnalysis = analyzeLayout(
    game.plan.layout ?? [],
    INFRA_MAP,
    game.plan.infrastructures,
  );
  const layoutPlaced = layoutAnalysis.placedCount;
  const layoutOwned = layoutAnalysis.totalOwned;

  const checklist: {
    phase: GamePhase;
    icon: string;
    label: string;
    status: string;
    ok: boolean;
  }[] = [
    {
      phase: 'format',
      icon: '📅',
      label: 'Format',
      status: `${formatNumber(game.festival.capacity ?? 0)} places · ${game.festival.days ?? 1}j`,
      ok: true,
    },
    {
      phase: 'programming',
      icon: '🎤',
      label: 'Programmation',
      status: `${game.plan.bookedArtistIds.length} réservé${game.plan.bookedArtistIds.length > 1 ? 's' : ''}, ${lineup.count} programmé${lineup.count > 1 ? 's' : ''}`,
      ok: lineup.count >= 3,
    },
    {
      phase: 'timetable',
      icon: '🗓️',
      label: 'Programme horaire',
      status: game.plan.timetable.length > 0
        ? `${new Set(game.plan.timetable.map((s) => s.artistId)).size}/${game.plan.bookedArtistIds.length} artistes planifiés`
        : 'Non configuré',
      ok: game.plan.timetable.length > 0 || game.plan.bookedArtistIds.length === 0,
    },
    {
      phase: 'infrastructure',
      icon: '🏗️',
      label: 'Infrastructures',
      status: summary.infra.stageCapacity > 0 ? `${formatNumber(summary.infra.stageCapacity)} places` : 'Aucune scène !',
      ok: summary.infra.stageCapacity > 0,
    },
    {
      phase: 'layout',
      icon: '📍',
      label: 'Plan du site',
      status: layoutOwned === 0
        ? 'Aucun équipement acheté'
        : layoutPlaced === layoutOwned
        ? `${layoutPlaced} placés · Score ${layoutAnalysis.score}/100`
        : `${layoutPlaced}/${layoutOwned} placés`,
      ok: layoutOwned === 0 || layoutPlaced === layoutOwned,
    },
    {
      phase: 'marketing',
      icon: '📣',
      label: 'Marketing',
      status: summary.marketing.reach > 0 ? `${formatMoneyShort(summary.marketing.cost)} investis` : 'Aucune pub',
      ok: summary.marketing.reach > 0,
    },
    {
      phase: 'sponsors',
      icon: '🤝',
      label: 'Sponsors',
      status: `${game.plan.acceptedSponsorIds.length} signé(s) · ${formatMoneyShort(summary.sponsorIncome)}`,
      ok: true,
    },
    {
      phase: 'tickets',
      icon: '🎟️',
      label: 'Prix du billet',
      status: `${game.plan.ticketPrice} €`,
      ok: game.plan.ticketPrice > 0,
    },
  ];

  const readyToLaunch = lineup.count >= 1 && summary.infra.stageCapacity > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader
        emoji="🏠"
        title="Tableau de bord"
        subtitle={`${style.emoji} ${game.festival.style} · ${location.emoji} ${game.festival.location} · ${(game.festival.days ?? 1)} jour${(game.festival.days ?? 1) > 1 ? 's' : ''} — préparez l'édition ${game.edition}.`}
        right={
          <button className="btn-primary" onClick={() => setPhase('simulation')} disabled={!readyToLaunch}>
            ▶️ Lancer l'édition {game.edition}
          </button>
        }
      />

      {/* Niveau de réputation */}
      <div className="panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{level.emoji}</span>
            <div>
              <div className="font-extrabold text-lg">{level.label}</div>
              <div className="text-xs text-slate-400 max-w-md">{level.perk}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums">{Math.round(game.reputation)}</div>
            <div className="text-xs text-slate-400">points de réputation</div>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={progress * 100} barClassName="bg-gradient-to-r from-festi-accent to-festi-accent2" />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>{level.label}</span>
            <span>{next ? `Prochain : ${next.emoji} ${next.label} (${next.min} pts)` : '👑 Sommet mondial atteint !'}</span>
          </div>
        </div>
      </div>

      {/* Statistiques clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon="💰"
          label="Budget"
          value={formatMoney(game.budget)}
          sub={<span className={deltaColor(summary.available - 0)}>Dispo : {formatMoney(summary.available)}</span>}
          tone="gold"
        />
        <StatTile
          icon="⭐"
          label="Réputation"
          value={Math.round(game.reputation)}
          sub={level.label}
          tone="accent"
        />
        <StatTile
          icon="😀"
          label="Satisfaction"
          value={game.history.length ? `${game.lastSatisfaction}/100` : '—'}
          sub={game.history.length ? 'Dernière édition' : 'Pas encore jouée'}
        />
        <StatTile
          icon="🎟️"
          label="Billets vendus"
          value={game.history.length ? formatNumber(game.lastTicketsSold) : '—'}
          sub="Dernière édition"
        />
        <StatTile
          icon="🏟️"
          label="Capacité"
          value={formatNumber(projection.capacity)}
          sub={projection.soldOut ? '🔥 Complet prévu' : `${Math.round(projection.occupancy * 100)}% rempli`}
        />
        <StatTile icon="🔥" label="Popularité" value={`${Math.round(game.popularity)}/100`} sub="Hype du festival" />
        <StatTile icon={weather.emoji} label="Météo prévue" value={weather.label} sub="Pour cette édition" />
        <StatTile
          icon="🤝"
          label="Sponsors"
          value={game.plan.acceptedSponsorIds.length}
          sub={`${formatMoneyShort(summary.sponsorIncome)} sécurisés`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Checklist de préparation */}
        <div className="panel p-4 sm:p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">📋 Préparation de l'édition</h3>
          <div className="space-y-2">
            {checklist.map((c) => (
              <button
                key={c.phase}
                onClick={() => setPhase(c.phase)}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-festi-panel2 border border-festi-border hover:border-festi-accent/60 transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-xl">{c.icon}</span>
                  <span className="font-semibold">{c.label}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">{c.status}</span>
                  <span className={cx('text-lg', c.ok ? 'text-festi-mint' : 'text-festi-danger')}>
                    {c.ok ? '✓' : '!'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Projection */}
        <div className="panel p-4 sm:p-5">
          <h3 className="font-bold mb-1 flex items-center gap-2">🔮 Projection (météo & aléas neutres)</h3>
          <p className="text-xs text-slate-400 mb-3">Estimation indicative avant le lancement.</p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="panel-2 p-2.5 text-center">
              <div className="text-xs text-slate-400">Affluence</div>
              <div className="font-extrabold tabular-nums">{formatNumber(projection.expectedAttendance)}</div>
              <div className={cx('text-[11px]', projection.soldOut ? 'text-festi-gold' : 'text-slate-500')}>
                {projection.soldOut ? '🔥 complet' : `${Math.round(projection.occupancy * 100)}% rempli`}
              </div>
            </div>
            <div className="panel-2 p-2.5 text-center">
              <div className="text-xs text-slate-400">Recettes</div>
              <div className="font-extrabold tabular-nums text-festi-mint">{formatMoneyShort(projection.expectedRevenue)}</div>
              <div className="text-[11px] text-slate-500">prévues</div>
            </div>
            <div className="panel-2 p-2.5 text-center">
              <div className="text-xs text-slate-400">Bénéfice</div>
              <div className={cx('font-extrabold tabular-nums', deltaColor(projection.expectedProfit))}>
                {formatMoneyShort(projection.expectedProfit)}
              </div>
              <div className="text-[11px] text-slate-500">estimé</div>
            </div>
          </div>

          <div className="space-y-2.5">
            <Meter label="🎤 Programmation" value={projection.programming} />
            <Meter label="🏗️ Infrastructures" value={projection.infrastructure} />
            <Meter label="🛡️ Organisation" value={projection.organization} />
            <div className="pt-1 border-t border-festi-border">
              <Meter label="😀 Satisfaction globale estimée" value={projection.satisfaction} />
            </div>
          </div>

          <div className={cx('mt-3 text-sm font-semibold', ratingColor(projection.satisfaction))}>
            {projection.expectedProfit < 0
              ? '⚠️ Budget déficitaire prévu : ajustez prix, line-up ou dépenses.'
              : projection.soldOut
                ? '🔥 Complet attendu : pensez à agrandir la capacité ou monter le prix !'
                : projection.demandPressure < 0.35
                  ? '📉 Demande faible vs capacité : renforcez line-up & marketing, ou réduisez la jauge.'
                  : '👍 Configuration solide. Prêt à lancer quand vous voulez !'}
          </div>
        </div>
      </div>
    </div>
  );
}
