import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CowLoader from '../components/CowLoader';
import { getCallableFunction } from '../firebaseConfig';
import { colors } from '../theme/colors';

type BlockedUser = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
};

const BlockedUsersScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  const load = useCallback(async () => {
    try {
      const getBlockedUsers = getCallableFunction('getBlockedUsers');
      const res = await getBlockedUsers({}) as { data: { blocked: BlockedUser[] } };
      setBlocked(res.data.blocked || []);
    } catch {
      setBlocked([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const handleUnblock = (item: BlockedUser) => {
    Alert.alert(
      `Unblock ${item.username || 'this user'}?`,
      "You'll be able to see each other's profiles again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              const unblockUser = getCallableFunction('unblockUser');
              await unblockUser({ userId: item.id });
              setBlocked((prev) => prev.filter((b) => b.id !== item.id));
            } catch (e: any) {
              Alert.alert('Unblock failed', e?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <CowLoader size={64} />
      </View>
    );
  }

  if (blocked.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No blocked users</Text>
        <Text style={styles.emptySubtitle}>
          People you block won't see each other's profiles.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {(item.username || 'D')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.username} numberOfLines={1}>
              {item.username || 'Unknown user'}
            </Text>
            <TouchableOpacity onPress={() => handleUnblock(item)} style={styles.unblockButton}>
              <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default BlockedUsersScreen;

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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted },
  avatarPlaceholder: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: colors.white },
  username: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  unblockButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.navyAlpha08,
  },
  unblockText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: colors.navy },
  emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.textPrimary, marginBottom: 8 },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22,
  },
});
