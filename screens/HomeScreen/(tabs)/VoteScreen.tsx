import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, FlatList, Text, Modal, Alert, TouchableWithoutFeedback, Dimensions, Platform } from 'react-native';
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
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
  const loaderSize = screenHeight < 667 ? 80 : 100;
  const cardWidth = screenWidth - 32;

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
        <Text style={styles.themeLabel}>Today's theme</Text>
        <Text style={styles.themeHeading}>{word || "Loading..."}</Text>
      </View>
    {loading ? (
          <CowLoader size={loaderSize} />
        ) : drawingInfo.length > 0 ? (
        <FlatList
          data={drawingInfo}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.drawingContainer, { width: cardWidth }]}>
              <TouchableOpacity onPress={() => openModal(`data:image/png;base64,${item.image}`)}>
                <Image
                  source={{ uri: `data:image/png;base64,${item.image}` }}
                  style={[styles.image, { width: cardWidth, height: cardWidth }]}
                />
              </TouchableOpacity>
              <View style={styles.cardFooter}>
                <Text style={styles.voteCount}>{item.votes || 0} {item.votes === 1 ? 'vote' : 'votes'}</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity onPress={() => handleFlag(item.id, item.image)} style={styles.buttonIcon}>
                    <Ionicons name="flag-outline" size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleVote(item.id)} style={styles.buttonVote}>
                    <Text style={styles.buttonText}>Vote</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleShare(item.image)} style={styles.buttonIcon}>
                    <Entypo name="share" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
    ) : (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Voting opens at 14:00</Text>
        <Text style={styles.emptySubtitle}>Come back then to vote on today's doodles.</Text>
      </View>
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
    backgroundColor: '#faf8f9',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  drawingContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    resizeMode: 'contain',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  voteCount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  buttonVote: {
    backgroundColor: '#023448',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
  themeContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  themeLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  themeHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    textAlign: 'center',
    color: '#111',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#111',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedImage: {
    width: Dimensions.get('window').width * 0.92,
    height: Dimensions.get('window').width * 0.92,
    backgroundColor: 'white',
    borderRadius: 12,
  },
});
