import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CowLoader from '../components/CowLoader';
import { getCallableFunction } from '../firebaseConfig';
import { colors } from '../theme/colors';

type Favouriter = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: number;
};

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return new Date(ms).toLocaleDateString();
}

const FavouritersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [favouriters, setFavouriters] = useState<Favouriter[]>([]);

  const load = useCallback(async () => {
    try {
      const getFavouriters = getCallableFunction('getFavouriters');
      const res = await getFavouriters({}) as { data: { favouriters: Favouriter[] } };
      setFavouriters(res.data.favouriters || []);
    } catch {
      setFavouriters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark read on mount — the unread badge clears once stats refresh next.
  useEffect(() => {
    setLoading(true);
    load();
    const markFavouritersRead = getCallableFunction('markFavouritersRead');
    markFavouritersRead({}).catch(() => {});
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <CowLoader size={64} />
      </View>
    );
  }

  if (favouriters.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No favouriters yet</Text>
        <Text style={styles.emptySubtitle}>
          When someone adds you to their favourites, they'll show up here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favouriters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.push('PublicProfileScreen', { userId: item.id })}
            activeOpacity={0.7}
            style={styles.row}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {(item.username || 'D')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.body}>
              <Text style={styles.username} numberOfLines={1}>
                {item.username || 'Unknown user'}
              </Text>
              <Text style={styles.subtitle}>added you to their favourites</Text>
              <Text style={styles.timestamp}>{formatRelative(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default FavouritersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, backgroundColor: colors.surfaceAlt,
  },
  listContent: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceMuted },
  avatarPlaceholder: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.white },
  body: { flex: 1, marginLeft: 12 },
  username: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: colors.textPrimary },
  subtitle: {
    fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.textMuted,
    marginTop: 1,
  },
  timestamp: {
    fontFamily: 'Poppins_400Regular', fontSize: 11, color: colors.textMuted,
    marginTop: 4,
  },
  emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.textPrimary, marginBottom: 8 },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22,
  },
});
