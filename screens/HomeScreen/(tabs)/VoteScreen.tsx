import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, FlatList, Text, Modal, TouchableNativeFeedback, Platform, Alert } from 'react-native';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, increment, getDoc, setDoc, limit } from "firebase/firestore"; 
import { db, auth, getCallableFunction } from '../../../firebaseConfig';
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

type Drawing = {
  id: string;
  roomId: string;
  userId: string;
  date: number;
  votes: number;
};

type GetRoomDrawingsResponse = {
  drawings: Drawing[];
};

export default function VoteScreen() {

  const [drawingInfo, setDrawingInfo] = useState<any | undefined>(null)

  //For word theme state
  const [word, setWord] = useState<string | null>(null);

  //Modal logic
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setModalVisible(false);
  };

  const fetchData = async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("No user is signed in");
        }

        // Ensure TypeScript knows getRoomDrawings is a callable function with specific response type
        const getRoomDrawings = getCallableFunction("getRoomDrawings") as (
            data: { date: string; userId: string }
        ) => Promise<{ data: GetRoomDrawingsResponse }>;

        // Call the function with parameters
        const response = await getRoomDrawings({
            date: new Date().toISOString(),
            userId: user.uid,
        });

        // Now TypeScript knows response.data is of type GetRoomDrawingsResponse
        const drawings = response.data.drawings;
        setDrawingInfo(drawings);

    } catch (error) {
        console.error("Error fetching drawings:", error);
    }
};

  /*const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No user is signed in");
      }


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch the user's drawing to get the roomId
    const userDrawingRef = query(
      collection(db, "drawings"),
      where("userId", "==", user.uid),
      where("date", ">=", today.getTime()),
      where("date", "<", today.getTime() + (24 * 60 * 60 * 1000))
    );
    
    const userDrawingSnapshot = await getDocs(userDrawingRef);

    if (userDrawingSnapshot.empty) {
      return;
    }

    const userDrawing = userDrawingSnapshot.docs[0].data();
    const userRoomId = userDrawing.roomId;

      const q = query(
        collection(db, "drawings"),
        where("roomId", "==", userRoomId),
        where("userId", "!=", user.uid),
        where("date", '>=', today.getTime()), 
        where('date', '<', today.getTime() + (24 * 60 * 60 * 1000)),
        orderBy("votes", "desc"),
        orderBy("userId", "desc")
      );

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
      } else {
        const drawingArray: any[] = [];
        querySnapshot.forEach((doc) => {
          drawingArray.push({ id: doc.id, ...doc.data() });
        });
        setDrawingInfo(drawingArray);
      }
    } catch (error) {
    }
  }; */

  // Function to handle flagging
  const handleFlag = async (drawingId: string, image: string) => {
    Alert.alert(
      "Flag Content",
      "Are you sure you want to flag this drawing for review?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Flag",
          style: "destructive",
          onPress: async () => {
            try {
              const flagRef = doc(collection(db, "flags"));
              await setDoc(flagRef, {
                drawingId,
                image,
                flaggedBy: auth.currentUser.uid,
                timestamp: new Date(),
              });
              alert("Drawing has been flagged for review.");
            } catch (error) {
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

// Function to handle share
const handleShare = async (image: string) => {
  // Convert base64 to a file
  const filename = `${FileSystem.cacheDirectory}shared-image.jpg`;
  await FileSystem.writeAsStringAsync(filename, image, { encoding: FileSystem.EncodingType.Base64 });

  // Share the file if available on device
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filename, {
      mimeType: 'image/jpg',
      dialogTitle: 'Share your drawing!',
    });
  } else {
    alert("Sharing is not available on this device");
  }
};


    useEffect(() => {
      const fetchWord = async () => {
        try { 
          const themesTodaySnapshot = await getDocs(
            query(collection(db, 'themes_today'), orderBy('timestamp', 'desc'), limit(1))
          );
    
          if (!themesTodaySnapshot.empty) {
            const wordDoc = themesTodaySnapshot.docs[0];
            setWord(wordDoc.data().word);
          } 
        } catch (error) {
        }
      };
    
      fetchWord();
    }, []);

  

 const handleVote = async (userId: string) => {
  const currentUser = auth.currentUser?.uid; 
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  if (!currentUser) {
    return;
  }

  try {
    // Reference to the user's vote for today
    const voteRef = doc(db, "user_votes", `${currentUser}_${today.toISOString().split('T')[0]}`);

    // Fetch user's vote for today
    const voteDoc = await getDoc(voteRef);

    // If the user has already voted today
    if (voteDoc.exists()) {
      return;
    }

    // If user hasn't voted today, proceed to cast vote
    const drawingRef = doc(db, "drawings", userId);
    await updateDoc(drawingRef, {
      votes: increment(1)
    });

    // Store the vote in 'user_votes' collection
    await setDoc(voteRef, {
      userId: currentUser,
      drawingId: userId,
      voteDate: today
    });

    // Fetch updated data after voting
    fetchData();
  } catch (error) {
  }
};

useEffect(() => {
  fetchData();
 }, [])


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
    <View style={styles.themeContainer}>
          <Text style={{ fontFamily: 'PressStart2P_400Regular', textAlign: 'center', lineHeight: 22 }}>Theme of the Day: {"\n"}{word || "Loading..."}</Text>
        </View>
        <FlatList
          data={drawingInfo}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.drawingContainer}>
              <TouchableOpacity onPress={() => openModal(`data:image/png;base64,${item.image}`)}>
              <Image 
                source={{ uri: `data:image/png;base64,${item.image}` }} 
                style={styles.image}
              />
             
            </TouchableOpacity>
            <Text>{item.votes || 0}</Text>

            <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => handleFlag(item.id, item.image)} style={styles.buttonOther}>
          <Ionicons name="flag" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleVote(item.id)} style={styles.buttonVote}>
           <Text style={styles.buttonText}>Vote</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleShare(item.image)} style={styles.buttonOther}>
          <Entypo name="share" size={24} color="black" />
        </TouchableOpacity>
        </View>
      </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal} 
      >

  {Platform.OS === 'android' ? (
    <TouchableNativeFeedback onPress={closeModal}>
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          {selectedImage && (
            <TouchableNativeFeedback onPress={closeModal}>
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.enlargedImage} 
                resizeMode="contain"
              />
            </TouchableNativeFeedback>
          )}
        </View>
      </View>
    </TouchableNativeFeedback>
  ) : (
    <TouchableOpacity style={styles.modalBackground} onPress={closeModal}>
      <View style={styles.modalContainer}>
        {selectedImage && (
          <TouchableOpacity onPress={closeModal}>
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.enlargedImage} 
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )}
  </Modal>
</SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgb(224,183,202)',
    paddingHorizontal: 10,
  },
  drawingContainer: {
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    elevation: 5,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    padding: 10,
  },
  enlargedImage: {
    width: 400,
    height: 400,
    backgroundColor: 'white',
    resizeMode: 'contain',
  },
  buttonOther: {
    backgroundColor: 'white',
    padding:7,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 5,
    elevation: 5,
  },
  buttonVote: {
    backgroundColor: 'rgb(125,22,27)',
    padding:7,
    borderRadius: 10,
    alignContent: 'center',
    marginBottom: 5,
    marginHorizontal: 10,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    
  },
  themeContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    marginTop: 8,
  },
});
