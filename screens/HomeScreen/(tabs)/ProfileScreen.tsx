import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, Image, ImageBackground } from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import { useNavigation, NavigationProp } from '@react-navigation/core';
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"; 
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


  //For word theme state
  const [word, setWord] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigation.replace('Login');
    } catch (error: any) {
      alert(error.message);
    }
  };

  //Popup logic

  useEffect(() => {
    const fetchWordAndCheckSubmission = async () => {
      try { 
        const themesTodaySnapshot = await getDocs(
          query(collection(db, 'themes_today'), orderBy('timestamp', 'desc'), limit(1))
        );
  
        if (!themesTodaySnapshot.empty) {
          const wordDoc = themesTodaySnapshot.docs[0];
          setWord(wordDoc.data().word);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const user = auth.currentUser;

        const drawingQuery = query(
          collection(db, 'drawings'),
          where('userId', '==', user.uid),
          where('date', '>=', today.getTime()),
          where("date", "<", today.getTime() + (24 * 60 * 60 * 1000))
        );

        const drawingSnapshot = await getDocs(drawingQuery);

        if (drawingSnapshot.empty) { 
          setIsVisible(true);
        } else {
          console.log("User has already submitted a drawing today!");
        }
        } else {
          console.log("No word document found today!");
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      }
    };
  
    fetchWordAndCheckSubmission();
  }, []);
  

  return (
    <View style={styles.container}>
      <ImageBackground 
      source={require('../../../assets/profilebackground7.png')} // Path to your image in the assets folder
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
      
      {/* Button to trigger the password reset */}
      <TouchableOpacity onPress={() => navigation.navigate('Deets')} style={styles.resetButton}>
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

              <Modal visible={isVisible} transparent={true} animationType="slide">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
                    <Text style={{ fontSize: 20 }}>Today's Word: {word}</Text>
                    <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.buttonModal}>
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
            </View>
        </Modal>  

    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  button: {
    backgroundColor: 'transparent',  // No background color
    width: '95%',  // Keep wider button
    height: 60,  // Taller button
    justifyContent: 'center',  // Center text vertically
    alignItems: 'center',
    borderColor: '#000',  // Black border
    borderWidth: 2,  // Define the border thickness
    marginTop: 20,  // Maintain margin for spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,  // Subtle shadow for depth
    shadowRadius: 4,
    //elevation: 5,  // Android elevation for shadow
  },
  buttonOther: {
    backgroundColor: 'rgba(224,183,202, 0.8)',
    width: '95%',  // Same size for uniformity
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    //borderRadius: 30,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    //elevation: 5,
  },
  buttonOtherTwo: {
    backgroundColor: 'rgba(2,52,72, 0.5)',
    width: '95%',  // Same size for uniformity
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    //borderRadius: 30,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    //elevation: 5,
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',  // Bold text for emphasis
    fontSize: 18,  // Larger text for better readability
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
    resetButton: {
      backgroundColor: 'rgba(170,170,170, 0.5)',
      width: '95%', 
      height: 60,
      justifyContent: 'center',
      alignItems: "center",
      //borderRadius: 30,
      marginTop: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      //elevation: 5,
    },
  buttonModal: {
    backgroundColor: 'rgba(2,52,72,0.7)',
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
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
    //backgroundColor: '#F8F8F8',
  },
  icon: {
    width: 100,   // Adjust the size as needed
    height: 100,  // Adjust the size as needed
    marginRight: 10,  // Space between the icon and text
  },
  backgroundImage: {
    flex: 1,  // Ensure the background image takes up the full screen
    resizeMode: 'cover',  // Make sure the image covers the entire background
  },
  cow: {
    width: 100,   // Adjust the size as needed
    height: 100,  // Adjust the size as needed
    marginRight: 10,  // Space between the icon and text
  },
});
