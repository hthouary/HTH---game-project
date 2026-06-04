import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { getReputationLevel } from '../data/reputation';
import { WEATHER_MAP } from '../data/weather';
import { STYLE_MAP } from '../data/styles';
import { Modal, cx } from '../components/ui';
import { formatMoneyShort } from '../utils/format';
import Dashboard from '../components/Dashboard';
import ArtistBooking from '../components/ArtistBooking';
import InfrastructurePanel from '../components/InfrastructurePanel';
import MarketingPanel from '../components/MarketingPanel';
import SponsorsPanel from '../components/SponsorsPanel';
import TicketsPanel from '../components/TicketsPanel';
import SimulationScreen from '../components/SimulationScreen';
import TimetablePanel from '../components/TimetablePanel';
import FormatPanel from '../components/FormatPanel';
import ReportScreen from '../components/ReportScreen';
import LayoutPanel from '../components/LayoutPanel';
import HistoryModal from '../components/HistoryModal';
import type { GamePhase } from '../types';

const TABS: { id: GamePhase; icon: string; label: string; short: string }[] = [
  { id: 'dashboard', icon: '🏠', label: 'Tableau de bord', short: 'Bord' },
  { id: 'format', icon: '📅', label: 'Format', short: 'Format' },
  { id: 'programming', icon: '🎤', label: 'Programmation', short: 'Artistes' },
  { id: 'timetable', icon: '🗓️', label: 'Programme', short: 'Planning' },
  { id: 'infrastructure', icon: '🏗️', label: 'Infrastructures', short: 'Infra' },
  { id: 'layout', icon: '📍', label: 'Plan du site', short: 'Plan' },
  { id: 'marketing', icon: '📣', label: 'Marketing', short: 'Pub' },
  { id: 'sponsors', icon: '🤝', label: 'Sponsors', short: 'Sponsors' },
  { id: 'tickets', icon: '🎟️', label: 'Billetterie', short: 'Billets' },
];

export default function GameScreen() {
  const game = useGameStore((s) => s.game);
  const setPhase = useGameStore((s) => s.setPhase);
  const abandonGame = useGameStore((s) => s.abandonGame);
  const summary = usePlanSummary();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  if (!game.festival) return null;

  // Écran de rapport : prise en main totale
  if (game.phase === 'report') return <ReportScreen />;

  const level = getReputationLevel(game.reputation);
  const weather = WEATHER_MAP[game.forecast];
  const style = STYLE_MAP[game.festival.style];

  const renderPhase = () => {
    switch (game.phase) {
      case 'format':
        return <FormatPanel />;
      case 'programming':
        return <ArtistBooking />;
      case 'timetable':
        return <TimetablePanel />;
      case 'infrastructure':
        return <InfrastructurePanel />;
      case 'layout':
        return <LayoutPanel />;
      case 'marketing':
        return <MarketingPanel />;
      case 'sponsors':
        return <SponsorsPanel />;
      case 'tickets':
        return <TicketsPanel />;
      case 'simulation':
        return <SimulationScreen />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-30 bg-festi-bg/85 backdrop-blur border-b border-festi-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => setPhase('dashboard')}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <span className="text-2xl shrink-0">{style.emoji}</span>
            <div className="min-w-0">
              <div className="font-extrabold leading-tight truncate">{game.festival.name}</div>
              <div className="text-[11px] text-slate-400 truncate">
                Édition {game.edition} · {game.festival.location}
                {game.festival.days > 1 && ` · ${game.festival.days}j`}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <Pill icon="💰" value={formatMoneyShort(game.budget)} tone="gold" />
              <Pill icon={level.emoji} value={`${Math.round(game.reputation)}`} tone="accent" />
              <Pill icon="🔥" value={`${Math.round(game.popularity)}`} />
              <Pill icon={weather.emoji} value={weather.label} />
            </div>
            <div className="relative">
              <button
                className="btn-ghost py-2 px-3"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
              >
                ⋯
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 panel p-1.5 z-20 animate-pop">
                    <MenuItem
                      icon="📚"
                      label="Historique des éditions"
                      onClick={() => {
                        setHistoryOpen(true);
                        setMenuOpen(false);
                      }}
                    />
                    <MenuItem
                      icon="💾"
                      label="Sauvegarde automatique ✓"
                      onClick={() => setMenuOpen(false)}
                      muted
                    />
                    <div className="my-1 border-t border-festi-border" />
                    <MenuItem
                      icon="🗑️"
                      label="Nouvelle partie"
                      danger
                      onClick={() => {
                        setConfirmNew(true);
                        setMenuOpen(false);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats mobiles */}
        <div className="sm:hidden flex items-center gap-2 px-3 pb-2 overflow-x-auto no-scrollbar text-xs">
          <Pill icon="💰" value={formatMoneyShort(game.budget)} tone="gold" />
          <Pill icon={level.emoji} value={`${Math.round(game.reputation)}`} tone="accent" />
          <Pill icon="🔥" value={`${Math.round(game.popularity)}`} />
          <Pill icon={weather.emoji} value={weather.label} />
          {summary && <Pill icon="🤝" value={`${game.plan.acceptedSponsorIds.length}`} />}
        </div>

        {/* Navigation (masquée pendant la simulation) */}
        {game.phase !== 'simulation' && (
          <nav className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center gap-1 overflow-x-auto no-scrollbar pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setPhase(t.id)}
                className={cx('nav-tab', game.phase === t.id && 'nav-tab-active')}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Contenu */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-5">{renderPhase()}</main>

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} history={game.history} />

      <Modal open={confirmNew} onClose={() => setConfirmNew(false)} title="Nouvelle partie ?">
        <p className="text-slate-300">
          Cela effacera définitivement votre festival actuel <b>{game.festival.name}</b> et tout son
          historique. Cette action est irréversible.
        </p>
        <div className="flex gap-3 mt-5">
          <button className="btn-ghost flex-1" onClick={() => setConfirmNew(false)}>
            Annuler
          </button>
          <button
            className="btn-danger flex-1"
            onClick={() => {
              abandonGame();
              setConfirmNew(false);
            }}
          >
            🗑️ Tout effacer
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Pill({ icon, value, tone }: { icon: string; value: string; tone?: 'gold' | 'accent' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap border',
        tone === 'gold'
          ? 'bg-festi-gold/10 border-festi-gold/30 text-festi-gold'
          : tone === 'accent'
            ? 'bg-festi-accent/10 border-festi-accent/30 text-festi-accent'
            : 'bg-festi-panel2 border-festi-border text-slate-200',
      )}
    >
      <span>{icon}</span>
      {value}
    </span>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  muted,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left hover:bg-festi-panel2 transition-colors',
        danger && 'text-festi-danger hover:bg-festi-danger/10',
        muted && 'text-slate-500 cursor-default hover:bg-transparent',
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
