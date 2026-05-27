import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert,
  Dimensions, Modal, TouchableWithoutFeedback, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CowLoader from '../components/CowLoader';
import Badge from '../components/Badge';
import { auth, getCallableFunction } from '../firebaseConfig';
import { colors } from '../theme/colors';
import { hasUnlock, getStreakColor } from '../theme/unlocks';
import { drawingImageUri } from '../theme/drawingImage';

type GalleryItem = {
  id: string;
  imageUrl?: string;
  image?: string;
  theme?: string | null;
};

type PublicProfile = {
  available: boolean;
  blocked?: boolean;
  id?: string;
  username?: string | null;
  avatarUrl?: string | null;
  currentStreak?: number;
  longestStreak?: number;
  winCount?: number;
  profileLink?: string | null;
  gallery?: GalleryItem[];
};

const displayLink = (url: string) =>
  url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

type PublicProfileRoute = RouteProp<
  { PublicProfileScreen: { userId: string } },
  'PublicProfileScreen'
>;

const PublicProfileScreen: React.FC = () => {
  const route = useRoute<PublicProfileRoute>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;
  const isSelf = auth.currentUser?.uid === userId;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const thumbSize = (Math.min(screenWidth, 600) - 32 - 16) / 3;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const getPublicProfile = getCallableFunction('getPublicProfile') as (
          d: { userId: string }
        ) => Promise<{ data: PublicProfile }>;
        const res = await getPublicProfile({ userId });
        if (active) setProfile(res.data);
      } catch {
        if (active) setProfile({ available: false });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (profile?.username) navigation.setOptions({ title: profile.username });
  }, [profile?.username, navigation]);

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open link", 'This link could not be opened.');
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report profile',
      'Report this profile for review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              const reportUser = getCallableFunction('reportUser');
              await reportUser({ reportedUserId: userId, type: 'profile' });
              Alert.alert('Thanks', 'This profile has been reported.');
            } catch (e: any) {
              Alert.alert('Report failed', e?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    Alert.alert(
      `Block ${profile?.username || 'this user'}?`,
      "You won't see each other's profiles.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const blockUser = getCallableFunction('blockUser');
              await blockUser({ userId });
              Alert.alert('Blocked', `You blocked ${profile?.username || 'this user'}.`);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Block failed', e?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const openOverflow = () => {
    Alert.alert(profile?.username || 'Profile', undefined, [
      { text: 'Report profile', onPress: handleReport },
      { text: 'Block user', style: 'destructive', onPress: handleBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <CowLoader size={80} />
      </View>
    );
  }

  if (!profile || !profile.available) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Profile unavailable</Text>
        <Text style={styles.emptySubtitle}>
          {profile?.blocked
            ? "This profile can't be shown."
            : "This user's profile could not be loaded."}
        </Text>
      </View>
    );
  }

  const streak = profile.currentStreak ?? 0;
  const gallery = profile.gallery ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isSelf && (
          <TouchableOpacity onPress={openOverflow} style={styles.overflowButton} hitSlop={12} accessibilityLabel="Report or block">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.identityBlock}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>{(profile.username || 'D')[0].toUpperCase()}</Text>
            </View>
          )}
          {profile.username ? <Text style={styles.usernameText}>{profile.username}</Text> : null}
          {profile.profileLink ? (
            <TouchableOpacity
              onPress={() => openLink(profile.profileLink as string)}
              style={styles.linkRow}
              activeOpacity={0.7}
            >
              <Ionicons name="link-outline" size={14} color={colors.navy} />
              <Text style={styles.linkText} numberOfLines={1}>
                {displayLink(profile.profileLink)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statValue, { color: getStreakColor(streak) ?? colors.navy }]}>{streak}</Text>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={styles.statValue}>{profile.winCount ?? 0}</Text>
            <Text style={styles.statLabel}>{(profile.winCount ?? 0) === 1 ? 'win' : 'wins'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statValue}>{profile.longestStreak ?? 0}</Text>
            <Text style={styles.statLabel}>best streak</Text>
          </View>
        </View>

        {hasUnlock(streak, 'doodlerBadge') && (
          <View style={styles.badgeRow}>
            <Badge label="Doodler" />
            {hasUnlock(streak, 'veteran') && <Badge label="Veteran" />}
            {hasUnlock(streak, 'master') && <Badge label="Master" variant="gold" />}
          </View>
        )}

        <Text style={styles.sectionTitle}>Featured doodles</Text>
        {gallery.length > 0 ? (
          <View style={styles.galleryGrid}>
            {gallery.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedImage(drawingImageUri(item))}
                style={[styles.thumbWrap, { width: thumbSize, height: thumbSize }]}
              >
                <Image source={{ uri: drawingImageUri(item) }} style={styles.thumb} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.galleryEmpty}>
            {profile.username || 'This user'} hasn't featured any doodles yet.
          </Text>
        )}
      </ScrollView>

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
          <View style={styles.modalBackground}>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.enlargedImage} resizeMode="contain" />
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default PublicProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, backgroundColor: colors.surfaceAlt,
  },
  scrollContent: { paddingBottom: 40 },
  overflowButton: {
    alignSelf: 'flex-end',
    padding: 12,
    marginRight: 8,
    marginTop: 4,
  },
  identityBlock: { alignItems: 'center', marginTop: 4, marginBottom: 20, paddingHorizontal: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceMuted, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: 'Poppins_700Bold', fontSize: 36, color: colors.white },
  usernameText: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: colors.textPrimary },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    maxWidth: '80%',
  },
  linkText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.navy },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 20,
    marginBottom: 20, paddingVertical: 16, paddingHorizontal: 8,
    shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statEmoji: { fontSize: 22, marginBottom: 2 },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: colors.navy },
  statLabel: {
    fontFamily: 'Poppins_400Regular', fontSize: 11, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 40, backgroundColor: colors.borderStrong },
  badgeRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
    paddingHorizontal: 20, marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold', fontSize: 14, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginHorizontal: 20, marginBottom: 12,
  },
  galleryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16,
  },
  thumbWrap: {
    borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface,
    shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  thumb: { width: '100%', height: '100%', resizeMode: 'contain' },
  galleryEmpty: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textMuted,
    textAlign: 'center', paddingHorizontal: 32, marginTop: 8,
  },
  emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.textPrimary, marginBottom: 8 },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22,
  },
  modalBackground: {
    flex: 1, backgroundColor: colors.scrim85, justifyContent: 'center', alignItems: 'center',
  },
  enlargedImage: {
    width: Math.min(Dimensions.get('window').width * 0.92, 600),
    height: Math.min(Dimensions.get('window').width * 0.92, 600),
    backgroundColor: colors.surface, borderRadius: 12,
  },
});
