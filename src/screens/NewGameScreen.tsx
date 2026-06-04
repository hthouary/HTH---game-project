import { useState } from 'react';
import type { LocationId, MusicStyle } from '../types';
import { MUSIC_STYLES } from '../data/styles';
import { LOCATIONS } from '../data/locations';
import { useGameStore } from '../store/gameStore';
import { cx } from '../components/ui';
import { formatMoney } from '../utils/format';

export default function NewGameScreen() {
  const newGame = useGameStore((s) => s.newGame);
  const [name, setName] = useState('');
  const [style, setStyle] = useState<MusicStyle | null>(null);
  const [location, setLocation] = useState<LocationId | null>(null);

  const canStart = name.trim().length >= 2 && style && location;

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

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-festi-border">
            <div className="text-sm text-slate-400">
              Budget de départ :{' '}
              <span className="font-bold text-festi-gold">{formatMoney(250000)}</span>
            </div>
            <button
              className="btn-primary w-full sm:w-auto text-lg px-8 py-3 disabled:grayscale"
              disabled={!canStart}
              onClick={() => style && location && newGame(name, style, location)}
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
