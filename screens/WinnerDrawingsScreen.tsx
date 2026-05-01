import { collection, query, where, getDocs, orderBy, limit, startAfter } from "firebase/firestore";
import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, Modal, TouchableWithoutFeedback, TouchableOpacity as RNTouchableOpacity, Dimensions, Alert } from "react-native";
import CowLoader from '../components/CowLoader';
import { db, auth } from "../firebaseConfig";
import { useCachedUserStats } from '../hooks/useCachedUserStats';
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import ConfettiCannon from 'react-native-confetti-cannon';
import moment from 'moment';
import { Timestamp } from "firebase/firestore";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Entypo from '@expo/vector-icons/Entypo';
import { colors } from '../theme/colors';
import { hasUnlock } from '../theme/unlocks';

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
  const { stats } = useCachedUserStats();
  const currentStreak = stats.currentStreak;

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
    Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
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

    const cardWidth = Math.min(Dimensions.get('window').width - 32, 600);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
        {loading ? (
        <View style={styles.loaderContainer}>
          <CowLoader size={48} />
        </View>
      ) : winnerDrawing.length > 0 ? (
                 <FlatList
                 data={winnerDrawing}
                 keyExtractor={(item) => item.id}
                 contentContainerStyle={[styles.listContent, { alignItems: 'center' }]}
                 renderItem={({ item }) => (
                   <View style={[styles.drawingContainer, { width: cardWidth }, hasUnlock(currentStreak, 'goldFrame') && styles.drawingContainerGold]}>
                     <TouchableOpacity onPress={() => openModal(`data:image/png;base64,${item.image}`)}>
                       <Image
                         source={{ uri: `data:image/png;base64,${item.image}` }}
                         style={[styles.image, { width: cardWidth, height: cardWidth }]}
                       />
                     </TouchableOpacity>
                     <View style={styles.cardFooter}>
                       <Text style={styles.trophyText}>🏆 Winner</Text>
                       <TouchableOpacity onPress={() => handleShare(item.image)} style={styles.buttonOther}>
                         <Entypo name="share" size={18} color={colors.textMuted} />
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
                  <Text style={styles.emptyTitle}>No wins yet</Text>
                  <Text style={styles.emptySubtitle}>Keep doodling — your first win could be today!</Text>
                </View>
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
              <Text style={styles.winnerText}>🎉 You're today's winner!</Text>
              <RNTouchableOpacity style={styles.closeButton} onPress={closeWinnerModal}>
                <Text style={styles.closeButtonText}>Amazing!</Text>
              </RNTouchableOpacity>
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
    container: { flex: 1, backgroundColor: colors.surfaceAlt },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
    drawingContainer: {
        marginBottom: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    drawingContainerGold: {
        borderWidth: 3,
        borderColor: colors.gold,
    },
    image: { resizeMode: 'contain' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    trophyText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
        color: colors.textSecondary,
    },
    buttonOther: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.surfaceMuted,
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
        color: colors.textPrimary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: colors.scrim85,
        justifyContent: 'center',
        alignItems: 'center',
    },
    enlargedImage: {
        width: Math.min(Dimensions.get('window').width * 0.92, 600),
        height: Math.min(Dimensions.get('window').width * 0.92, 600),
        backgroundColor: colors.surface,
        borderRadius: 12,
    },
    winnerText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        color: colors.white,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalBackgroundTwo: {
        flex: 1,
        backgroundColor: colors.scrim70,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    modalContainer: {
        backgroundColor: colors.navyAlpha95,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 460,
    },
    closeButton: {
        backgroundColor: colors.surface,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 10,
    },
    closeButtonText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
        color: colors.navy,
    },
});

export default WinnerDrawingsScreen;