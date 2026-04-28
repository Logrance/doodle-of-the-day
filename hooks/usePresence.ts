import { useEffect, useState, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { getCallableFunction } from '../firebaseConfig';

export type Presence = {
  doodlersToday: number;
  votesToday: number;
};

export function usePresence(): { presence: Presence; refresh: () => void } {
  const [presence, setPresence] = useState<Presence>({ doodlersToday: 0, votesToday: 0 });
  const isFocused = useIsFocused();

  const refresh = useCallback(async () => {
    try {
      const getPresence = getCallableFunction('getPresence');
      const response = await getPresence({}) as { data: Presence };
      setPresence(response.data);
    } catch (error) {}
  }, []);

  useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused, refresh]);

  return { presence, refresh };
}
