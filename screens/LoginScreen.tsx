import { useNavigation, NavigationProp } from '@react-navigation/core';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View , Image, ImageBackground} from 'react-native';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
    HomeScreen: undefined;
    Login: undefined;
  };

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');


 const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
            navigation.replace("HomeScreen")
        }
    })

    return unsubscribe
  }, [])

  const handleSignUp = async () => {
    try {
      const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredentials.user;
      console.log('Registered with:', user.email);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const userCredentials = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredentials.user;
      console.log('Logged in with:', user.email);
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
      source={require('../assets/download.png')} 
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
          placeholder="Email"
          value={email}
          onChangeText={text => setEmail(text)}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={text => setPassword(text)}
          style={styles.input}
          secureTextEntry
        />
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
    //justifyContent: 'center',
    //alignItems: 'center',
    backgroundColor: 'rgb(224,183,202)',
  },
  inputContainer: {
    width: '80%',
    marginTop: 200,
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    //borderRadius: 10,
    marginTop: 5,
  },
  buttonContainer: {
    width: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  button: {
    backgroundColor: 'rgba(2,52,72,0.5)',
    width: '100%',
    padding: 15,
    //borderRadius: 10,
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
    fontWeight: '700',
    fontSize: 16,
  },
  buttonOutlineText: {
    color: 'black',
    fontWeight: '700',
    fontSize: 16,
  },
  icon: {
    width: 150,   // Adjust the size as needed
    height: 150,  // Adjust the size as needed
    //marginRight: 10,  // Space between the icon and text
  },
  iconContainer: {
    position: 'absolute',
    top:50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    flex: 1,  // Ensure the background image takes up the full screen
    //resizeMode: 'cover',
    justifyContent: 'center',  // Centers the content within the image
    alignItems: 'center',  // Make sure the image covers the entire background
  },
});
