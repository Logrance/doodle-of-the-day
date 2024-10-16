import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Image, Modal, Button } from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import { useNavigation, NavigationProp } from '@react-navigation/core';
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"; 

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  UserDrawingsScreen: undefined;
  WinnerDrawingsScreen: undefined;
};


const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();


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
      <TouchableOpacity onPress={handleSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
      <Text>Email: {auth.currentUser?.email}</Text>
      <View style={styles.buttonSmall}>
        <Button
          title='Winners'
          onPress={() => navigation.navigate('WinnerDrawingsScreen')}
        />
      </View>
      <View style={styles.buttonSmall}>
        <Button
          title='My drawings'
          onPress={() => navigation.navigate('UserDrawingsScreen')}
        />
      </View>

              <Modal visible={isVisible} transparent={true} animationType="slide">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
                    <Text style={{ fontSize: 20 }}>Today's Word: {word}</Text>
                    <Button title="Close" onPress={() => setIsVisible(false)} />
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
  drawingContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  buttonSmall: {
    margin: 20,
  }
});
