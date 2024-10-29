import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, Modal, TouchableNativeFeedback, Platform, ActivityIndicator } from "react-native";
import { db, auth } from "../firebaseConfig";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Entypo from '@expo/vector-icons/Entypo';

interface Drawing {
    id: string;
    image: string;
}

const UserDrawingsScreen = () => {
    const [drawings, setDrawings] = useState<Drawing[]>([]);

     //Modal logic
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

    // Function to handle share
const handleShare = async (image: string) => {
    // Convert base64 to a file
    
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");
  
    const filename = `${FileSystem.cacheDirectory}shared-image.png`;
    await FileSystem.writeAsStringAsync(filename, base64Image, { encoding: FileSystem.EncodingType.Base64 });
  
    //const asset = await MediaLibrary.createAssetAsync(filename);
    //await MediaLibrary.createAlbumAsync("Shared Images", asset, false);
  
  
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

  const openModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setModalVisible(false);
  };

    useEffect (() => {
        const fetchDrawings = async () => {
            setLoading(true);
            const user = auth.currentUser;
            if (user) {
                const q = query(
                    collection(db, 'drawings'),
                    where('userId', '==', user.uid)
                );
                const querySnapshot = await getDocs(q);
                const userDrawings = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Drawing[];
                setDrawings(userDrawings)
            }
            setLoading(false);
        };

        fetchDrawings()
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
            {loading ? ( 
                    <ActivityIndicator size="large" color="grey" />
                ) : drawings.length > 0 ? (
                <FlatList
                    data={drawings}
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
        //borderRadius: 8,
        backgroundColor: 'white',
        resizeMode: 'contain',
      },
      buttonOther: {
        backgroundColor: 'white',
        //width: '60%',
        padding:7,
        borderRadius: 10,
        alignItems: 'center',
        //alignContent: 'center',
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

export default UserDrawingsScreen;