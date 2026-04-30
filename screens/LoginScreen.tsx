import React, { useState } from 'react';
import {
  KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Image, SafeAreaView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CowLoader from '../components/CowLoader';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type RootStackParamList = {
  HomeScreen: undefined;
  ForgotPassword: undefined;
};

const friendlyError = (code: string): string => {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential': return 'No account found with that email or password.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default: return 'Something went wrong. Please try again.';
  }
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!email) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Please enter a valid email.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const code = error?.code ?? '';
      setErrors({ form: friendlyError(code) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <LinearGradient colors={colors.authGradient} style={styles.background}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoCircle}>
              <Image source={require('../assets/icon_bacon.png')} style={styles.logoImage} resizeMode="cover" />
            </View>

            <View style={styles.form}>
              <Text style={styles.heading}>Welcome back</Text>

              {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={text => { setEmail(text); setErrors(e => ({ ...e, email: undefined, form: undefined })); }}
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordRow, errors.password && styles.inputError]}>
                <TextInput
                  value={password}
                  onChangeText={text => { setPassword(text); setErrors(e => ({ ...e, password: undefined, form: undefined })); }}
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={colors.textSecondary}
                  onPress={() => setShowPassword(p => !p)}
                />
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <CowLoader size={20} /> : <Text style={styles.buttonText}>Log In</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.authBackground },
  background: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60 },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 32,
  },
  logoImage: { width: 120, height: 120 },
  form: { width: '80%', maxWidth: 460 },
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: colors.textPrimary, marginBottom: 16 },
  label: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: colors.authInputBg,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    fontFamily: 'Poppins_400Regular',
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4, fontFamily: 'Poppins_400Regular' },
  formError: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    color: colors.danger,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.authInputBg,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontFamily: 'Poppins_400Regular' },
  forgotButton: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 24 },
  forgotText: { color: colors.textSecondary, fontFamily: 'Poppins_400Regular', fontSize: 13, textDecorationLine: 'underline' },
  button: {
    backgroundColor: colors.navyAlpha80,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: colors.white },
});
