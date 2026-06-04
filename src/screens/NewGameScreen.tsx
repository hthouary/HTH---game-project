import { useState } from 'react';
import type { LocationId, MusicStyle } from '../types';
import { MUSIC_STYLES } from '../data/styles';
import { LOCATIONS, LOCATION_MAP } from '../data/locations';
import { useGameStore } from '../store/gameStore';
import { cx } from '../components/ui';
import { formatMoney, formatNumber } from '../utils/format';

const MONTHS = [
  { m: 1, label: 'Janvier', season: '❄️ Hiver' },
  { m: 2, label: 'Février', season: '❄️ Hiver' },
  { m: 3, label: 'Mars', season: '🌸 Printemps' },
  { m: 4, label: 'Avril', season: '🌸 Printemps' },
  { m: 5, label: 'Mai', season: '🌸 Printemps' },
  { m: 6, label: 'Juin', season: '☀️ Été' },
  { m: 7, label: 'Juillet', season: '☀️ Été' },
  { m: 8, label: 'Août', season: '☀️ Été' },
  { m: 9, label: 'Septembre', season: '🍂 Automne' },
  { m: 10, label: 'Octobre', season: '🍂 Automne' },
  { m: 11, label: 'Novembre', season: '🍂 Automne' },
  { m: 12, label: 'Décembre', season: '❄️ Hiver' },
];

const DAYS_OPTIONS = [
  { d: 1, label: '1 jour', hint: 'Format classique' },
  { d: 2, label: '2 jours', hint: 'Weekend festival' },
  { d: 3, label: '3 jours', hint: 'Grand festival' },
  { d: 4, label: '4 jours', hint: 'Méga festival' },
];

export default function NewGameScreen() {
  const newGame = useGameStore((s) => s.newGame);
  const [name, setName] = useState('');
  const [style, setStyle] = useState<MusicStyle | null>(null);
  const [location, setLocation] = useState<LocationId | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [capacity, setCapacity] = useState(8000);

  const maxCapacity = location ? LOCATION_MAP[location].maxCapacity : 60000;
  const effectiveCapacity = Math.min(capacity, maxCapacity);
  const canStart = name.trim().length >= 2 && style && location && month && days;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-5xl animate-fade-in">
        {/* Hero */}
        <header className="text-center mb-8">
          <div className="text-5xl sm:text-6xl mb-2">🎪</div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-festi-accent via-festi-accent2 to-festi-gold bg-clip-text text-transparent">
            FESTITOCHE
          </h1>
          <p className="text-slate-400 mt-2 text-balance max-w-xl mx-auto">
            Devenez l'organisateur du plus grand festival de musique au monde. Une édition, une année,
            une décision à la fois.
          </p>
        </header>

        <div className="panel p-5 sm:p-7 space-y-7">
          {/* Nom */}
          <section>
            <label className="block font-bold mb-2 text-lg">1 · Nom du festival</label>
            <input
              className="input text-lg"
              placeholder="ex : Vibrasson, Échos d'Été, Tempo Festival…"
              value={name}
              maxLength={28}
              onChange={(e) => setName(e.target.value)}
            />
          </section>

          {/* Style */}
          <section>
            <label className="block font-bold mb-1 text-lg">2 · Style musical principal</label>
            <p className="text-slate-400 text-sm mb-3">
              Influence le public potentiel, le coût des artistes et les canaux marketing efficaces.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MUSIC_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={cx(
                    'panel-2 p-3 text-left transition-all hover:border-festi-accent/60 hover:-translate-y-0.5',
                    style === s.id && 'ring-2 ring-festi-accent border-festi-accent bg-festi-accent/10',
                  )}
                >
                  <div className="text-2xl">{s.emoji}</div>
                  <div className="font-bold mt-1">{s.label}</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{s.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Localisation */}
          <section>
            <label className="block font-bold mb-1 text-lg">3 · Localisation</label>
            <p className="text-slate-400 text-sm mb-3">
              Détermine la capacité maximale, le coût du site, l'attractivité, le climat et les contraintes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {LOCATIONS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLocation(l.id)}
                  className={cx(
                    'panel-2 p-3 text-left transition-all hover:border-festi-accent/60 hover:-translate-y-0.5',
                    location === l.id && 'ring-2 ring-festi-accent border-festi-accent bg-festi-accent/10',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{l.emoji}</span>
                    <span className="font-bold">{l.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{l.description}</p>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-[11px]">
                    <span className="text-slate-500">Capacité max</span>
                    <span className="text-right font-semibold">{l.maxCapacity.toLocaleString('fr-FR')}</span>
                    <span className="text-slate-500">Coût du site</span>
                    <span className="text-right font-semibold">{formatMoney(l.baseCost)}</span>
                  </div>
                  <p className="text-[10px] text-festi-gold/80 mt-1.5 leading-snug">⚠ {l.constraint}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Mois */}
          <section>
            <label className="block font-bold mb-1 text-lg">4 · Mois du festival</label>
            <p className="text-slate-400 text-sm mb-3">
              La saison influe sur la météo prévue et donc sur l'affluence et la satisfaction.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MONTHS.map(({ m, label, season }) => (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={cx(
                    'panel-2 p-2 text-center transition-all hover:border-festi-accent/60 hover:-translate-y-0.5',
                    month === m && 'ring-2 ring-festi-accent border-festi-accent bg-festi-accent/10',
                  )}
                >
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{season}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Durée */}
          <section>
            <label className="block font-bold mb-1 text-lg">5 · Durée du festival</label>
            <p className="text-slate-400 text-sm mb-3">
              Les festivals multi-jours attirent plus de public et génèrent plus de revenus F&B, mais les frais de
              staff et de location s'accumulent chaque jour.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS_OPTIONS.map(({ d, label, hint }) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cx(
                    'panel-2 p-3 text-center transition-all hover:border-festi-accent/60 hover:-translate-y-0.5',
                    days === d && 'ring-2 ring-festi-accent border-festi-accent bg-festi-accent/10',
                  )}
                >
                  <div className="font-bold text-xl">{label}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{hint}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Capacité */}
          <section>
            <label className="block font-bold mb-1 text-lg">6 · Capacité d'accueil</label>
            <p className="text-slate-400 text-sm mb-3">
              Vous fixez la jauge maximale. L'affluence réelle dépendra de votre attractivité.
              {location ? ` Maximum sur ce site : ${formatNumber(maxCapacity)}.` : ' Choisissez d\'abord une localisation.'}
              {' '}Modifiable à chaque édition.
            </p>
            <div className="panel-2 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Capacité visée</span>
                <span className="text-2xl font-black tabular-nums">{formatNumber(effectiveCapacity)}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={maxCapacity}
                step={1000}
                value={effectiveCapacity}
                disabled={!location}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full accent-festi-accent2 cursor-pointer disabled:opacity-40"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>1 000</span>
                <span>Aménagement : {formatMoney(Math.round(effectiveCapacity * 1.2))}</span>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-festi-border">
            <div className="text-sm text-slate-400">
              Budget de départ :{' '}
              <span className="font-bold text-festi-gold">{formatMoney(200000)}</span>
            </div>
            <button
              className="btn-primary w-full sm:w-auto text-lg px-8 py-3 disabled:grayscale"
              disabled={!canStart}
              onClick={() =>
                style && location && month && days &&
                newGame(name, style, location, month, days, effectiveCapacity)
              }
            >
              🚀 Lancer ma première édition
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Sauvegarde automatique locale · Inspiré de Football Manager, RollerCoaster Tycoon &amp; Two
          Point Campus.
        </p>
      </div>
    </div>
  );
}
