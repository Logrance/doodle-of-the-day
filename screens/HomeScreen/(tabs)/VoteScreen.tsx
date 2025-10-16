import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, FlatList, Text, Modal, Alert, TouchableWithoutFeedback, Dimensions } from 'react-native';
import CowLoader from '../../../components/CowLoader';
import { auth, db, getCallableFunction } from '../../../firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useIsFocused } from '@react-navigation/native';

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
  const { height: screenHeight } = Dimensions.get('window');
  const loaderSize = screenHeight < 667 ? 80 : 100;

  const [drawingInfo, setDrawingInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  //For word theme state
  const [word, setWord] = useState<string | null>(null);

  //Modal logic
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  //screen reload variable
  const isFocused = useIsFocused();

  const openModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setModalVisible(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("No user is signed in");
        }

        const getRoomDrawings = getCallableFunction("getRoomDrawings") as (
            data: { date: string; userId: string }
        ) => Promise<{ data: GetRoomDrawingsResponse }>;

        const response = await getRoomDrawings({
            date: new Date().toISOString(),
            userId: user.uid,
        });

        const drawings = response.data.drawings;
        setDrawingInfo(drawings);

    } catch (error) {
    } finally {
      setLoading(false);
  }
};

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
            const flagDrawing = getCallableFunction("flagDrawing");
            const response = await flagDrawing({ drawingId, image }) as { data: { message: string } };
            alert(response.data.message);
          } catch (error) {
            alert("Failed to flag drawing. Please try again later.");
          }
        },
      },
    ],
    { cancelable: true }
  );
};

// Function to handle voting
const handleVote = async (userId: string) => {
  const currentUser = auth.currentUser?.uid;
  if (!currentUser) {
    return;
  }

  try {
    const voteFunction = getCallableFunction("handleVote") as unknown as (
      data: { userId: string }
    ) => Promise<{ data: { message: string } }>;

    const response = await voteFunction({ userId });
    Alert.alert("Success", response.data.message);

    fetchData();
  } catch (error) {
    Alert.alert("Already voted");
  }
};

// Function to handle share
const handleShare = async (image: string) => {
  const filename = `${FileSystem.cacheDirectory}shared-image.jpg`;
  await FileSystem.writeAsStringAsync(filename, image, { encoding: FileSystem.EncodingType.Base64 });

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
  const unsubscribe = onSnapshot(
    query(
      collection(db, 'themes_today'),
      orderBy('timestamp', 'desc'),
      limit(1)
    ),
    (snapshot) => {
      if (!snapshot.empty) {
        const wordDoc = snapshot.docs[0];
        setWord(wordDoc.data().word);
      }
    },
    (error) => {
      console.error('Error fetching theme:', error);
    }
  );

  return () => unsubscribe();
}, []);

useEffect(() => {
  if (isFocused) {
    fetchData();
  }
 }, [isFocused])


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
    <View style={styles.themeContainer}>
          <Text style={styles.themeHeading}>{"\n"}{word || "Loading..."}</Text>
        </View>
    {loading ? ( 
          <CowLoader size={loaderSize} />
        ) : drawingInfo.length > 0 ? (
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
    ) : (
      <Text>Voting room open from 14:00 to 20:00 UK time</Text> 
  )}

      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal} 
      >

<TouchableWithoutFeedback onPress={closeModal}>
                  <View style={styles.modalBackground}>
                    {selectedImage && (
                      <Image
                        source={{ uri: selectedImage }}
                        style={styles.enlargedImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </TouchableWithoutFeedback>
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
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    
  },
  themeContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 50,
  },
  themeHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    textAlign: 'center',
    color: '#111',
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    marginTop: 8,
  },
});
