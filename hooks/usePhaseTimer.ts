import { useState, useEffect } from 'react';

export type Phase = 'drawing' | 'voting' | 'results';

export interface PhaseTimer {
  phase: Phase;
  /** Human-readable countdown, e.g. "2h 14m" or "4m 30s". Empty string when results are in. */
  countdown: string;
  /** UK date in YYYY-MM-DD. Changes at UK midnight so consumers can detect day rollover. */
  ukDate: string;
}

const DRAW_CUTOFF = 14 * 3600; // 14:00 UK
const VOTE_CUTOFF = 20 * 3600; // 20:00 UK

function getUKParts(): { seconds: number; date: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  const h = parseInt(get('hour'), 10);
  const m = parseInt(get('minute'), 10);
  const s = parseInt(get('second'), 10);
  return {
    seconds: h * 3600 + m * 60 + s,
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
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
  const { seconds, date } = getUKParts();
  if (seconds < DRAW_CUTOFF) {
    return { phase: 'drawing', countdown: formatSeconds(DRAW_CUTOFF - seconds), ukDate: date };
  }
  if (seconds < VOTE_CUTOFF) {
    return { phase: 'voting', countdown: formatSeconds(VOTE_CUTOFF - seconds), ukDate: date };
  }
  return { phase: 'results', countdown: '', ukDate: date };
}

export function usePhaseTimer(): PhaseTimer {
  const [state, setState] = useState<PhaseTimer>(compute);

  useEffect(() => {
    const id = setInterval(() => {
      const next = compute();
      setState(prev =>
        prev.phase === next.phase && prev.countdown === next.countdown && prev.ukDate === next.ukDate
          ? prev
          : next
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return state;
}
