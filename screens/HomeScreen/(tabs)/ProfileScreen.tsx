import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions, SafeAreaView, ScrollView, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoMark from '../../../components/LogoMark';
import Badge from '../../../components/Badge';
import { hasUnlock, getStreakColor } from '../../../theme/unlocks';
import { useCachedUserStats } from '../../../hooks/useCachedUserStats';
import { auth } from '../../../firebaseConfig';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../theme/colors';

type RootStackParamList = {
  Home: undefined;
  Welcome: undefined;
  UserDrawingsScreen: undefined;
  WinnerDrawingsScreen: undefined;
  GalleryScreen: { initialTab?: 'drawings' | 'winners' } | undefined;
  Deets: undefined;
  LeaderboardScreen: undefined;
};


const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { stats } = useCachedUserStats();
  const { currentStreak, longestStreak, winCount, freezesAvailable } = stats;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigation.replace('Welcome');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Doodle with me on Doodle of the Day — one theme, one doodle, every day. https://doodleoftheday.app',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const { height: screenHeight } = Dimensions.get('window');


  const isSmallScreen = screenHeight < 667;


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.authGradient} style={styles.backgroundImage}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topTextContainer}>
            <LogoMark size={isSmallScreen ? 100 : 130} />
            <View style={styles.titleBlock}>
              <Text style={styles.titleText}>Doodle</Text>
              <Text style={styles.titleText}>of the Day</Text>
            </View>
          </View>

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
  topTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
    gap: 20,
  },
  titleBlock: {
    alignItems: 'flex-start',
  },
  titleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 30,
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
