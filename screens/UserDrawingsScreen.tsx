import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions } from "react-native";
import CowLoader from '../components/CowLoader';
//import { getCallableFunction } from "../firebaseConfig";
import { auth, db } from "../firebaseConfig";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Entypo from '@expo/vector-icons/Entypo';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

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



    const cardWidth = Dimensions.get('window').width - 32;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
      {loading ? (
          <View style={styles.loaderContainer}>
            <CowLoader size={48} />
          </View>
        ) : drawings.length > 0 ? (
                <FlatList
                    data={drawings}
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
                              <Text style={styles.themeText}>{item.theme}</Text>
                              <TouchableOpacity onPress={() => handleShare(item.image)} style={styles.buttonOther}>
                                <Entypo name="share" size={18} color="#666" />
                              </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    onEndReached={fetchNextData}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <CowLoader size={20} /> : null}
                />
            ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No drawings yet</Text>
                  <Text style={styles.emptySubtitle}>Head to the Draw tab and create your first doodle!</Text>
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
            </View>
            </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#faf8f9' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
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
    image: { resizeMode: 'contain' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    themeText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    buttonOther: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
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

export default UserDrawingsScreen;