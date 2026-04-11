import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, SafeAreaView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth } from '../firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type RootStackParamList = {
  Login: undefined;
  CheckEmail: { email: string };
};

const CheckEmailScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CheckEmail'>>();
  const { email } = route.params;
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      setResent(true);
    } catch (error: any) {
      Alert.alert('Error', 'Could not resend email. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={require('../assets/loginbackground5.jpg')} style={styles.background}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="email-check-outline" size={64} color="rgba(2,52,72,0.8)" />
          <Text style={styles.heading}>Check your email</Text>
          <Text style={styles.body}>
            We sent a verification link to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
          <Text style={styles.hint}>
            Tap the link in the email to verify your account, then come back and log in.
          </Text>

          {resent ? (
            <Text style={styles.resentText}>Email resent! Check your inbox.</Text>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              disabled={resending}
              style={styles.resendButton}
            >
              <Text style={styles.resendText}>
                {resending ? 'Sending...' : "Didn't get it? Resend"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Go to Log In</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default CheckEmailScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '80%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#111', marginTop: 16, marginBottom: 12 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#333', textAlign: 'center', lineHeight: 22 },
  email: { fontFamily: 'Poppins_700Bold', color: '#111' },
  hint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  resendButton: { marginTop: 20 },
  resendText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#333', textDecorationLine: 'underline' },
  resentText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'green', marginTop: 20 },
  button: {
    backgroundColor: 'rgba(2,52,72,0.8)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: 'white' },
});
