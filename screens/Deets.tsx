import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from "../firebaseConfig";

export default function Deets() {
    //Password reset
    const user = auth.currentUser;
    const [isResettingPassword, setIsResettingPassword] = useState(false);


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

  return (
    <View style={styles.container}>
      <Text style={{ fontFamily: 'Poppins_700Bold' }}>Email: {auth.currentUser?.email}</Text>
      
      {/* Button to trigger the password reset */}
      <TouchableOpacity
        onPress={handlePasswordReset}
        style={styles.resetButton}
        disabled={isResettingPassword}
      >
        <Text style={{ fontFamily: 'Poppins_700Bold' }}>
          Forgotten password? {isResettingPassword ? "Sending reset email..." : "Click here to reset"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resetButton: {
    marginTop: 20,
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,   
    borderColor: 'grey',  
    borderStyle: 'dashed',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
