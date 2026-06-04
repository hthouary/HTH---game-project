import type { InfraCategory, InfraOption, PlacedItem } from '../types';
import { GRID_COLS, GRID_ENTRANCE } from '../types';
import { clamp } from '../utils/format';

export interface LayoutIssue {
  type: 'penalty' | 'bonus';
  message: string;
  points: number;
}

export interface LayoutAnalysis {
  score: number;
  issues: LayoutIssue[];
  placedCount: number;
  totalOwned: number;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Item is in the "crowd zone" = directly in front of a stage (1-3 rows below it, within ±2 cols)
function inCrowdZone(item: { x: number; y: number }, stages: { x: number; y: number }[]): boolean {
  return stages.some((s) => {
    const dy = item.y - s.y;
    return Math.abs(item.x - s.x) <= 2 && dy >= 1 && dy <= 3;
  });
}

export function analyzeLayout(
  layout: PlacedItem[],
  infraMap: Record<string, InfraOption>,
  owned: Record<string, number>,
): LayoutAnalysis {
  const totalOwned = Object.values(owned).reduce((s, v) => s + v, 0);
  const placedCount = layout.length;

  if (placedCount === 0) {
    return { score: 0, issues: [], placedCount, totalOwned };
  }

  const issues: LayoutIssue[] = [];
  const byCat = (cat: InfraCategory) => layout.filter((p) => infraMap[p.infraId]?.category === cat);

  const stages = byCat('stage');
  const toilets = byCat('toilets');
  const bars = byCat('bars');
  const food = byCat('food');
  const camping = byCat('camping');
  const parking = byCat('parking');
  const vip = byCat('vip');
  const security = byCat('security');

  // ---- Stages ---------------------------------------------------------------
  for (let i = 0; i < stages.length; i++) {
    for (let j = i + 1; j < stages.length; j++) {
      if (dist(stages[i], stages[j]) < 4) {
        issues.push({ type: 'penalty', message: 'Deux scènes trop proches — interférences sonores, foule dispersée', points: -12 });
      }
    }
  }

  // ---- Toilets --------------------------------------------------------------
  for (const t of toilets) {
    if (stages.some((s) => dist(t, s) < 3)) {
      issues.push({ type: 'penalty', message: 'Sanitaires trop proches d\'une scène — odeurs et gêne pendant les shows', points: -15 });
    }
    if (inCrowdZone(t, stages)) {
      issues.push({ type: 'penalty', message: 'Sanitaires dans l\'axe scène → entrée — bloquent la vision et le passage', points: -12 });
    }
    if ([...bars, ...food].some((fb) => dist(t, fb) < 2.5)) {
      issues.push({ type: 'penalty', message: 'Sanitaires trop proches d\'un bar ou stand alimentaire', points: -6 });
    }
  }
  // Bonus: toilets spread across the site
  if (toilets.length >= 2) {
    const dists = toilets.flatMap((t, i) => toilets.slice(i + 1).map((t2) => dist(t, t2)));
    if (dists.length > 0 && Math.min(...dists) >= 5) {
      issues.push({ type: 'bonus', message: 'Sanitaires bien répartis sur le site — files courtes partout', points: 7 });
    }
  }

  // ---- Bars -----------------------------------------------------------------
  for (const b of bars) {
    if (inCrowdZone(b, stages)) {
      issues.push({ type: 'penalty', message: 'Bar dans l\'axe direct de la scène — bloque circulation et visibilité', points: -10 });
    }
    // Bars well-placed on the side of a stage
    const onSide = b.x <= 2 || b.x >= GRID_COLS - 3;
    if (onSide && stages.some((s) => dist(b, s) <= 5) && !inCrowdZone(b, stages)) {
      issues.push({ type: 'bonus', message: 'Bar bien positionné sur le côté de la scène — accessible sans bloquer', points: 6 });
    }
  }
  // Bars clustered together → queue buildup
  for (let i = 0; i < bars.length; i++) {
    for (let j = i + 1; j < bars.length; j++) {
      if (dist(bars[i], bars[j]) < 2.5) {
        issues.push({ type: 'penalty', message: 'Bars trop regroupés — longues files d\'attente concentrées au même endroit', points: -8 });
      }
    }
  }

  // ---- Food -----------------------------------------------------------------
  for (const f of food) {
    if (inCrowdZone(f, stages)) {
      issues.push({ type: 'penalty', message: 'Stand food dans l\'axe de la scène — crée des embouteillages', points: -6 });
    }
  }
  // Food court bonus
  let foodCourtFound = false;
  for (let i = 0; i < food.length && !foodCourtFound; i++) {
    for (let j = i + 1; j < food.length && !foodCourtFound; j++) {
      if (dist(food[i], food[j]) <= 3) {
        foodCourtFound = true;
        issues.push({ type: 'bonus', message: 'Food court regroupé — choix variés et files réduites', points: 8 });
      }
    }
  }

  // ---- Camping --------------------------------------------------------------
  for (const c of camping) {
    if (stages.length > 0) {
      const closest = Math.min(...stages.map((s) => dist(c, s)));
      if (closest < 5) {
        issues.push({ type: 'penalty', message: 'Camping trop proche d\'une scène — nuisances sonores nocturnes', points: -15 });
      } else if (closest >= 7) {
        issues.push({ type: 'bonus', message: 'Camping bien éloigné des scènes — nuits calmes garanties', points: 5 });
      }
    }
  }

  // ---- Parking --------------------------------------------------------------
  for (const p of parking) {
    if (dist(p, GRID_ENTRANCE) > 7) {
      issues.push({ type: 'penalty', message: 'Parking trop éloigné de l\'entrée — navettes longues, accès difficile', points: -8 });
    } else {
      issues.push({ type: 'bonus', message: 'Parking bien situé près de l\'entrée', points: 4 });
    }
  }

  // ---- VIP ------------------------------------------------------------------
  for (const v of vip) {
    if (stages.some((s) => dist(v, s) <= 3 && !inCrowdZone(v, stages))) {
      issues.push({ type: 'bonus', message: 'Zone VIP avec accès privilégié à la scène — expérience premium maximisée', points: 10 });
    }
  }

  // ---- Security -------------------------------------------------------------
  for (const s of security) {
    if (dist(s, GRID_ENTRANCE) > 5) {
      issues.push({ type: 'penalty', message: 'Sécurité trop éloignée de l\'entrée — contrôles défaillants', points: -10 });
    } else {
      issues.push({ type: 'bonus', message: 'Sécurité bien positionnée à l\'entrée', points: 5 });
    }
  }

  // ---- Completeness ---------------------------------------------------------
  const missing = totalOwned - placedCount;
  if (missing === 0) {
    issues.push({ type: 'bonus', message: 'Plan complet — tous les équipements positionnés', points: 10 });
  } else {
    issues.push({
      type: 'penalty',
      message: `${missing} équipement${missing > 1 ? 's' : ''} non placé${missing > 1 ? 's' : ''} — impact organisationnel nul`,
      points: missing >= 4 ? -15 : -6,
    });
  }

  // Base score = 60 (neutral, no layout bonuses or penalties)
  let score = 60;
  for (const issue of issues) score += issue.points;

  return { score: clamp(score, 0, 100), issues, placedCount, totalOwned };
}

/** Score de layout multiplié en modificateur de satisfaction infra (0.70–1.25) */
export function layoutInfraMult(layoutScore: number | null): number {
  if (layoutScore === null) return 1.0;
  return clamp(0.70 + 0.55 * (layoutScore / 100), 0.70, 1.25);
}

/** Crowd-zone cells en face de chaque scène placée (pour le rendu UI) */
export function computeCrowdZone(layout: PlacedItem[], infraMap: Record<string, InfraOption>): Set<string> {
  const cells = new Set<string>();
  for (const p of layout) {
    if (infraMap[p.infraId]?.category !== 'stage') continue;
    for (let dy = 1; dy <= 3; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        cells.add(`${p.x + dx},${p.y + dy}`);
      }
    }
  }
  return cells;
}
