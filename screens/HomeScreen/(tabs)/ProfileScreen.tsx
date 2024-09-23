import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Image, Modal, Button } from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import { useNavigation, NavigationProp } from '@react-navigation/core';
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"; 

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
};

interface Winner {
  id: string;
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [winnerDrawing, setWinnerDrawing ] = useState<any | undefined>(null)

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

  //Winner render logic

  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("You are not logged in")
      }

      const q = query (
        collection(db, "winners"),
        where("userId", "==", user.uid)
      )

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("Nothing to render")
      } else {
        const winnerArray: Winner[] = [];
        querySnapshot.forEach((doc) => {
          winnerArray.push({ id: doc.id, ...doc.data()})
        });
        setWinnerDrawing(winnerArray);
      }
    } catch (error) {
      console.log("Error message", error)
    }
  };

  useEffect(() => {
    fetchData();
  }, [])

  //Popup logic

  useEffect(() => {
    const fetchWord = async () => {
      try {
        const themesTodaySnapshot = await getDocs(collection(db, 'themes_today'));
  
        if (!themesTodaySnapshot.empty) {
          // Pick the first document or handle it as needed
          const wordDoc = themesTodaySnapshot.docs[0]; // Or choose a random doc, etc.
          setWord(wordDoc.data().word);
          setIsVisible(true);
        } else {
          console.log("No themes found!");
        }
      } catch (error) {
        console.error("Error fetching themes:", error);
      }
    };
  
    fetchWord();
  }, []);
  

  return (
    <View style={styles.container}>
      <Text>Email: {auth.currentUser?.email}</Text>
      <TouchableOpacity onPress={handleSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
      <FlatList
          data={winnerDrawing}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.drawingContainer}>
            <Text>Winner: {item.id} {item.userId}</Text>
            <Image 
                source={{ uri: `data:image/png;base64,${item.image}` }} 
                style={styles.image}
                />
            </View>
                )}
                />
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
});
