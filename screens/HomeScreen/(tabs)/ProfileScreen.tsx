import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, ImageBackground, Dimensions, SafeAreaView, ScrollView } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Welcome: undefined;
  UserDrawingsScreen: undefined;
  WinnerDrawingsScreen: undefined;
  Deets: undefined;
  LeaderboardScreen: undefined;
};


const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();


  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigation.replace('Welcome');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const { height: screenHeight } = Dimensions.get('window');


  const isSmallScreen = screenHeight < 667;


  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={require('../../../assets/profilebackground11.jpg')} 
        style={styles.backgroundImage}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topTextContainer}>
            <View style={[styles.logoCircle, { width: isSmallScreen ? 100 : 130, height: isSmallScreen ? 100 : 130, borderRadius: (isSmallScreen ? 100 : 130) / 2 }]}>
              <Image
                source={require('../../../assets/cow.png')}
                style={[styles.logoImage, { transform: [{ translateX: isSmallScreen ? -6 : -12 }] }]}
                resizeMode="cover"
              />
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.titleText}>Doodle</Text>
              <Text style={styles.titleText}>of the Day</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('Deets')} style={styles.buttonSecondary}>
              <Text style={styles.buttonText}>Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('WinnerDrawingsScreen')} style={styles.buttonSecondary}>
              <Text style={styles.buttonText}>My winners</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('UserDrawingsScreen')} style={styles.buttonSecondary}>
              <Text style={styles.buttonText}>My drawings</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('LeaderboardScreen')} style={styles.buttonPrimary}>
              <Text style={[styles.buttonText, { color: 'white' }]}>Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignOut} style={styles.buttonGhost}>
              <Text style={styles.buttonText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const buttonBase = {
  width: '92%' as const,
  height: 56,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  borderRadius: 12,
  marginTop: 12,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1, resizeMode: 'cover' },
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
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%', alignSelf: 'center' },
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
});
