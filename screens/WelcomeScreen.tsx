import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth } from '../firebaseConfig';
import { colors } from '../theme/colors';

type RootStackParamList = {
  HomeScreen: undefined;
  Login: undefined;
  SignUp: undefined;
};

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) navigation.replace('HomeScreen');
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.welcomeGradient} style={styles.background}>
        <View style={styles.top}>
          <View style={styles.logoCircle}>
            <Image source={require('../assets/icon_bacon.png')} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.title}>Doodle of the Day</Text>
          <Text style={styles.subtitle}>One theme. One doodle. Every day.</Text>
        </View>

        <View style={styles.previewContainer}>
          <View style={styles.previewRow}>
            <Text style={styles.previewEmoji}>🎨</Text>
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewTitle}>Draw the daily theme</Text>
              <Text style={styles.previewBody}>A fresh word drops each morning — you have until 14:00 UK to doodle.</Text>
            </View>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewEmoji}>🗳️</Text>
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewTitle}>Vote in your room</Text>
              <Text style={styles.previewBody}>Get matched with other doodlers and pick your favourite by 20:00.</Text>
            </View>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewEmoji}>🏆</Text>
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewTitle}>Win, keep your streak</Text>
              <Text style={styles.previewBody}>3-day streaks unlock the colour palette. Miss a day? Streak freezes have you covered.</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonOutline} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonOutlineText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navyDark },
  background: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  top: { alignItems: 'center', marginTop: 16 },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  logoImage: { width: 120, height: 120 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 26, marginTop: 18, color: colors.white },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.whiteAlpha75, marginTop: 6, textAlign: 'center' },
  previewContainer: {
    width: '100%',
    maxWidth: 460,
    gap: 14,
    marginVertical: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.whiteAlpha08,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  previewEmoji: {
    fontSize: 26,
  },
  previewTextWrap: {
    flex: 1,
  },
  previewTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: colors.white,
    marginBottom: 2,
  },
  previewBody: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.whiteAlpha75,
    lineHeight: 17,
  },
  buttonContainer: { width: '100%', maxWidth: 460, gap: 12 },
  button: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.whiteAlpha50,
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: colors.navy },
  buttonOutlineText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: colors.white },
});
