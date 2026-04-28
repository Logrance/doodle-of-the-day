import React, { useEffect, useState } from 'react';
import { usePhaseTimer } from '../../../hooks/usePhaseTimer';
import { View, StyleSheet, Image, FlatList, Text, Modal, Alert, TouchableWithoutFeedback, Dimensions, Platform, ScrollView } from 'react-native';
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
import ConfettiCannon from 'react-native-confetti-cannon';

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

type ResultDrawing = {
  id: string;
  image: string;
  votes: number;
  isYou: boolean;
  reactions: Record<string, number>;
  userReactions: string[];
};

type RoomResults = {
  hasDrawing: boolean;
  roomAssigned?: boolean;
  totalInRoom?: number;
  drawings?: ResultDrawing[];
  winnerUsername?: string;
  roomName?: string | null;
};

const REACTION_TYPES: Array<{ key: string; emoji: string }> = [
  { key: 'laugh', emoji: '😂' },
  { key: 'love', emoji: '❤️' },
  { key: 'wow', emoji: '🤯' },
  { key: 'spark', emoji: '✨' },
];

const ord = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};


export default function VoteScreen() {
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
  const loaderSize = screenHeight < 667 ? 80 : 100;
  const cardWidth = screenWidth - 32;

  const { phase, countdown } = usePhaseTimer();
  const [drawingInfo, setDrawingInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<RoomResults | null>(null);

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

const fetchResults = async () => {
  setLoading(true);
  try {
    const getRoomResults = getCallableFunction("getRoomResults") as (
      data: { date: string }
    ) => Promise<{ data: RoomResults }>;
    const response = await getRoomResults({ date: new Date().toISOString() });
    setResults(response.data);
  } catch (error) {
    setResults(null);
  } finally {
    setLoading(false);
  }
};

const handleReact = async (drawingId: string, type: string) => {
  setResults(prev => {
    if (!prev?.drawings) return prev;
    return {
      ...prev,
      drawings: prev.drawings.map(d => {
        if (d.id !== drawingId) return d;
        const has = d.userReactions.includes(type);
        const newReactions = { ...d.reactions };
        newReactions[type] = Math.max(0, (newReactions[type] || 0) + (has ? -1 : 1));
        return {
          ...d,
          reactions: newReactions,
          userReactions: has ? d.userReactions.filter(t => t !== type) : [...d.userReactions, type],
        };
      }),
    };
  });
  try {
    const toggleReaction = getCallableFunction("toggleReaction") as (
      data: { drawingId: string; type: string }
    ) => Promise<{ data: { reactions: Record<string, number>; userReactions: string[] } }>;
    await toggleReaction({ drawingId, type });
  } catch (error) {
    fetchResults();
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
  if (!isFocused) return;
  if (phase === 'results') {
    fetchResults();
  } else {
    fetchData();
  }
 }, [isFocused, phase])


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <View style={styles.themeContainer}>
        <Text style={styles.themeLabel}>Today's theme</Text>
        <Text style={styles.themeHeading}>{word || "Loading..."}</Text>
        {phase === 'voting' && drawingInfo[0]?.roomName && (
          <Text style={styles.roomNameText}>You're in {drawingInfo[0].roomName}</Text>
        )}
        <Text style={styles.countdownText}>
          {phase === 'drawing' && `Voting opens in ${countdown}`}
          {phase === 'voting' && `Voting closes in ${countdown}`}
          {phase === 'results' && 'Results announced!'}
        </Text>
      </View>
    {loading ? (
          <View style={styles.loaderContainer}>
            <CowLoader size={loaderSize} />
          </View>
        ) : phase === 'results' ? (
          results?.hasDrawing && results.roomAssigned && results.drawings ? (
            (() => {
              const userIndex = results.drawings.findIndex(d => d.isYou);
              const userDrawing = userIndex >= 0 ? results.drawings[userIndex] : null;
              const winnerIsYou = results.drawings[0].isYou;
              return (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.resultsBanner}>
                    {results.roomName && (
                      <Text style={styles.roomNameBannerText}>{results.roomName}</Text>
                    )}
                    <Text style={styles.resultsBannerText}>
                      {winnerIsYou ? '🏆 You won today!' : `🏆 Today's winner: @${results.winnerUsername}`}
                    </Text>
                    {userDrawing && !winnerIsYou && (
                      <Text style={styles.resultsBannerSubText}>
                        You placed {ord(userIndex + 1)} of {results.totalInRoom} · {userDrawing.votes} {userDrawing.votes === 1 ? 'vote' : 'votes'}
                      </Text>
                    )}
                  </View>

                  {results.drawings.map((drawing, index) => (
                    <View
                      key={drawing.id}
                      style={[
                        styles.drawingContainer,
                        { width: cardWidth },
                        drawing.isYou && styles.drawingContainerSelf,
                      ]}
                    >
                      <View style={styles.resultsHeader}>
                        <Text style={styles.resultsSubHeaderText}>
                          {index === 0 ? '🏆 ' : ''}{ord(index + 1)} · {drawing.votes} {drawing.votes === 1 ? 'vote' : 'votes'}
                          {drawing.isYou ? ' · you' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => openModal(`data:image/png;base64,${drawing.image}`)}>
                        <Image
                          source={{ uri: `data:image/png;base64,${drawing.image}` }}
                          style={[styles.image, { width: cardWidth, height: cardWidth }]}
                        />
                      </TouchableOpacity>
                      <View style={styles.reactionRow}>
                        {REACTION_TYPES.map(({ key, emoji }) => {
                          const count = drawing.reactions[key] || 0;
                          const active = drawing.userReactions.includes(key);
                          return (
                            <TouchableOpacity
                              key={key}
                              disabled={drawing.isYou}
                              onPress={() => handleReact(drawing.id, key)}
                              style={[
                                styles.reactionButton,
                                active && styles.reactionButtonActive,
                                drawing.isYou && styles.reactionButtonReadOnly,
                              ]}
                            >
                              <Text style={styles.reactionEmoji}>{emoji}</Text>
                              {count > 0 && <Text style={styles.reactionCount}>{count}</Text>}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              );
            })()
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {results?.hasDrawing ? 'Results coming soon' : 'No doodle today'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {results?.hasDrawing
                  ? 'Hang tight — winners are being picked.'
                  : "You didn't draw today. Come back tomorrow for a new theme!"}
              </Text>
            </View>
          )
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
        <Text style={styles.emptyTitle}>
          {phase === 'drawing' && `Voting opens in ${countdown}`}
          {phase === 'voting' && 'No drawings to vote on yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {phase === 'drawing' && 'Submit your drawing before 14:00 UK time.'}
          {phase === 'voting' && 'Check back in a moment.'}
        </Text>
      </View>
  )}

  {phase === 'results' && results?.drawings?.[0]?.isYou && (
    <ConfettiCannon
      count={150}
      origin={{ x: screenWidth / 2, y: 0 }}
      autoStart
      fadeOut
    />
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  resultsBanner: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(2,52,72,0.06)',
    borderRadius: 12,
  },
  resultsBannerText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#023448',
    textAlign: 'center',
  },
  resultsBannerSubText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 4,
  },
  resultsHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultsSubHeaderText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#555',
  },
  drawingContainerSelf: {
    borderWidth: 2,
    borderColor: 'rgba(2,52,72,0.35)',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  reactionButtonActive: {
    backgroundColor: 'rgba(2,52,72,0.12)',
  },
  reactionButtonReadOnly: {
    opacity: 0.85,
    backgroundColor: '#fafafa',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionCount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#555',
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
  countdownText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  roomNameText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#023448',
    textAlign: 'center',
    marginTop: 6,
  },
  roomNameBannerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 6,
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
