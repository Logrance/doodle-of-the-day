import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      <LinearGradient colors={['#012232', '#023448', '#056a8a']} style={styles.background}>
        <View style={styles.top}>
          <View style={styles.logoCircle}>
            <Image source={require('../assets/icon_bacon.png')} style={styles.logoImage} resizeMode="cover" />
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
      </LinearGradient>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#012232' },
  background: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
  top: { alignItems: 'center', marginTop: 40 },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  logoImage: { width: 160, height: 160 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 26, marginTop: 24, color: 'white' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  buttonContainer: { width: '80%', gap: 12 },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#023448' },
  buttonOutlineText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: 'white' },
});
