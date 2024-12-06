import { useNavigation } from '@react-navigation/core';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View , Image, ImageBackground, Alert} from 'react-native';
import { auth, getCallableFunction } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
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

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
};

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

    // Validation function
    const validateFields = (): boolean => {
      if (!email || !password || !username) {
        Alert.alert("Error", "All fields are required.");
        return false;
      }
      return true;
    };


const handleSignUp = async () => {
  if (!validateFields()) return;

  try {
    const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredentials.user;

    await sendEmailVerification(user);
    Alert.alert("Verification Sent", "A verification email has been sent.");

    await createUserDocument({
      username,
      email: user.email,
      userId: user.uid,
    });

  } catch (error: any) {
    alert(error.message);
  }
};


  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <ImageBackground 
      source={require('../assets/loginbackground5.jpg')} 
      style={styles.backgroundImage}
    >
      <View style={styles.iconContainer}>
      <Image 
        source={require('../assets/icon.png')}  
        style={styles.icon}
      />
      </View>
      <View style={styles.inputContainer}>
      <TextInput
            placeholder="Username (only required for registration)"
            value={username}
            onChangeText={text => setUsername(text)}
            style={styles.input}
            placeholderTextColor="black"
          />
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={text => setEmail(text)}
          style={styles.input}
          placeholderTextColor="black"
        />
        <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={text => setPassword(text)}
          style={styles.passwordInput}
          secureTextEntry={!showPassword}
          placeholderTextColor="black"
        />    
        <MaterialCommunityIcons
          name={showPassword ? 'eye-off' : 'eye'}
          size={24}
          color="black"
          style={styles.iconTwo}
          onPress={toggleShowPassword}
        />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleLogin}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSignUp}
          style={[styles.button, styles.buttonOutline]}
        >
          <Text style={styles.buttonOutlineText}>Register</Text>
        </TouchableOpacity>
      </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
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
  buttonOutline: {
    backgroundColor: 'transparent',
    marginTop: 5,
    borderColor: 'black',
    borderWidth: 2,
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
  icon: {
    width: 150,  
    height: 150,  
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
  backgroundImage: {
    flex: 1,  
    justifyContent: 'center',  
    alignItems: 'center',  
  },
});
