import React, { useEffect, useState } from 'react';
import { usePhaseTimer } from '../../../hooks/usePhaseTimer';
import { usePresence } from '../../../hooks/usePresence';
import { View, StyleSheet, Image, FlatList, Text, Modal, Alert, TouchableWithoutFeedback, Dimensions, ScrollView } from 'react-native';
import CowLoader from '../../../components/CowLoader';
import { auth, db, getCallableFunction } from '../../../firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { drawingImageUri, shareDrawing } from '../../../theme/drawingImage';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors } from '../../../theme/colors';
import FeatureTip from '../../../components/FeatureTip';

type Drawing = {
  id: string;
  roomId: string;
  userId: string;
  date: number;
  votes: number;
  image?: string;
  imageUrl?: string;
  isYou: boolean;
};

type GetRoomDrawingsResponse = {
  drawings: Drawing[];
};

type ResultDrawing = {
  id: string;
  userId: string;
  username: string;
  image?: string;
  imageUrl?: string;
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
  winnerUserId?: string;
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
  const cardWidth = Math.min(screenWidth - 32, 600);

  const navigation = useNavigation<any>();
  // VoteScreen is a tab; PublicProfileScreen lives in the Profile tab's stack,
  // so jump to that tab and push the profile screen onto its stack.
  const openProfile = (userId: string) =>
    navigation.navigate('Profile', {
      screen: 'PublicProfileScreen',
      params: { userId },
    });

  const { phase, countdown, ukDate } = usePhaseTimer();
  const { presence, refresh: refreshPresence } = usePresence();
  const [drawingInfo, setDrawingInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<RoomResults | null>(null);
  const [votedForId, setVotedForId] = useState<string | null>(null);

  //For word theme state
  const [word, setWord] = useState<string | null>(null);

  //Modal logic
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  //screen reload variable
  const isFocused = useIsFocused();

  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAuthUser(u));
    return () => unsub();
  }, []);

  const openModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setModalVisible(false);
  };

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
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
        console.warn('VoteScreen.fetchData failed:', error);
    } finally {
      setLoading(false);
  }
};

const fetchResults = async () => {
  if (!auth.currentUser) return;
  setLoading(true);
  try {
    const getRoomResults = getCallableFunction("getRoomResults") as (
      data: { date: string }
    ) => Promise<{ data: RoomResults }>;
    const response = await getRoomResults({ date: new Date().toISOString() });
    setResults(response.data);
  } catch (error) {
    console.warn('VoteScreen.fetchResults failed:', error);
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
const handleFlag = async (drawingId: string) => {
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
            const response = await flagDrawing({ drawingId }) as { data: { message: string } };
            Alert.alert('Drawing flagged', response.data.message);
          } catch (error: any) {
            Alert.alert('Flag failed', error?.message || 'Failed to flag drawing. Please try again later.');
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
    setVotedForId(userId);

    fetchData();
    refreshPresence();
  } catch (error: any) {
    Alert.alert("Couldn't vote", error?.message || "Please try again.");
  }
};

// Function to handle share
const handleShare = (item: Drawing | ResultDrawing) => shareDrawing(item);


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
    () => {}
  );

  return () => unsubscribe();
}, []);

useEffect(() => {
  if (!isFocused) return;
  if (!authUser) return;
  if (phase === 'results') {
    fetchResults();
  } else {
    fetchData();
  }
 }, [isFocused, phase, authUser, ukDate])

