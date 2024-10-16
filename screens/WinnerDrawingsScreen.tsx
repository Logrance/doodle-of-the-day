import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, Modal, TouchableNativeFeedback, Platform } from "react-native";
import { db, auth } from "../firebaseConfig";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';

/*interface Drawing {
    id: string;
    image: string;
} */

interface Winner {
    id: string;
    image: string;
  };

const WinnerDrawingsScreen = () => {


  const [winnerDrawing, setWinnerDrawing ] = useState<Winner[]>([])

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
          winnerArray.push({ id: doc.id, image: doc.data().image})
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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
            <Text style={styles.header}>My Winners</Text>
            {winnerDrawing.length > 0 ? (
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
});

export default WinnerDrawingsScreen;