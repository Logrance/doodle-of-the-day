import { useState, useEffect } from 'react';

export type Phase = 'drawing' | 'voting' | 'results';

export interface PhaseTimer {
  phase: Phase;
  /** Human-readable countdown, e.g. "2h 14m" or "4m 30s". Empty string when results are in. */
  countdown: string;
}

const DRAW_CUTOFF = 14 * 3600; // 14:00 UK
const VOTE_CUTOFF = 20 * 3600; // 20:00 UK

function getUKTotalSeconds(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  const s = parseInt(parts.find(p => p.type === 'second')!.value, 10);
  return h * 3600 + m * 60 + s;
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function compute(): PhaseTimer {
  const now = getUKTotalSeconds();
  if (now < DRAW_CUTOFF) {
    return { phase: 'drawing', countdown: formatSeconds(DRAW_CUTOFF - now) };
  }
  if (now < VOTE_CUTOFF) {
    return { phase: 'voting', countdown: formatSeconds(VOTE_CUTOFF - now) };
  }
  return { phase: 'results', countdown: '' };
}

export function usePhaseTimer(): PhaseTimer {
  const [state, setState] = useState<PhaseTimer>(compute);

  useEffect(() => {
    const id = setInterval(() => setState(compute()), 1000);
    return () => clearInterval(id);
  }, []);

  return state;
}
