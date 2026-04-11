import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageBackground, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth } from '../firebaseConfig';

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
      <ImageBackground source={require('../assets/loginbackground5.jpg')} style={styles.background}>
        <View style={styles.top}>
          <View style={styles.logoCircle}>
            <Image source={require('../assets/cow.png')} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.title}>Doodle of the Day</Text>
          <Text style={styles.subtitle}>Draw. Share. Compete.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonOutline} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.buttonOutlineText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
  top: { alignItems: 'center', marginTop: 40 },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
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
  logoImage: { width: 170, height: 170, marginTop: -14, transform: [{ translateX: -14 }] },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 24, marginTop: 20, color: '#111' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#333', marginTop: 4 },
  buttonContainer: { width: '80%', gap: 10 },
  button: {
    backgroundColor: 'rgba(2,52,72,0.8)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#111',
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: 'white' },
  buttonOutlineText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#111' },
});
