import React from 'react';

// ---- Utilitaires de classe -------------------------------------------------
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---- Barre de progression --------------------------------------------------
export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cx('h-2 rounded-full bg-festi-bg/70 overflow-hidden', className)}>
      <div
        className={cx('h-full rounded-full transition-all duration-500', barClassName ?? 'bg-festi-accent')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---- Jauge libellée --------------------------------------------------------
export function Meter({
  label,
  value,
  max = 100,
  suffix = '',
  color,
  hint,
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  color?: string;
  hint?: string;
}) {
  const score = (value / max) * 100;
  const auto =
    score >= 75 ? 'bg-festi-mint' : score >= 55 ? 'bg-festi-gold' : score >= 40 ? 'bg-orange-400' : 'bg-festi-danger';
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-bold tabular-nums">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <ProgressBar value={value} max={max} barClassName={color ?? auto} />
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ---- Étoiles ---------------------------------------------------------------
export function StarRating({ rating, className }: { rating: number; className?: string }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className={cx('inline-flex items-center text-festi-gold', className)} aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return <span key={i}>★</span>;
        if (i === full && half) return <span key={i} className="relative">
          <span className="text-slate-600">★</span>
          <span className="absolute inset-0 overflow-hidden w-1/2">★</span>
        </span>;
        return <span key={i} className="text-slate-600">★</span>;
      })}
    </span>
  );
}

// ---- Badge / chip ----------------------------------------------------------
export function Badge({
  children,
  color = 'default',
  className,
}: {
  children: React.ReactNode;
  color?: 'default' | 'accent' | 'gold' | 'mint' | 'danger' | 'muted';
  className?: string;
}) {
  const map: Record<string, string> = {
    default: 'bg-festi-panel2 text-slate-200 border border-festi-border',
    accent: 'bg-festi-accent/20 text-festi-accent border border-festi-accent/40',
    gold: 'bg-festi-gold/15 text-festi-gold border border-festi-gold/40',
    mint: 'bg-festi-mint/15 text-festi-mint border border-festi-mint/40',
    danger: 'bg-festi-danger/15 text-festi-danger border border-festi-danger/40',
    muted: 'bg-festi-bg/60 text-slate-400 border border-festi-border',
  };
  return <span className={cx('chip', map[color], className)}>{children}</span>;
}

// ---- Pas à pas numérique ---------------------------------------------------
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="inline-flex items-center gap-1 select-none">
      <button
        type="button"
        className="w-8 h-8 rounded-lg bg-festi-panel2 border border-festi-border text-lg font-bold hover:border-festi-accent/60 active:scale-95 disabled:opacity-30"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="Diminuer"
      >
        −
      </button>
      <span className="w-9 text-center font-bold tabular-nums">{value}</span>
      <button
        type="button"
        className="w-8 h-8 rounded-lg bg-festi-panel2 border border-festi-border text-lg font-bold hover:border-festi-accent/60 active:scale-95 disabled:opacity-30"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label="Augmenter"
      >
        +
      </button>
    </div>
  );
}

// ---- Modale ----------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cx(
          'panel w-full max-h-[88vh] overflow-y-auto animate-pop',
          wide ? 'max-w-4xl' : 'max-w-lg',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-festi-border sticky top-0 bg-festi-panel/95 backdrop-blur z-10">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            className="w-8 h-8 rounded-lg hover:bg-festi-panel2 text-slate-400 hover:text-white text-xl leading-none"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ---- En-tête de section ----------------------------------------------------
export function SectionHeader({
  emoji,
  title,
  subtitle,
  right,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
          {emoji && <span>{emoji}</span>}
          <span>{title}</span>
        </h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// ---- Stat compacte ---------------------------------------------------------
export function StatTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'accent' | 'gold' | 'mint' | 'danger';
}) {
  const ring: Record<string, string> = {
    accent: 'ring-festi-accent/40',
    gold: 'ring-festi-gold/40',
    mint: 'ring-festi-mint/40',
    danger: 'ring-festi-danger/40',
  };
  return (
    <div className={cx('stat-card', tone && `ring-1 ${ring[tone]}`)}>
      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
        <span className="text-base">{icon}</span>
        {label}
      </div>
      <div className="text-xl sm:text-2xl font-extrabold tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
