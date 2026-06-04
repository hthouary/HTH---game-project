import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { getReputationLevel, REPUTATION_LEVELS } from '../data/reputation';
import { genreAffinity, STYLE_MAP } from '../data/styles';
import { Badge, ProgressBar, SectionHeader, cx } from './ui';
import { formatMoney, formatMoneyShort, formatNumber } from '../utils/format';
import type { Artist, MusicStyle } from '../types';

const GENRES: MusicStyle[] = ['Techno', 'EDM', 'Hardstyle', 'Rap', 'Rock', 'Pop'];
type SortKey = 'popularity' | 'cost' | 'satisfaction';

function MiniStat({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-500 w-7 shrink-0">{label}</span>
      <ProgressBar value={value} max={max} className="w-full" />
      <span className="text-[10px] tabular-nums w-6 text-right text-slate-400">{Math.round(value)}</span>
    </div>
  );
}

function affinityLabel(aff: number): string {
  if (aff >= 1) return 'Parfait';
  if (aff >= 0.8) return 'Excellent';
  if (aff >= 0.6) return 'Bon';
  return 'Éloigné';
}

export default function ArtistBooking() {
  const game = useGameStore((s) => s.game);
  const toggleArtist = useGameStore((s) => s.toggleArtist);
  const summary = usePlanSummary();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<MusicStyle | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('popularity');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyBooked, setOnlyBooked] = useState(false);

  const level = getReputationLevel(game.reputation);
  const bookedSet = useMemo(() => new Set(game.plan.bookedArtistIds), [game.plan.bookedArtistIds]);

  const filtered = useMemo(() => {
    const list = game.artists.filter((a) => {
      if (genre !== 'all' && a.genre !== genre) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (onlyBooked && !bookedSet.has(a.id)) return false;
      if (onlyAvailable && a.tier > level.tier) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'cost') return a.cost - b.cost;
      return (b[sort] as number) - (a[sort] as number);
    });
  }, [game.artists, genre, query, sort, onlyAvailable, onlyBooked, level.tier, bookedSet]);

  if (!game.festival || !summary) return null;
  const style = game.festival.style;

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="🎤"
        title="Programmation artistique"
        subtitle={`${game.artists.length} artistes au catalogue. Recrutez selon votre budget et votre palier (${level.label}).`}
      />

      {/* Résumé du line-up */}
      <div className="panel p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Artistes</div>
          <div className="font-extrabold text-lg">{summary.lineup.count}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Coût total</div>
          <div className="font-extrabold text-lg">{formatMoneyShort(summary.lineup.cost)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Tête d'affiche</div>
          <div className="font-extrabold text-lg truncate">{summary.lineup.headliners[0]?.name ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Attraction</div>
          <div className="font-extrabold text-lg">{formatNumber(summary.lineup.drawPower)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Adéquation style</div>
          <div className="font-extrabold text-lg">{Math.round(summary.lineup.genreMatch * 100)}%</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Budget dispo</div>
          <div className={cx('font-extrabold text-lg', summary.available < 0 ? 'text-festi-danger' : 'text-festi-mint')}>
            {formatMoneyShort(summary.available)}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="panel p-3 flex flex-wrap items-center gap-2">
        <input
          className="input flex-1 min-w-[160px] py-2"
          placeholder="🔎 Rechercher un artiste…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input w-auto py-2" value={genre} onChange={(e) => setGenre(e.target.value as MusicStyle | 'all')}>
          <option value="all">Tous genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {STYLE_MAP[g].emoji} {g}
            </option>
          ))}
        </select>
        <select className="input w-auto py-2" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="popularity">Tri : popularité</option>
          <option value="cost">Tri : coût</option>
          <option value="satisfaction">Tri : satisfaction</option>
        </select>
        <button
          className={cx('btn-ghost py-2', onlyAvailable && 'ring-1 ring-festi-accent text-white')}
          onClick={() => setOnlyAvailable((v) => !v)}
        >
          🔓 Disponibles
        </button>
        <button
          className={cx('btn-ghost py-2', onlyBooked && 'ring-1 ring-festi-accent text-white')}
          onClick={() => setOnlyBooked((v) => !v)}
        >
          ✓ Programmés ({summary.lineup.count})
        </button>
      </div>

      {/* Liste */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((a: Artist) => {
          const isBooked = bookedSet.has(a.id);
          const locked = a.tier > level.tier;
          const aff = genreAffinity(style, a.genre);
          const reqLevel = REPUTATION_LEVELS.find((l) => l.tier === a.tier);
          const affordable = isBooked || summary.available >= a.cost;
          return (
            <div
              key={a.id}
              className={cx(
                'panel-2 p-3 transition-all',
                isBooked && 'ring-2 ring-festi-accent border-festi-accent bg-festi-accent/10',
                locked && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold truncate flex items-center gap-1.5">
                    {a.name}
                    {a.popularity >= 85 && <span title="Superstar">🌟</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge color="muted">{STYLE_MAP[a.genre].emoji} {a.genre}</Badge>
                    <Badge color={aff >= 0.6 ? 'mint' : 'muted'}>{affinityLabel(aff)}</Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold tabular-nums">{formatMoney(a.cost)}</div>
                  <div className="text-[10px] text-slate-500">Palier {a.tier}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2.5">
                <MiniStat label="Pop" value={a.popularity} />
                <MiniStat label="Show" value={a.showQuality} />
                <MiniStat label="Fiab" value={a.reliability} />
                <MiniStat label="Tech" value={a.technicalRequirement} />
              </div>

              <div className="mt-3">
                {locked ? (
                  <div className="text-center text-xs text-festi-gold py-2 rounded-lg bg-festi-bg/50 border border-festi-border">
                    🔒 Débloqué au niveau {reqLevel?.emoji} {reqLevel?.label}
                  </div>
                ) : (
                  <button
                    className={cx('w-full', isBooked ? 'btn-danger' : 'btn-primary', !affordable && 'opacity-50')}
                    disabled={!isBooked && !affordable}
                    onClick={() => toggleArtist(a.id)}
                  >
                    {isBooked ? '✓ Programmé — retirer' : affordable ? '+ Programmer' : 'Budget insuffisant'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="panel p-8 text-center text-slate-400">Aucun artiste ne correspond à ces filtres.</div>
      )}
    </div>
  );
}
