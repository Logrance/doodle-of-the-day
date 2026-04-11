import React, { useState } from 'react';
import {
  KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Image, ImageBackground, SafeAreaView, Platform
} from 'react-native';
import CowLoader from '../components/CowLoader';
import { auth, getCallableFunction } from '../firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type RootStackParamList = {
  CheckEmail: { email: string };
};

const friendlyError = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default: return 'Something went wrong. Please try again.';
  }
};

const SignUpScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; form?: string }>({});

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const createUserDocument = getCallableFunction('createUserDocument');

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!username.trim()) next.username = 'Username is required.';
    else if (username.trim().length < 2) next.username = 'Username must be at least 2 characters.';
    if (!email) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Please enter a valid email.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredentials.user;
      await sendEmailVerification(user);
      if (createUserDocument) {
        await createUserDocument({ username: username.trim(), email: user.email, userId: user.uid });
      }
      navigation.navigate('CheckEmail', { email });
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
        <ImageBackground source={require('../assets/loginbackground5.jpg')} style={styles.background}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoCircle}>
              <Image source={require('../assets/cow.png')} style={styles.logoImage} resizeMode="cover" />
            </View>

            <View style={styles.form}>
              <Text style={styles.heading}>Create account</Text>

              {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

              <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                onChangeText={text => { setUsername(text); setErrors(e => ({ ...e, username: undefined })); }}
                style={[styles.input, errors.username && styles.inputError]}
                placeholder="Choose a username"
                placeholderTextColor="#888"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={text => { setEmail(text); setErrors(e => ({ ...e, email: undefined, form: undefined })); }}
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="you@example.com"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordRow, errors.password && styles.inputError]}>
                <TextInput
                  value={password}
                  onChangeText={text => { setPassword(text); setErrors(e => ({ ...e, password: undefined })); }}
                  style={styles.passwordInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#888"
                  secureTextEntry={!showPassword}
                />
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color="#555"
                  onPress={() => setShowPassword(p => !p)}
                />
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? <CowLoader size={20} /> : <Text style={styles.buttonText}>Create Account</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60 },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    marginBottom: 32,
  },
  logoImage: { width: 130, height: 130, marginTop: -10, transform: [{ translateX: -4 }] },
  form: { width: '80%' },
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#111', marginBottom: 16 },
  label: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#222', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: 'rgba(224,183,202,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    fontFamily: 'Poppins_400Regular',
  },
  inputError: { borderColor: '#c0392b' },
  errorText: { color: '#c0392b', fontSize: 12, marginTop: 4, fontFamily: 'Poppins_400Regular' },
  formError: {
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    color: '#c0392b',
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224,183,202,0.6)',
    paddingHorizontal: 15,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontFamily: 'Poppins_400Regular' },
  button: {
    backgroundColor: 'rgba(2,52,72,0.8)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: 'white' },
});
