// Helpers de formatage et petites maths partagées

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return `${sign}${abs.toLocaleString('fr-FR')} €`;
}

export function formatMoneyShort(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)} M€`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)} k€`;
  return `${sign}${Math.round(abs)} €`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('fr-FR');
}

export function formatPercent(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)} %`;
}

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Note /5 arrondie au demi-point à partir d'un score 0-100 */
export function scoreToStars(score: number): number {
  return Math.round((score / 100) * 5 * 2) / 2;
}

export function ratingColor(score: number): string {
  if (score >= 75) return 'text-festi-mint';
  if (score >= 55) return 'text-festi-gold';
  if (score >= 40) return 'text-orange-400';
  return 'text-festi-danger';
}

export function deltaColor(n: number): string {
  if (n > 0) return 'text-festi-mint';
  if (n < 0) return 'text-festi-danger';
  return 'text-slate-400';
}

export function signed(n: number): string {
  return `${n > 0 ? '+' : ''}${formatNumber(n)}`;
}
