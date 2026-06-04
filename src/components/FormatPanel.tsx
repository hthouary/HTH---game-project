import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { LOCATION_MAP } from '../data/locations';
import { WEATHER_MAP } from '../data/weather';
import { SITE_COST_PER_HEAD } from '../engine/economy';
import { SectionHeader, cx } from './ui';
import { formatMoney, formatMoneyShort, formatNumber } from '../utils/format';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const SEASON = (m: number) =>
  m === 12 || m <= 2 ? '❄️ Hiver' : m <= 5 ? '🌸 Printemps' : m <= 8 ? '☀️ Été' : '🍂 Automne';

const DAYS_OPTIONS = [1, 2, 3, 4];

export default function FormatPanel() {
  const game = useGameStore((s) => s.game);
  const setFestivalDays = useGameStore((s) => s.setFestivalDays);
  const setFestivalCapacity = useGameStore((s) => s.setFestivalCapacity);
  const setFestivalMonth = useGameStore((s) => s.setFestivalMonth);
  const summary = usePlanSummary();
  if (!game.festival || !summary) return null;

  const loc = LOCATION_MAP[game.festival.location];
  const { festival } = game;
  const { projection } = summary;
  const weather = WEATHER_MAP[game.forecast];

  const capacityCost = Math.round(festival.capacity * SITE_COST_PER_HEAD);
  const rentalCost = loc.baseCost * festival.days;

  const fillPct = projection.capacity > 0
    ? Math.round((projection.expectedAttendance / projection.capacity) * 100)
    : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="📅"
        title="Format de l'édition"
        subtitle="Définissez la date, la durée et la capacité de cette édition. Ces réglages peuvent changer chaque année selon votre stratégie."
      />

      {/* MOIS */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-bold flex items-center gap-2">🗓️ Mois du festival</h3>
            <p className="text-xs text-slate-400">
              Influe sur la météo probable : {SEASON(festival.month)} · prévision actuelle {weather.emoji} {weather.label}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MONTHS.map((label, i) => {
            const m = i + 1;
            return (
              <button
                key={m}
                onClick={() => setFestivalMonth(m)}
                className={cx(
                  'panel-2 p-2 text-center transition-all hover:border-festi-accent/60',
                  festival.month === m && 'ring-2 ring-festi-accent border-festi-accent bg-festi-accent/10',
                )}
              >
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-[10px] text-slate-400">{SEASON(m)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DURÉE */}
      <div className="panel p-4">
        <h3 className="font-bold flex items-center gap-2 mb-1">⏳ Durée</h3>
        <p className="text-xs text-slate-400 mb-3">
          Plus de jours = plus d'attractivité et de revenus bars/restauration, mais le staff, la sécurité
          et la location du site sont facturés <b>chaque jour</b>. Location actuelle : {formatMoney(rentalCost)}.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setFestivalDays(d)}
              className={cx(
                'panel-2 p-3 text-center transition-all hover:border-festi-accent/60',
                festival.days === d && 'ring-2 ring-festi-accent border-festi-accent bg-festi-accent/10',
              )}
            >
              <div className="font-bold text-xl">{d} jour{d > 1 ? 's' : ''}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                site {formatMoneyShort(loc.baseCost * d)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CAPACITÉ */}
      <div className="panel p-4">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
          <div>
            <h3 className="font-bold flex items-center gap-2">🏟️ Capacité d'accueil</h3>
            <p className="text-xs text-slate-400 max-w-lg">
              Jauge maximale de billets. L'affluence réelle dépend de votre attractivité — viser trop grand
              coûte cher en aménagement, viser trop petit fait afficher complet (et fait grimper les prix l'an prochain).
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums">{formatNumber(festival.capacity)}</div>
            <div className="text-[11px] text-slate-500">places</div>
          </div>
        </div>

        <input
          type="range"
          min={1000}
          max={loc.maxCapacity}
          step={1000}
          value={festival.capacity}
          onChange={(e) => setFestivalCapacity(Number(e.target.value))}
          className="w-full accent-festi-accent2 cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>1 000</span>
          <span>{loc.label} — max {formatNumber(loc.maxCapacity)}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {[5000, 10000, 20000, 35000].filter((v) => v <= loc.maxCapacity).map((v) => (
            <button key={v} className="btn-ghost py-1.5 px-3" onClick={() => setFestivalCapacity(v)}>
              {formatNumber(v)}
            </button>
          ))}
          <button
            className="btn-ghost py-1.5 px-3"
            onClick={() => setFestivalCapacity(loc.maxCapacity)}
          >
            Max
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <div className="panel-2 p-3 text-center">
            <div className="text-xs text-slate-400">Coût d'aménagement</div>
            <div className="font-extrabold tabular-nums">{formatMoney(capacityCost)}</div>
            <div className="text-[10px] text-slate-500">{SITE_COST_PER_HEAD} €/place</div>
          </div>
          <div className="panel-2 p-3 text-center">
            <div className="text-xs text-slate-400">Affluence estimée</div>
            <div className="font-extrabold tabular-nums">{formatNumber(projection.expectedAttendance)}</div>
            <div className="text-[10px] text-slate-500">{fillPct}% de la jauge</div>
          </div>
          <div className="panel-2 p-3 text-center">
            <div className="text-xs text-slate-400">Statut prévu</div>
            <div className={cx('font-extrabold', projection.soldOut ? 'text-festi-gold' : 'text-slate-300')}>
              {projection.soldOut ? '🔥 COMPLET' : `${fillPct}% rempli`}
            </div>
            <div className="text-[10px] text-slate-500">
              pression {Math.round(projection.demandPressure * 100)}%
            </div>
          </div>
        </div>

        {projection.demandPressure > 1.15 && (
          <div className="mt-3 text-sm text-festi-gold">
            🔥 Forte demande : vous pourriez agrandir la capacité ou augmenter le prix du billet.
          </div>
        )}
        {projection.capacity > 0 && fillPct < 35 && projection.expectedAttendance > 0 && (
          <div className="mt-3 text-sm text-slate-400">
            💡 Capacité large pour votre attractivité actuelle : pas de pénalité tant que vos infrastructures
            sont dimensionnées pour l'affluence réelle — mais vous payez l'aménagement de places vides.
          </div>
        )}
      </div>
    </div>
  );
}
