import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, SafeAreaView, ScrollView, Share, Alert, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Badge from '../../../components/Badge';
import { hasUnlock, getStreakColor, getNextUnlock, TIERS } from '../../../theme/unlocks';
import { useCachedUserStats } from '../../../hooks/useCachedUserStats';
import { auth, getCallableFunction } from '../../../firebaseConfig';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../theme/colors';
import FeatureTip from '../../../components/FeatureTip';

type RootStackParamList = {
  Welcome: undefined;
  UserDrawingsScreen: undefined;
  WinnerDrawingsScreen: undefined;
  GalleryScreen: { initialTab?: 'drawings' | 'winners' } | undefined;
  Deets: undefined;
  LeaderboardScreen: undefined;
};


const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { stats, refresh } = useCachedUserStats();
  const { username, avatarUrl, currentStreak, longestStreak, winCount, freezesAvailable, profileLink } = stats;
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [unlocksModalVisible, setUnlocksModalVisible] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const nextUnlock = getNextUnlock(currentStreak);

  const displayLink = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

  const openLinkModal = () => {
    setLinkInput(profileLink || '');
    setLinkModalVisible(true);
  };

  const saveLink = async (url: string) => {
    setSavingLink(true);
    try {
      const setProfileLink = getCallableFunction('setProfileLink');
      await setProfileLink({ url });
      await refresh();
      setLinkModalVisible(false);
    } catch (e: any) {
      Alert.alert('Link not saved', e?.message || 'Please try again.');
    } finally {
      setSavingLink(false);
    }
  };

  const handleEditAvatar = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to set an avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      setIsUploadingAvatar(true);
      try {
        const setAvatar = getCallableFunction('setAvatar');
        await setAvatar({ imageBase64: result.assets[0].base64 });
        refresh();
      } catch (error: any) {
        Alert.alert('Upload failed', error.message || 'Could not upload avatar.');
      } finally {
        setIsUploadingAvatar(false);
      }
    } catch (error: any) {
      const msg: string = error?.message ?? '';
      if (/native module|requireNativeModule|ExponentImagePicker/i.test(msg)) {
        Alert.alert('Update needed', 'Avatar uploads need the latest app version. Please update from TestFlight once the new build is available.');
      } else {
        Alert.alert('Avatar', msg || 'Could not open the photo picker.');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message:
          'Doodle with me on Doodle of the Day — one theme, one doodle, every day.\n\n' +
          'iPhone: https://apps.apple.com/app/id6739217458\n' +
          'Android: https://play.google.com/store/apps/details?id=com.doodleOfThe.day',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.authGradient} style={styles.backgroundImage}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.identityBlock}>
            <TouchableOpacity onPress={handleEditAvatar} activeOpacity={0.85} style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>{(username || 'D')[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                {isUploadingAvatar
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Ionicons name="camera" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>
            {username ? <Text style={styles.usernameText}>{username}</Text> : null}
            {profileLink ? (
              <TouchableOpacity onPress={openLinkModal} style={styles.linkRow} activeOpacity={0.7}>
                <Ionicons name="link-outline" size={14} color={colors.navy} />
                <Text style={styles.linkText} numberOfLines={1}>{displayLink(profileLink)}</Text>
                <Ionicons name="pencil" size={12} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={openLinkModal} style={styles.addLinkButton} activeOpacity={0.7}>
                <Ionicons name="add" size={16} color={colors.navy} />
                <Text style={styles.addLinkText}>Add a link</Text>
              </TouchableOpacity>
            )}
          </View>

          {!profileLink && (
            <FeatureTip
              tipId="profile-add-link"
              style={styles.linkTip}
              title="Showcase your work"
              text="Add a link to your profile so people can find your art, socials or website."
            />
          )}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={[styles.statValue, { color: getStreakColor(currentStreak) ?? colors.textPrimary }]}>{currentStreak}</Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🏆</Text>
              <Text style={styles.statValue}>{winCount}</Text>
              <Text style={styles.statLabel}>{winCount === 1 ? 'win' : 'wins'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⚡</Text>
              <Text style={styles.statValue}>{longestStreak}</Text>
              <Text style={styles.statLabel}>best streak</Text>
            </View>
          </View>

          <Text style={styles.freezeNote}>
            {freezesAvailable > 0
              ? `❄️ ${freezesAvailable} streak freeze ready — saves you if you miss a day`
              : '❄️ Earn a streak freeze every 7 days — saves you if you miss a day'}
          </Text>

          {hasUnlock(currentStreak, 'doodlerBadge') && (
            <View style={styles.badgeRow}>
              <Badge label="Doodler" />
              {hasUnlock(currentStreak, 'veteran') && <Badge label="Veteran" />}
              {hasUnlock(currentStreak, 'master') && <Badge label="Master" variant="gold" />}
            </View>
          )}

          <TouchableOpacity onPress={() => setUnlocksModalVisible(true)} style={styles.nextUnlockRow} activeOpacity={0.7}>
            <Text style={styles.nextUnlockText}>
              {nextUnlock
                ? `🎯 ${nextUnlock.label} in ${nextUnlock.threshold - currentStreak} ${nextUnlock.threshold - currentStreak === 1 ? 'day' : 'days'}`
                : '🏆 All unlocks earned'}
            </Text>
            <Text style={styles.nextUnlockSee}>See all</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('Deets')} style={styles.buttonSecondary}>
              <Ionicons name="person-circle-outline" size={22} color={colors.textPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('GalleryScreen')} style={styles.buttonSecondary}>
              <Ionicons name="images-outline" size={22} color={colors.textPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleInvite} style={styles.buttonSecondary}>
              <Ionicons name="person-add-outline" size={22} color={colors.textPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Invite a friend</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('LeaderboardScreen')} style={styles.buttonPrimary}>
              <Ionicons name="trophy-outline" size={22} color={colors.white} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: colors.white }]}>Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignOut} style={styles.buttonGhost}>
              <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>

      <Modal visible={unlocksModalVisible} transparent animationType="fade" onRequestClose={() => setUnlocksModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setUnlocksModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Unlocks</Text>
                <Text style={styles.modalSubtitle}>Earned by keeping your daily streak</Text>
                {TIERS.map(tier => {
                  const earned = currentStreak >= tier.threshold;
                  const remaining = tier.threshold - currentStreak;
                  return (
                    <View key={tier.id} style={styles.tierRow}>
                      <View style={styles.tierMark}>
                        <Ionicons
                          name={earned ? 'checkmark-circle' : 'lock-closed-outline'}
                          size={20}
                          color={earned ? colors.success : colors.textMuted}
                        />
                      </View>
                      <View style={styles.tierBody}>
                        <Text style={[styles.tierLabel, earned && styles.tierLabelEarned]}>{tier.label}</Text>
                        <Text style={styles.tierDescription}>{tier.description}</Text>
                      </View>
                      <Text style={styles.tierMeta}>
                        {earned ? `${tier.threshold}d` : `${remaining}d to go`}
                      </Text>
                    </View>
                  );
                })}
                <TouchableOpacity onPress={() => setUnlocksModalVisible(false)} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={linkModalVisible} transparent animationType="fade" onRequestClose={() => setLinkModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setLinkModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Your link</Text>
                <Text style={styles.modalSubtitle}>
                  Add a website or social link for others to find your work.
                </Text>
                <TextInput
                  style={styles.linkInput}
                  value={linkInput}
                  onChangeText={setLinkInput}
                  placeholder="yourwebsite.com"
                  placeholderTextColor={colors.textPlaceholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!savingLink}
                />
                <TouchableOpacity
                  onPress={() => saveLink(linkInput.trim())}
                  style={[styles.linkSaveButton, savingLink && { opacity: 0.6 }]}
                  disabled={savingLink}
                >
                  <Text style={styles.linkSaveText}>{savingLink ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
                {profileLink ? (
                  <TouchableOpacity onPress={() => saveLink('')} style={styles.modalCloseButton} disabled={savingLink}>
                    <Text style={[styles.modalCloseText, { color: colors.danger }]}>Remove link</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setLinkModalVisible(false)} style={styles.modalCloseButton}>
                    <Text style={styles.modalCloseText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const buttonBase = {
  width: '92%' as const,
  height: 56,
  flexDirection: 'row' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  borderRadius: 12,
  marginTop: 12,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1 },
  scrollContent: { paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  identityBlock: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceMuted,
  },
  avatarPlaceholder: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    color: colors.white,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    maxWidth: '80%',
  },
  linkText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.navy,
    flexShrink: 1,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  addLinkText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: colors.navy,
  },
  linkInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  linkSaveButton: {
    backgroundColor: colors.navy,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  linkSaveText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: colors.white,
  },
  linkTip: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardOverlay75,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderStrong,
  },
  freezeNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  nextUnlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.cardOverlay75,
    borderRadius: 12,
  },
  nextUnlockText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  nextUnlockSee: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrim50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tierMark: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  tierBody: {
    flex: 1,
    paddingHorizontal: 4,
  },
  tierLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  tierLabelEarned: {
    color: colors.success,
  },
  tierDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  tierMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    minWidth: 64,
    textAlign: 'right',
    paddingTop: 2,
  },
  modalCloseButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  modalCloseText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.navy,
  },
  buttonContainer: { flex: 1, alignItems: 'center' },
  buttonSecondary: {
    ...buttonBase,
    backgroundColor: colors.authButtonBg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPrimary: {
    ...buttonBase,
    backgroundColor: colors.navy,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonGhost: {
    ...buttonBase,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  buttonIcon: {
    marginRight: 10,
  },
});
