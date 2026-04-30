import React, { useState } from 'react';
import {
  KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, SafeAreaView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const navigation = useNavigation();

  const handleSend = async () => {
    if (!email) { setEmailError('Email is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Please enter a valid email.'); return; }
    setEmailError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (error: any) {
      // Don't reveal whether the email exists — just show success either way
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <LinearGradient colors={colors.authGradient} style={styles.background}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.content}>
            {sent ? (
              <View style={styles.card}>
                <MaterialCommunityIcons name="email-check-outline" size={52} color={colors.navyAlpha80} />
                <Text style={styles.heading}>Check your inbox</Text>
                <Text style={styles.body}>
                  If an account exists for <Text style={styles.bold}>{email}</Text>, we've sent a password reset link.
                </Text>
                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                  <Text style={styles.buttonText}>Back to Log In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.heading}>Reset password</Text>
                <Text style={styles.body}>Enter your email and we'll send you a link to reset your password.</Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={text => { setEmail(text); setEmailError(''); }}
                  style={[styles.input, emailError && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.authBackground },
  background: { flex: 1 },
  backButton: { position: 'absolute', top: 16, left: 16, padding: 8, zIndex: 10 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '80%',
    maxWidth: 460,
    backgroundColor: colors.cardOverlay88,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: colors.textPrimary, marginTop: 12, marginBottom: 8 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  bold: { fontFamily: 'Poppins_700Bold', color: colors.textPrimary },
  label: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: colors.textPrimary, marginBottom: 4, marginTop: 12, alignSelf: 'flex-start' },
  input: {
    width: '100%',
    backgroundColor: colors.authInputBg,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    fontFamily: 'Poppins_400Regular',
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4, alignSelf: 'flex-start', fontFamily: 'Poppins_400Regular' },
  button: {
    backgroundColor: colors.navyAlpha80,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: colors.white },
});
