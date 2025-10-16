import { collection, query, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";
import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, Modal, Button, TouchableWithoutFeedback } from "react-native";
import CowLoader from '../components/CowLoader';
import { db, auth } from "../firebaseConfig";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import ConfettiCannon from 'react-native-confetti-cannon';
import moment from 'moment';
import { Timestamp } from "firebase/firestore";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Entypo from '@expo/vector-icons/Entypo';

interface Winner {
    id: string;
    image: string;
    date: any;
  };

const WinnerDrawingsScreen = () => {


  const [winnerDrawing, setWinnerDrawing ] = useState<Winner[]>([])

     //Modal logic
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false); 

  const [lastVisible, setLastVisible] = useState(null);

  const openModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setModalVisible(false);
  };

  const closeWinnerModal = () => {
    setShowWinnerModal(false);
  };


  // Function to handle share

const handleShare = async (image: string) => {
  
  const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

  const filename = `${FileSystem.cacheDirectory}shared-image.png`;
  await FileSystem.writeAsStringAsync(filename, base64Image, { encoding: FileSystem.EncodingType.Base64 });


  // Share the file if available on device

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filename, {
      mimeType: 'image/png',
      dialogTitle: 'Share your drawing!',
    });
  } else {
    alert("Sharing is not available on this device");
  }
}; 

 
 
    //Winner render logic

    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }
  
        const first = query(
          collection(db, "winners"),
          where("userId", "==", user.uid),
          orderBy("date", "desc"),
          limit(5)
        );
  
        const querySnapshot = await getDocs(first);
        if (querySnapshot.empty) {
          setLoading(false);
          return;
        }
  
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastDoc);
  
        const winnerArray: Winner[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.date instanceof Timestamp ? data.date.toDate() : "";
  
          winnerArray.push({
            id: doc.id,
            image: data.image,
            date,
          });
  
          if (moment(date).isSame(moment(), "day")) {
            setShowConfetti(true);
            setShowWinnerModal(true);
          }
        });
  
        setWinnerDrawing(winnerArray);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
  
    const fetchNextData = async () => {
      if (!lastVisible || loadingMore || winnerDrawing.length < 5) return;
  
      setLoadingMore(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
  
        const nextQuery = query(
          collection(db, "winners"),
          where("userId", "==", user.uid),
          orderBy("date", "desc"),
          startAfter(lastVisible),
          limit(5)
        );
  
        const querySnapshotNext = await getDocs(nextQuery);
        if (!querySnapshotNext.empty) {
          const lastDoc = querySnapshotNext.docs[querySnapshotNext.docs.length - 1];
          setLastVisible(lastDoc);
  
          const newWinners: Winner[] = [];
          querySnapshotNext.forEach((doc) => {
            const data = doc.data();
            const date = data.date instanceof Timestamp ? data.date.toDate() : "";
            newWinners.push({ id: doc.id, image: data.image, date });
          });
  
          setWinnerDrawing((prev) => [...prev, ...newWinners]);
        }
      } catch (error) {
        console.error("Error fetching next data:", error);
      } finally {
        setLoadingMore(false);
      }
    };


  useEffect(() => {
    fetchData();
  }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
        {loading ? (
        <CowLoader size={48} /> 
      ) : winnerDrawing.length > 0 ? (
                 <FlatList
                 data={winnerDrawing}
                 keyExtractor={(item) => item.id}
                 renderItem={({ item }) => (
                   <View style={styles.drawingContainer}>
                   <TouchableOpacity onPress={() => openModal(`data:image/png;base64,${item.image}`)}>
                                <Image 
                                    source={{ uri: `data:image/png;base64,${item.image}` }} 
                                    style={styles.image}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleShare(item.image)} style={styles.buttonOther}>
                            <Entypo name="share" size={24} color="black" />
                          </TouchableOpacity>
                   </View>
                       )}
                    showsVerticalScrollIndicator={false}
                    onEndReached={fetchNextData}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <CowLoader size={20} /> : null}
                />
            ) : (
                <Text>No drawings found</Text> 
            )}

            {showConfetti && (
                      <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} onAnimationEnd={() => setShowConfetti(false)} />
                    )}

        <Modal
          visible={showWinnerModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeWinnerModal}
        >
          <View style={styles.modalBackgroundTwo}>
            <View style={styles.modalContainer}>
              <Text style={styles.winnerText}>Congratulations! You're today's {"\n"} winner!🎉</Text>
              <Button title="Close" onPress={closeWinnerModal} />
            </View>
          </View>
        </Modal>
        

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
            </View>
            </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(247, 244, 246, 0.8)',
    },
    header: {
        fontSize: 24,
        marginBottom: 20,
    },
    drawingContainer: {
        marginBottom: 20,
        alignItems: 'center',
        backgroundColor: 'white',
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
      winnerText: {
        fontSize: 22,
        marginBottom: 20,
        color: 'white',
        textAlign: 'center',
        fontFamily: 'PressStart2P_400Regular',
        lineHeight: 34,
      },
      modalBackgroundTwo: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      shareButton: {
        marginTop: 15,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#1E90FF',
        borderRadius: 5,
      },
      shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
      },
      buttonOther: {
        backgroundColor: 'white',
        padding:7,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 5,
        marginTop: 7,
        elevation: 5,
      },
      buttonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
      },
});

export default WinnerDrawingsScreen;