import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, SafeAreaView, ScrollView, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, getCallableFunction } from '../../../firebaseConfig';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';

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
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [winCount, setWinCount] = useState(0);
  const [freezesAvailable, setFreezesAvailable] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const getUserStats = getCallableFunction('getUserStats');
        const response = await getUserStats({}) as { data: { currentStreak: number; longestStreak: number; winCount: number; freezesAvailable: number } };
        setCurrentStreak(response.data.currentStreak);
        setLongestStreak(response.data.longestStreak);
        setWinCount(response.data.winCount);
        setFreezesAvailable(response.data.freezesAvailable);
      } catch (error) {}
    };
    fetchStats();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigation.replace('Welcome');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Doodle with me on Doodle of the Day — one theme, one doodle, every day. https://doodleoftheday.app',
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const { height: screenHeight } = Dimensions.get('window');


  const isSmallScreen = screenHeight < 667;


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#faf7fb', '#f2e4ef', '#e8d8e8']} style={styles.backgroundImage}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topTextContainer}>
            <View style={[styles.logoCircle, { width: isSmallScreen ? 100 : 130, height: isSmallScreen ? 100 : 130, borderRadius: 24 }]}>
              <Image
                source={require('../../../assets/icon_bacon.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.titleText}>Doodle</Text>
              <Text style={styles.titleText}>of the Day</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{currentStreak}</Text>
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

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('Deets')} style={styles.buttonSecondary}>
              <Ionicons name="person-circle-outline" size={22} color="#111" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('GalleryScreen')} style={styles.buttonSecondary}>
              <Ionicons name="images-outline" size={22} color="#111" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleInvite} style={styles.buttonSecondary}>
              <Ionicons name="person-add-outline" size={22} color="#111" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Invite a friend</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('LeaderboardScreen')} style={styles.buttonPrimary}>
              <Ionicons name="trophy-outline" size={22} color="white" style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: 'white' }]}>Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignOut} style={styles.buttonGhost}>
              <Ionicons name="log-out-outline" size={22} color="#111" style={styles.buttonIcon} />
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
    color: '#111',
    lineHeight: 30,
  },
  logoCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
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
    color: '#023448',
  },
  statLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#ddd',
  },
  freezeNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  buttonContainer: { flex: 1, alignItems: 'center' },
  buttonSecondary: {
    ...buttonBase,
    backgroundColor: 'rgba(224,183,202,0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPrimary: {
    ...buttonBase,
    backgroundColor: 'rgba(2,52,72,0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonGhost: {
    ...buttonBase,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#333',
  },
  buttonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#111',
  },
  buttonIcon: {
    marginRight: 10,
  },
});
