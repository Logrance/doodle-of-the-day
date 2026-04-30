import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { auth } from '../firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

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
      <LinearGradient colors={colors.authGradient} style={styles.background}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="email-check-outline" size={64} color={colors.navyAlpha80} />
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
      </LinearGradient>
    </SafeAreaView>
  );
};

export default CheckEmailScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '80%',
    maxWidth: 460,
    backgroundColor: colors.cardOverlay88,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: colors.textPrimary, marginTop: 16, marginBottom: 12 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  email: { fontFamily: 'Poppins_700Bold', color: colors.textPrimary },
  hint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  resendButton: { marginTop: 20 },
  resendText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
  resentText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.success, marginTop: 20 },
  button: {
    backgroundColor: colors.navyAlpha80,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: colors.white },
});
