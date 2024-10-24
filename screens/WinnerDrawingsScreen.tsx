import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, Modal, TouchableNativeFeedback, Platform, ActivityIndicator, Button } from "react-native";
import { db, auth } from "../firebaseConfig";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import ConfettiCannon from 'react-native-confetti-cannon';
import moment from 'moment';
import { Timestamp } from "firebase/firestore";


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

  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false); 

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

    //Winner render logic

  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("You are not logged in")
        setLoading(false);
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
          const data = doc.data();

          let date: string | Date = "";
        if (data.date instanceof Timestamp) {
          date = data.date.toDate(); // Convert Firestore Timestamp to JavaScript Date
        }

          const winner = {
            id: doc.id,
            image: data.image,
            date: data, // Assuming a date field exists
          };
          winnerArray.push(winner);

          // Compare the drawing's date with today's date
          if (moment(date).isSame(moment(), 'day')) {
            setShowConfetti(true); // Trigger confetti if the date is today
            setShowWinnerModal(true);
          }
        });
        setWinnerDrawing(winnerArray);
      }
    } catch (error) {
      console.log("Error message", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
        {loading ? (
        <ActivityIndicator size="large" color="grey" /> 
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
                   </View>
                       )}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <Text>No drawings found</Text> 
            )}

            {showConfetti && (
                      <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} onAnimationEnd={() => setShowConfetti(false)} />
                    )}

            {/* Winner Modal */}
        <Modal
          visible={showWinnerModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeWinnerModal}
        >
          <View style={styles.modalBackgroundTwo}>
            <View style={styles.modalContainer}>
              <Text style={styles.winnerText}>Congratulations! You're today's winner! 🎉</Text>
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
        borderRadius: 8,
        backgroundColor: 'white',
        resizeMode: 'contain',
      },
      winnerText: {
        fontSize: 24,
        marginBottom: 20,
        color: 'green',
        textAlign: 'center',
      },
      modalBackgroundTwo: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
});

export default WinnerDrawingsScreen;