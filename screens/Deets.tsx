import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, getCallableFunction } from "../firebaseConfig";
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../theme/colors';

type RootStackParamList = {
  Welcome: undefined;
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
                navigation.replace('Welcome');
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
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.authGradient} style={styles.backgroundImage}>
        <View style={styles.card}>
          <Text style={styles.heading}>Account</Text>

          <View style={styles.row}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} style={styles.rowIcon} />
            <Text style={styles.rowText}>{auth.currentUser?.email}</Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons
              name={isVerified ? 'check-circle-outline' : 'alert-circle-outline'}
              size={20}
              color={isVerified ? colors.success : colors.danger}
              style={styles.rowIcon}
            />
            <Text style={[styles.rowText, { color: isVerified ? colors.success : colors.danger }]}>
              {isVerified ? 'Email verified' : 'Email not verified'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handlePasswordReset}
            style={styles.resetButton}
            disabled={isResettingPassword}
          >
            <Text style={styles.resetText}>
              {isResettingPassword ? 'Sending reset email...' : 'Reset password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
            disabled={isDeletingAccount}
          >
            <Text style={styles.deleteText}>
              {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '88%',
    maxWidth: 460,
    backgroundColor: colors.cardOverlay92,
    borderRadius: 16,
    padding: 28,
  },
  heading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: { marginRight: 10 },
  rowText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  resetButton: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.navyAlpha08,
    alignItems: 'center',
  },
  resetText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: colors.navy,
  },
  deleteButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
  },
  deleteText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: colors.danger,
  },
});
