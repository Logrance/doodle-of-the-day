import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, Modal, TouchableNativeFeedback, Platform, ActivityIndicator } from "react-native";
//import { getCallableFunction } from "../firebaseConfig";
import { auth, db } from "../firebaseConfig";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Entypo from '@expo/vector-icons/Entypo';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { QuerySnapshot } from "@google-cloud/firestore";

interface Drawing {
    id: string;
    image: string;
    date: any;
    theme: string;
}

/*type GetFetchUserDrawingsResponse = {
  drawings: Drawing[];
  lastDoc: string | null;
}; */

const UserDrawingsScreen = () => {
    const [drawings, setDrawings] = useState<Drawing[]>([]);

     //Modal logic
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

    // Function to handle share
const handleShare = async (image: string) => {
    
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");
  
    const filename = `${FileSystem.cacheDirectory}shared-image.png`;
    await FileSystem.writeAsStringAsync(filename, base64Image, { encoding: FileSystem.EncodingType.Base64 });

  
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


   /* const fetchData = async () => {
      setLoading(true)
      try {
        const fetchUserDrawings = getCallableFunction('fetchUserDrawings');
        const response = await fetchUserDrawings();
        

        const data = response.data as GetFetchUserDrawingsResponse;

    
        setDrawings(data.drawings);
        //setLastVisible(data.lastDoc);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    const fetchNextData = async () => {
      if (!lastVisible || loadingMore) return;
    
      setLoadingMore(true);
      try {
        const fetchNextUserDrawings = getCallableFunction('fetchNextUserDrawings');
        const response = await fetchNextUserDrawings({ lastDoc: lastVisible });
    
        const data = response.data as GetFetchUserDrawingsResponse;

        if (data.drawings.length === 0) {
          return; 
        }
    
        setDrawings((prev) => [...prev, ...data.drawings]);
        //setLastVisible(data.lastDoc);
      } catch (error) {
      } finally {
        setLoadingMore(false);
      }
    };

    useEffect(() => {
    fetchData();
  }, []); */

  const fetchData = async () => {
    setLoading(true)
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const first = query(
        collection(db, "drawings"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(first);

      if (querySnapshot.empty) {
        setDrawings([]);
        setLoading(false);
        return;
      }


      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);

      const drawingsArray: Drawing[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate() : ""; 
  
        return {
          id: doc.id,
          image: data.image,
          date,
          theme: data.theme,
        };
      });

      setDrawings(drawingsArray);
      } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchNextData = async () => {
    if (!lastVisible || loadingMore || drawings.length < 5) return;

    setLoadingMore(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const nextQuery = query(
        collection(db, "drawings"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        startAfter(lastVisible),
        limit(5)
      );

      const querySnapshotNext = await getDocs(nextQuery);
      if (!querySnapshotNext.empty) {
        const lastDoc = querySnapshotNext.docs[querySnapshotNext.docs.length - 1];
        setLastVisible(lastDoc);

        const newDrawings: Drawing[] = [];
        querySnapshotNext.forEach((doc) => {
          const data = doc.data();
          const date = data.date instanceof Timestamp ? data.date.toDate() : "";
          newDrawings.push({ id: doc.id, image: data.image, date, theme: data.theme });
        });

        setDrawings((prev) => [...prev, ...newDrawings]);
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
                            <Text>{item.theme}</Text>
                            <TouchableOpacity onPress={() => handleShare(item.image)} style={styles.buttonOther}>
                            <Entypo name="share" size={24} color="black" />
                          </TouchableOpacity>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    onEndReached={fetchNextData}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="grey" /> : null}
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
        backgroundColor: 'white',
        resizeMode: 'contain',
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

export default UserDrawingsScreen;