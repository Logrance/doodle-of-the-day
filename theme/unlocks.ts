import { colors } from './colors';

export type TierId =
  | 'palette'
  | 'doodlerBadge'
  | 'redFlame'
  | 'goldFrame'
  | 'veteran'
  | 'master';

export interface Tier {
  id: TierId;
  threshold: number;
  label: string;
  description: string;
}

export const TIERS: Tier[] = [
  {
    id: 'palette',
    threshold: 3,
    label: 'Color palette',
    description: 'Unlock the full color palette on your canvas.',
  },
  {
    id: 'doodlerBadge',
    threshold: 7,
    label: 'Doodler',
    description: 'A badge on your profile.',
  },
  {
    id: 'redFlame',
    threshold: 14,
    label: 'Red flame',
    description: 'Your streak fire turns red.',
  },
  {
    id: 'goldFrame',
    threshold: 30,
    label: 'Gold frame',
    description: 'A gold frame around your winning drawings.',
  },
  {
    id: 'veteran',
    threshold: 100,
    label: 'Veteran',
    description: 'A title on your profile and an accent on the leaderboard.',
  },
  {
    id: 'master',
    threshold: 365,
    label: 'Master',
    description: 'An animated gold flame and Master title.',
  },
];

export function getUnlocks(streak: number): Set<TierId> {
  return new Set(TIERS.filter(t => streak >= t.threshold).map(t => t.id));
}

export function hasUnlock(streak: number, id: TierId): boolean {
  const tier = TIERS.find(t => t.id === id);
  return tier ? streak >= tier.threshold : false;
}

export function getNextUnlock(streak: number): Tier | null {
  return TIERS.find(t => streak < t.threshold) ?? null;
}

// Color override for the streak number wherever it's displayed.
// Returns undefined for default styling when no color tier has been earned.
export function getStreakColor(streak: number): string | undefined {
  if (streak >= 365) return colors.gold;
  if (streak >= 14) return colors.danger;
  return undefined;
}
