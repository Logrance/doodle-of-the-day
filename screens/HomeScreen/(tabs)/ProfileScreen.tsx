import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, ImageBackground } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { useNavigation } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  UserDrawingsScreen: undefined;
  WinnerDrawingsScreen: undefined;
  Deets: undefined;
  LeaderboardScreen: undefined;
};


const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();


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
      <ImageBackground 
      source={require('../../../assets/profilebackground10.jpg')} 
      style={styles.backgroundImage}
    >
       <View style={styles.topTextContainer}>
      <Text style={{ fontFamily: 'PressStart2P_400Regular', fontSize: 25 }}>Doodle 
            {"\n"}
            of the
            {"\n"}
            Day
      </Text>
      <Image 
        source={require('../../../assets/icon.png')}  
        style={styles.icon}
      />
      </View>

  
      <View style={styles.buttonContainer}>
      
    
      <TouchableOpacity onPress={() => navigation.navigate('Deets')} style={styles.buttonDeets}>
        <Text style={styles.buttonText}>My deets</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('WinnerDrawingsScreen')} style={styles.buttonOther}>
        <Text style={styles.buttonText}>My winners</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('UserDrawingsScreen')} style={styles.buttonOther}>
        <Text style={styles.buttonText}>My drawings</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('LeaderboardScreen')} style={styles.buttonOtherTwo}>
        <Text style={styles.buttonText}>Leaderboard</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
      <Image 
        source={require('../../../assets/cow.png')}  
        style={styles.cow}
      />
      </View>
      </ImageBackground>

    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  button: {
    backgroundColor: 'transparent',  
    width: '95%', 
    height: 60,  
    justifyContent: 'center',  
    alignItems: 'center',
    borderColor: '#000',  
    borderWidth: 2,  
    marginTop: 20,  
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,  
    shadowRadius: 4,
  },
  buttonOther: {
    backgroundColor: 'rgba(224,183,202, 0.8)',
    width: '95%',  
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonOtherTwo: {
    backgroundColor: 'rgba(2,52,72, 0.5)',
    width: '95%', 
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',  
    fontSize: 18,  
    textTransform: 'uppercase',
  },
  drawingContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
    buttonDeets: {
      backgroundColor: 'rgba(170,170,170, 0.5)',
      width: '95%', 
      height: 60,
      justifyContent: 'center',
      alignItems: "center",
      marginTop: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
  topTextContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between', 
    marginTop: 50, 
    marginLeft: 15,
    marginBottom: 15,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  icon: {
    width: 100,   
    height: 100,
    marginRight: 10,  
  },
  backgroundImage: {
    flex: 1,  
    resizeMode: 'cover',  
  },
  cow: {
    width: 100,   
    height: 100,  
    marginRight: 10,  
  },
});
