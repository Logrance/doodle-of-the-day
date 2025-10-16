import { useNavigation } from '@react-navigation/core';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View , Image, ImageBackground, Alert, Dimensions, SafeAreaView, Platform } from 'react-native';
import CowLoader from '../components/CowLoader';
import { auth, getCallableFunction } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type RootStackParamList = {
    HomeScreen: undefined;
    Login: undefined;
  };

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleShowPassword = () => setShowPassword(prev => !prev);

  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 667;

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const createUserDocument = getCallableFunction("createUserDocument");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
            navigation.replace("HomeScreen")
        }
    })

    return unsubscribe
  }, [])

  // Validation helpers
  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const validateForRegister = (): boolean => {
    if (!email || !password || !username) {
      Alert.alert('Missing fields', 'Please provide username, email and password.');
      return false;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password should be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const validateForLogin = (): boolean => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return false;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForRegister()) return;
    setLoading(true);
    try {
      const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredentials.user;

      await sendEmailVerification(user);
      Alert.alert('Verification Sent', 'A verification email has been sent. Please verify before logging in.');

      if (createUserDocument) {
        await createUserDocument({
          username,
          email: user.email,
          userId: user.uid,
        });
      }
    } catch (error: any) {
      Alert.alert('Registration failed', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateForLogin()) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert('Login failed', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Email required', 'Enter your email above to receive a password reset link.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Reset Sent', 'Password reset email sent. Check your inbox.');
    } catch (error: any) {
      Alert.alert('Reset failed', error?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ImageBackground 
          source={require('../assets/loginbackground5.jpg')} 
          style={styles.backgroundImage}
        >
          <View style={styles.iconContainer}>
            <View style={[styles.logoCircle, { width: isSmallScreen ? 120 : 160, height: isSmallScreen ? 120 : 160, borderRadius: (isSmallScreen ? 120 : 160) / 2 }]}>
              <Image
                source={require('../assets/cow.png')}
                style={[styles.logoImage, {
                  width: isSmallScreen ? 130 : 170,
                  height: isSmallScreen ? 130 : 170,
                  marginTop: isSmallScreen ? -10 : -14,
                  transform: [{ translateX: isSmallScreen ? -4 : -14 }],
                }]}
                resizeMode="cover"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Username (for registration)"
              value={username}
              onChangeText={text => setUsername(text)}
              style={styles.input}
              placeholderTextColor="#333"
              accessible
              accessibilityLabel="username"
            />

            <View style={styles.inputRow}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={text => setEmail(text)}
                style={[styles.input, styles.flexInput]}
                placeholderTextColor="#333"
                keyboardType="email-address"
                autoCapitalize="none"
                accessible
                accessibilityLabel="email"
              />
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={text => setPassword(text)}
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                placeholderTextColor="#333"
                accessible
                accessibilityLabel="password"
              />    
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#111"
                style={styles.iconTwo}
                onPress={toggleShowPassword}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleLogin}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? <CowLoader size={20} /> : <Text style={styles.buttonText}>Login</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignUp}
              style={[styles.button, styles.buttonOutline, loading && styles.buttonDisabledOutline]}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.buttonOutlineText}>Register</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResetPassword} style={styles.forgotButton} disabled={loading}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    width: '100%',
  },
  flexInput: {
    flex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224,183,202,0.5)',
    marginTop: 5,
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1, 
    paddingVertical: 10,
  },
  inputContainer: {
    width: '80%',
    marginTop: 200,
  },
  input: {
    backgroundColor: 'rgba(224,183,202,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 5,
  },
  buttonContainer: {
    width: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  button: {
    backgroundColor: 'rgba(2,52,72,0.5)',
    width: '100%',
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    marginTop: 5,
    borderColor: 'black',
    borderWidth: 2,
  },
  buttonDisabledOutline: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  buttonOutlineText: {
    color: 'black',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  iconTwo: {
    marginLeft: 10,
  },
  iconContainer: {
    position: 'absolute',
    top:50,
    alignItems: 'center',
    justifyContent: 'center',
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
  logoImage: {
    alignSelf: 'center',
  },
  forgotButton: {
    marginTop: 8,
  },
  forgotText: {
    color: '#111',
    textDecorationLine: 'underline',
  },
  backgroundImage: {
    flex: 1,  
    justifyContent: 'center',  
    alignItems: 'center',  
  },
});
