import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// One-time, dismissible feature-discovery tips ("coachmarks"). Each tip is
// keyed by a stable id; once dismissed we remember it locally so it never
// shows again. This is intentionally local-only (no backend round-trip) — a
// tip re-appearing after a reinstall is acceptable for a UI hint. Bump the
// STORAGE_KEY suffix to re-show every tip to all users (e.g. after a redesign).
const STORAGE_KEY = 'doodle.featureTips.seen.v1';

// Shared in-memory cache so a tip dismissed on one screen is immediately
// hidden everywhere without each hook instance re-reading storage.
let cache: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

function loadSeen(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        cache = new Set<string>(raw ? JSON.parse(raw) : []);
      } catch {
        cache = new Set<string>();
      }
      return cache;
    })();
  }
  return loadPromise;
}

export function useFeatureTip(tipId: string) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    loadSeen().then((seen) => {
      if (active) setVisible(!seen.has(tipId));
    });
    return () => {
      active = false;
    };
  }, [tipId]);

  const dismiss = useCallback(() => {
    setVisible(false);
    const seen = cache ?? new Set<string>();
    seen.add(tipId);
    cache = seen;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...seen])).catch(() => {});
  }, [tipId]);

  return { visible, dismiss };
}
