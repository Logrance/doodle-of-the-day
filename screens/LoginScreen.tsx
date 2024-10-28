import { useNavigation, NavigationProp } from '@react-navigation/core';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View , Image, ImageBackground, Alert} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { setDoc, doc } from 'firebase/firestore';
import { center } from '@shopify/react-native-skia';

type RootStackParamList = {
    HomeScreen: undefined;
    Login: undefined;
  };

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');

 const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

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
      //sendEmailVerification(auth.currentUser)
      //console.log('Registered with:', user.email);

      try {
        await sendEmailVerification(auth.currentUser);
        Alert.alert(
          "Verification Sent",
          "A verification email has been sent. Please check your inbox and verify your email address.",
          [{ text: "OK" }]
        );

      } catch (verificationError) {
        console.error('Failed to send verification email:', verificationError);
        alert('Verification email could not be sent. Please check your email address or try again later.');
        return; // Exit the function if verification email fails
      }

      await setDoc(doc(db, 'users', user.uid), {
        username,
        email: user.email,
        userId: user.uid,
        winCount: 0,
        hasSeenTutorial: false,
        isVerified: false,
      });

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
      source={require('../assets/loginbackground3.jpg')} 
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
          />
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
    backgroundColor: 'rgba(224,183,202,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    //borderRadius: 10,
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
    //fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  buttonOutlineText: {
    color: 'black',
    //fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
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
