import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, getCallableFunction } from '../firebaseConfig';

export interface UserStats {
  username: string;
  currentStreak: number;
  longestStreak: number;
  winCount: number;
  paletteAvailable: boolean;
  freezesAvailable: number;
}

const DEFAULT_STATS: UserStats = {
  username: '',
  currentStreak: 0,
  longestStreak: 0,
  winCount: 0,
  paletteAvailable: false,
  freezesAvailable: 0,
};

const SCHEMA_VERSION = 2;
const cacheKey = (uid: string) => `userStats:v${SCHEMA_VERSION}:${uid}`;

const isValidStats = (v: unknown): v is UserStats =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as UserStats).username === 'string' &&
  typeof (v as UserStats).currentStreak === 'number' &&
  typeof (v as UserStats).longestStreak === 'number' &&
  typeof (v as UserStats).winCount === 'number' &&
  typeof (v as UserStats).paletteAvailable === 'boolean' &&
  typeof (v as UserStats).freezesAvailable === 'number';

export function useCachedUserStats() {
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);

  const refresh = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const getUserStats = getCallableFunction('getUserStats');
      const response = (await getUserStats({})) as { data: UserStats };
      setStats(response.data);
      AsyncStorage.setItem(cacheKey(uid), JSON.stringify(response.data)).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const cached = await AsyncStorage.getItem(cacheKey(uid));
        if (cached && !cancelled) {
          const parsed = JSON.parse(cached);
          if (isValidStats(parsed)) setStats(parsed);
        }
      } catch {}
      if (!cancelled) refresh();
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { stats, refresh };
}
