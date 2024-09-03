import { useNavigation, NavigationProp } from '@react-navigation/core';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigation.replace('Login');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Email: {auth.currentUser?.email}</Text>
      <TouchableOpacity onPress={handleSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#0782F9',
    width: '60%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