// Reset per-day client state when the UK date rolls over so a user who voted
// yesterday isn't shown as "already voted" today.
useEffect(() => {
  setVotedForId(null);
}, [ukDate]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <View style={styles.themeContainer}>
        <Text style={styles.themeLabel}>Today's theme</Text>
        <Text style={styles.themeHeading}>{word || "Loading..."}</Text>
        {phase === 'voting' && drawingInfo[0]?.roomName && (
          <Text style={styles.roomNameText}>You're in {drawingInfo[0].roomName}</Text>
        )}
        {phase === 'voting' && drawingInfo.length > 0 && (
          <View style={styles.voteProgressWrap}>
            <Text style={styles.voteProgressLabel}>
              {votedForId
                ? '✓ Vote cast — results at 20:00'
                : `${drawingInfo.length} ${drawingInfo.length === 1 ? 'drawing' : 'drawings'} in your room — pick your favourite`}
            </Text>
            <View style={styles.voteProgressBar}>
              <View
                style={[
                  styles.voteProgressFill,
                  { width: votedForId ? '100%' : '0%' },
                ]}
              />
            </View>
          </View>
        )}
        <Text style={styles.countdownText}>
          {phase === 'drawing' && `Voting opens in ${countdown}`}
          {phase === 'voting' && `Voting closes in ${countdown}`}
          {phase === 'results' && 'Results announced!'}
        </Text>
        {phase === 'drawing' && presence.doodlersToday > 0 && (
          <Text style={styles.presenceLine}>🎨 {presence.doodlersToday} doodling today</Text>
        )}
        {phase === 'voting' && presence.votesToday > 0 && (
          <Text style={styles.presenceLine}>🗳️ {presence.votesToday} {presence.votesToday === 1 ? 'vote' : 'votes'} cast today</Text>
        )}
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
              const topVotes = results.drawings[0].votes;
              const winnersCount = results.drawings.filter(d => d.votes === topVotes).length;
              const userIsWinner = !!userDrawing && userDrawing.votes === topVotes;
              // Dense ranking: tied drawings share a rank, next distinct vote count
              // is rank+1 (so three tied for 1st → next drawing is 2nd, not 4th).
              const ranks: number[] = [];
              results.drawings.forEach((d, i) => {
                if (i === 0) ranks.push(1);
                else if (d.votes === results.drawings[i - 1].votes) ranks.push(ranks[i - 1]);
                else ranks.push(ranks[i - 1] + 1);
              });
              const bannerText = (() => {
                if (winnersCount > 1) {
                  return userIsWinner
                    ? '🏆 You tied for the win today!'
                    : `🏆 Tied for the win today (${winnersCount} drawings)`;
                }
                return userIsWinner
                  ? '🏆 You won today!'
                  : `🏆 Today's winner: @${results.winnerUsername}`;
              })();
              // A single, other-than-you winner gets a tappable name.
              const winnerClickable =
                winnersCount === 1 && !userIsWinner && !!results.winnerUserId;
              return (
                <ScrollView contentContainerStyle={[styles.listContent, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
                  <View style={[styles.resultsBanner, { width: cardWidth }]}>
                    {results.roomName && (
                      <Text style={styles.roomNameBannerText}>{results.roomName}</Text>
                    )}
                    {winnerClickable ? (
                      <Text style={styles.resultsBannerText}>
                        🏆 Today's winner:{' '}
                        <Text
                          style={styles.bannerLink}
                          onPress={() => openProfile(results.winnerUserId!)}
                        >
                          @{results.winnerUsername}
                        </Text>
                      </Text>
                    ) : (
                      <Text style={styles.resultsBannerText}>{bannerText}</Text>
                    )}
                    {userDrawing && !userIsWinner && (
                      <Text style={styles.resultsBannerSubText}>
                        You placed {ord(ranks[userIndex])} of {results.totalInRoom} · {userDrawing.votes} {userDrawing.votes === 1 ? 'vote' : 'votes'}
                      </Text>
                    )}
                  </View>

                  {results.drawings.some((d) => !d.isYou) && (
                    <FeatureTip
                      tipId="tap-author-names"
                      style={{ width: cardWidth, marginBottom: 16 }}
                      title="See who drew what"
                      text="Now that results are in, tap an artist's name to view their profile and gallery."
                    />
                  )}

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
                          {ranks[index] === 1 ? '🏆 ' : ''}{ord(ranks[index])} · {drawing.votes} {drawing.votes === 1 ? 'vote' : 'votes'}
                        </Text>
                        {drawing.isYou ? (
                          <Text style={styles.resultsAuthorYou}>you</Text>
                        ) : (
                          <TouchableOpacity onPress={() => openProfile(drawing.userId)} hitSlop={8}>
                            <Text style={styles.resultsAuthorLink} numberOfLines={1}>
                              @{drawing.username}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => openModal(drawingImageUri(drawing))}>
                        <Image
                          source={{ uri: drawingImageUri(drawing) }}
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
        ) : phase === 'voting' && drawingInfo.length > 0 ? (
        <FlatList
          data={drawingInfo}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { alignItems: 'center' }]}
          renderItem={({ item }) => {
            const isChosen = votedForId === item.id;
            const hasVoted = votedForId !== null;
            const isOwn = item.isYou;
            return (
              <View
                style={[
                  styles.drawingContainer,
                  { width: cardWidth },
                  isChosen && styles.drawingContainerChosen,
                  isOwn && styles.drawingContainerSelf,
                ]}
              >
                <TouchableOpacity onPress={() => openModal(drawingImageUri(item))}>
                  <Image
                    source={{ uri: drawingImageUri(item) }}
                    style={[styles.image, { width: cardWidth, height: cardWidth }]}
                  />
                </TouchableOpacity>
                <View style={styles.cardFooter}>
                  {isOwn ? (
                    <Text style={styles.youBadge}>Your drawing</Text>
                  ) : (
                    <View />
                  )}
                  <View style={styles.buttonRow}>
                    {!isOwn && (
                      <TouchableOpacity onPress={() => handleFlag(item.id)} style={styles.buttonIcon}>
                        <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    {!isOwn && (
                      <TouchableOpacity
                        onPress={() => handleVote(item.id)}
                        style={[
                          styles.buttonVote,
                          isChosen && styles.buttonVoteChosen,
                          hasVoted && !isChosen && styles.buttonVoteDimmed,
                        ]}
                        disabled={hasVoted}
                      >
                        <Text style={styles.buttonText}>{isChosen ? '✓ Voted' : 'Vote'}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleShare(item)} style={styles.buttonIcon}>
                      <Entypo name="share" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
    ) : (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {phase === 'drawing' && `Voting opens in ${countdown}`}
          {phase === 'voting' && 'Missed your chance to vote today'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {phase === 'drawing' && 'Submit your drawing before 14:00 UK time.'}
          {phase === 'voting' && 'Submit a drawing tomorrow before 14:00 UK time to get involved.'}
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
    backgroundColor: colors.surfaceAlt,
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
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
    backgroundColor: colors.navyAlpha06,
    borderRadius: 12,
  },
  resultsBannerText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: colors.navy,
    textAlign: 'center',
  },
  resultsBannerSubText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultsSubHeaderText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  resultsAuthorLink: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.navy,
    marginLeft: 8,
  },
  resultsAuthorYou: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 8,
  },
  bannerLink: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: colors.navy,
    textDecorationLine: 'underline',
  },
  drawingContainerSelf: {
    borderWidth: 2,
    borderColor: colors.navyAlpha35,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    gap: 4,
  },
  reactionButtonActive: {
    backgroundColor: colors.navyAlpha12,
  },
  reactionButtonReadOnly: {
    opacity: 0.85,
    backgroundColor: colors.surfaceMutedAlt,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionCount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  youBadge: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: colors.navy,
    backgroundColor: colors.navyAlpha08,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  buttonVote: {
    backgroundColor: colors.navy,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: colors.white,
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
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  themeHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  countdownText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  roomNameText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: colors.navy,
    textAlign: 'center',
    marginTop: 6,
  },
  voteProgressWrap: {
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  voteProgressLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  voteProgressBar: {
    height: 4,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  voteProgressFill: {
    height: '100%',
    backgroundColor: colors.navy,
    borderRadius: 2,
  },
  drawingContainerChosen: {
    borderWidth: 2,
    borderColor: colors.navy,
  },
  buttonVoteChosen: {
    backgroundColor: colors.voteSuccess,
  },
  buttonVoteDimmed: {
    backgroundColor: colors.textPlaceholder,
  },
  presenceLine: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  roomNameBannerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.textMuted,
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
});
