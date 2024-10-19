import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
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
      <Text>Doodle 
            {"\n"}
            of the
            {"\n"}
            Day
      </Text>
      <TouchableOpacity onPress={handleSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>

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
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 10,
    backgroundColor: 'rgb(170,170,170)',
  },
  button: {
    backgroundColor: 'rgba(2,52,72,0.7)',
    width: 100,
    height: 100,
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonOther: {
    backgroundColor: 'rgba(125,22,27,0.8)',
    width: 100,
    height: 100,
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
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
    backgroundColor: 'rgb(206,151,132)',
    width: 100,
    height: 100,
    padding: 15,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 10,
  },
  buttonModal: {
    backgroundColor: 'rgba(2,52,72,0.7)',
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  }
});
