import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ImageBackground } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, getCallableFunction } from "../firebaseConfig";
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

type RootStackParamList = {
  Login: undefined;
};

type DeleteUserResponse = { message: string };


export default function Deets() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    //Password reset
    const user = auth.currentUser;
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isVerified, setIsVerified] = useState(false)

  const handlePasswordReset = async () => {
    if (user && user.email) {
      setIsResettingPassword(true);
      try {
        await sendPasswordResetEmail(auth, user.email);
        Alert.alert("Password Reset", `A password reset email has been sent to ${user.email}`);
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setIsResettingPassword(false);
      }
    } else {
      Alert.alert("Error", "User email not found. Please try again.");
    }
  };


  const handleDeleteAccount = async () => {
    if (user) {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const deleteUserAccount = getCallableFunction("deleteUserAccount");
                const response = await deleteUserAccount({});
                
                const data = response.data as DeleteUserResponse;
                setIsDeletingAccount(true);
  
                Alert.alert("Account Deleted", data.message);
  
                await auth.signOut();
                navigation.replace('Login');
              } catch (error: any) {
                Alert.alert("Error", error.message || "Error deleting account");
              }
            }
          }
        ]
      );
    } else {
      Alert.alert("Error", "User not found. Please try again.");
    }
  };


    useEffect(() => {
      const checkVerificationStatus = async () => {
        try {
          const updateUserVerification = getCallableFunction("updateUserVerification");
          await updateUserVerification({});
          setIsVerified(true);
        } catch (error: any) {
        }
      };
    
      checkVerificationStatus();
    }, []);

  return (
    <View style={styles.container}>
       <ImageBackground 
      source={require('../assets/deetsbackground4.jpg')} 
      style={styles.backgroundImage}
    >
      <Text style={{ fontFamily: 'Poppins_700Bold' }}>Email: {auth.currentUser?.email}</Text>
      <Text style={{ fontFamily: 'Poppins_700Bold', marginTop: 5 }}>Verified: {isVerified ? 
      (<MaterialIcons name="verified-user" size={24} color="black" />)
      : (<AntDesign name="exclamationcircleo" size={24} color="black" />

      )}</Text>
      
      <TouchableOpacity
        onPress={handlePasswordReset}
        style={styles.resetButton}
        disabled={isResettingPassword}
      >
        <Text style={{ fontFamily: 'Poppins_700Bold' }}>
          Forgotten password? {isResettingPassword ? "Sending reset email..." : "Click here to reset"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
                onPress={handleDeleteAccount}
                style={styles.deleteButton}
                disabled={isDeletingAccount}
            >
                <Text style={styles.buttonText}>
                    {isDeletingAccount ? "Deleting Account..." : "Delete Account"}
                </Text>
            </TouchableOpacity>
            </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resetButton: {
    marginTop: 20,
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,   
    borderColor: 'grey',  
    borderStyle: 'dashed',
  },
  deleteButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(2,52,72,0.7)',
},
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: 'white',
  },
  backgroundImage: {
    flex: 1,  
    resizeMode: 'cover',
    justifyContent: 'center',  
    alignItems: 'center',  
  },
});
