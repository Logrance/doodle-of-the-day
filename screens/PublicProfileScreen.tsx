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
import FeatureTip from '../components/FeatureTip';
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

type Favorite = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
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
  favorites?: Favorite[];
  viewerHasFavorited?: boolean;
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
  const [favBusy, setFavBusy] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const thumbSize = (Math.min(screenWidth, 600) - 32 - 16) / 3;

  const fetchProfile = async () => {
    const getPublicProfile = getCallableFunction('getPublicProfile') as (
      d: { userId: string }
    ) => Promise<{ data: PublicProfile }>;
    const res = await getPublicProfile({ userId });
    return res.data;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProfile();
        if (active) setProfile(data);
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

  const handleToggleFavorite = async () => {
    if (!profile || favBusy) return;
    const wasFavorited = profile.viewerHasFavorited === true;
    // Optimistic update — flip the star immediately so the press feels
    // instant, instead of waiting on the callable + a refetch. Favouriting
    // doesn't change anything visible on the target's profile (the target's
    // favourites array is whom THEY favourited, not who favourited them),
    // so the local toggle is the only state that needs to move.
    setProfile({ ...profile, viewerHasFavorited: !wasFavorited });
    setFavBusy(true);
    try {
      const fn = getCallableFunction(wasFavorited ? 'removeFavorite' : 'addFavorite');
      await fn({ userId });
    } catch (e: any) {
      // Revert on failure (cap reached, blocked, network error, etc.).
      setProfile((p) => (p ? { ...p, viewerHasFavorited: wasFavorited } : p));
      Alert.alert(
        wasFavorited ? "Couldn't remove favourite" : "Couldn't add favourite",
        e?.message || 'Please try again.',
      );
    } finally {
      setFavBusy(false);
    }
  };

  const handleRemoveGalleryItem = (drawingId: string) => {
    if (!isSelf || !profile) return;
    Alert.alert(
      'Remove from gallery?',
      'This drawing will no longer appear on your public profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const current = (profile.gallery || []).map((g) => g.id);
            const next = current.filter((id) => id !== drawingId);
            try {
              const setGalleryDrawings = getCallableFunction('setGalleryDrawings');
              await setGalleryDrawings({ drawingIds: next });
              const fresh = await fetchProfile();
              setProfile(fresh);
            } catch (e: any) {
              Alert.alert("Couldn't remove", e?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleRemoveFavoriteSelf = (favId: string, favUsername: string | null) => {
    if (!isSelf) return;
    Alert.alert(
      `Remove ${favUsername || 'this user'}?`,
      "They'll no longer appear on your favourites.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const removeFavorite = getCallableFunction('removeFavorite');
              await removeFavorite({ userId: favId });
              const fresh = await fetchProfile();
              setProfile(fresh);
            } catch (e: any) {
              Alert.alert("Couldn't remove", e?.message || 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const openFavorite = (favId: string) => {
    navigation.push('PublicProfileScreen', { userId: favId });
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
  const favorites = profile.favorites ?? [];
  const hasFavorited = profile.viewerHasFavorited === true;
  const favAvatarSize = 64;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isSelf && (
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              disabled={favBusy}
              style={styles.topActionButton}
              hitSlop={12}
              accessibilityLabel={hasFavorited ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Ionicons
                name={hasFavorited ? 'star' : 'star-outline'}
                size={24}
                color={hasFavorited ? colors.navy : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={openOverflow} style={styles.topActionButton} hitSlop={12} accessibilityLabel="Report or block">
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        {isSelf && (
          <View style={styles.selfViewBanner}>
            <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
            <Text style={styles.selfViewBannerText}>This is how your profile looks to others</Text>
          </View>
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

        {!isSelf && !hasFavorited && (
          <FeatureTip
            tipId="favourite-this-doodler"
            style={styles.favouriteTip}
            title="Save your favourite doodlers"
            text="Tap the star to add this artist to your top 10 favourites — they'll show on your profile so you can find them again."
          />
        )}

        <Text style={styles.sectionTitle}>Featured doodles</Text>
        {gallery.length > 0 ? (
          <View style={styles.galleryGrid}>
            {gallery.map((item) => (
              <View
                key={item.id}
                style={[styles.thumbWrap, { width: thumbSize, height: thumbSize }]}
              >
                <TouchableOpacity
                  onPress={() => setSelectedImage(drawingImageUri(item))}
                  style={styles.thumbTouch}
                >
                  <Image source={{ uri: drawingImageUri(item) }} style={styles.thumb} />
                </TouchableOpacity>
                {isSelf && (
                  <TouchableOpacity
                    onPress={() => handleRemoveGalleryItem(item.id)}
                    style={styles.removeBadge}
                    hitSlop={8}
                    accessibilityLabel="Remove from gallery"
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.galleryEmpty}>
            {isSelf
              ? "You haven't featured any doodles yet — star drawings in My drawings to add them."
              : `${profile.username || 'This user'} hasn't featured any doodles yet.`}
          </Text>
        )}

        <Text style={[styles.sectionTitle, styles.favouritesSectionTitle]}>Favourite doodlers</Text>
        {favorites.length > 0 ? (
          <View style={styles.favouritesGrid}>
            {favorites.map((f) => (
              <View key={f.id} style={[styles.favItem, { width: favAvatarSize + 16 }]}>
                <TouchableOpacity onPress={() => openFavorite(f.id)} activeOpacity={0.7}>
                  {f.avatarUrl ? (
                    <Image
                      source={{ uri: f.avatarUrl }}
                      style={[styles.favAvatar, { width: favAvatarSize, height: favAvatarSize, borderRadius: favAvatarSize / 2 }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.favAvatar,
                        styles.favAvatarPlaceholder,
                        { width: favAvatarSize, height: favAvatarSize, borderRadius: favAvatarSize / 2 },
                      ]}
                    >
                      <Text style={styles.favAvatarLetter}>{(f.username || 'D')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.favLabel} numberOfLines={1}>{f.username || '—'}</Text>
                </TouchableOpacity>
                {isSelf && (
                  <TouchableOpacity
                    onPress={() => handleRemoveFavoriteSelf(f.id, f.username)}
                    style={styles.removeBadge}
                    hitSlop={8}
                    accessibilityLabel={`Remove ${f.username || 'user'} from favourites`}
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.galleryEmpty}>
            {isSelf
              ? "You haven't favourited anyone yet — tap the star on someone's profile to add them."
              : `${profile.username || 'This user'} hasn't favourited anyone yet.`}
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
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 8,
    paddingTop: 4,
    gap: 4,
  },
  topActionButton: {
    padding: 12,
  },
  selfViewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  selfViewBannerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  favouriteTip: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  favouritesSectionTitle: {
    marginTop: 24,
  },
  favouritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  favItem: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  favAvatar: {
    backgroundColor: colors.surfaceMuted,
  },
  favAvatarPlaceholder: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favAvatarLetter: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: colors.white,
  },
  favLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 80,
  },
  thumbTouch: {
    // Inner — clips the image to rounded corners. Keeping overflow:hidden
    // here (instead of on thumbWrap) lets the remove badge render outside
    // the thumbnail without being cut off.
    width: '100%', height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
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
    // Outer wrapper — positioning context for the remove badge and shadow
    // host. No overflow:hidden, otherwise the badge (which sits at the
    // top-right corner with negative offsets) gets clipped where it overlaps
    // the thumbnail.
    borderRadius: 12,
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
