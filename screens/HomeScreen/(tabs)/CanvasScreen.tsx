import React, { useState, useRef, useCallback, useEffect, Children } from 'react';
import { usePhaseTimer } from '../../../hooks/usePhaseTimer';
import { View, Dimensions, TouchableOpacity, StyleSheet, Alert, Text, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { db, getCallableFunction } from '../../../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { DrawingCanvasRef } from 'drawing-canvas';

// Android-only imports — not evaluated on iOS
let Canvas: any, Path: any, Skia: any, Rect: any;
let Gesture: any, GestureDetector: any;
let runOnJS: any;
if (Platform.OS !== 'ios') {
  const skia = require('@shopify/react-native-skia');
  Canvas = skia.Canvas;
  Path = skia.Path;
  Skia = skia.Skia;
  Rect = skia.Rect;
  const rngh = require('react-native-gesture-handler');
  Gesture = rngh.Gesture;
  GestureDetector = rngh.GestureDetector;
  const reanimated = require('react-native-reanimated');
  runOnJS = reanimated.runOnJS;
}

type AddImageResponse = { data: { message: string } };

export default function CanvasScreen() {
  const { width, height } = Dimensions.get("window");
  const { phase, countdown } = usePhaseTimer();
  const [isVisible, setIsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [word, setWord] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [paletteAvailable, setPaletteAvailable] = useState(false);
  const [freezesAvailable, setFreezesAvailable] = useState(0);
  const [selectedColor, setSelectedColor] = useState('#000000');

  const PALETTE = ['#000000', '#800000', '#0047AB', '#50C878', '#FF7800', '#6B2FA0'];

  const paletteHint = (() => {
    if (paletteAvailable) return '🎨 Colours unlocked — use them today!';
    if (currentStreak === 0) return '🔥 Draw 3 days in a row to unlock colours';
    if (currentStreak % 3 === 0) return '🎨 Colours unlock tomorrow — keep your streak alive!';
    const remaining = 3 - (currentStreak % 3);
    return `🔥 ${currentStreak} / 3 — ${remaining} more day${remaining === 1 ? '' : 's'} to unlock colours`;
  })();

  // iOS native canvas ref
  const nativeCanvasRef = useRef<DrawingCanvasRef>(null);

  // Android Skia ref (useRef<any> is equivalent to useCanvasRef — just a typed ref)
  const skiaRef = useRef<any>(null);
  const currentPath = useRef<any>(null);
  const currentColor = useRef<string>('#000000');
  const [paths, setPaths] = useState<{ path: any; color: string }[]>([]);

  const updatePaths = useCallback((newPath: any, color: string) => {
    setPaths((prevState) => [...prevState, { path: newPath, color }]);
  }, []);

  // Android gesture setup
  const drawGesture = Platform.OS !== 'ios'
    ? Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onStart(({ x, y }: { x: number; y: number }) => {
          currentPath.current = Skia.Path.Make();
          currentPath.current.moveTo(x, y);
          runOnJS(updatePaths)(currentPath.current, currentColor.current);
        })
        .onUpdate(({ x, y }: { x: number; y: number }) => {
          if (currentPath.current) {
            const lastP = currentPath.current.getLastPt();
            const xMid = (lastP.x + x) / 2;
            const yMid = (lastP.y + y) / 2;
            currentPath.current.quadTo(lastP.x, lastP.y, xMid, yMid);
            setPaths((prev) => [...prev]);
          }
        })
    : null;

  const clearCanvas = () => {
    if (Platform.OS === 'ios') {
      nativeCanvasRef.current?.clear();
    } else {
      setPaths([]);
    }
  };

  const getBase64Snapshot = async (): Promise<string> => {
    if (Platform.OS === 'ios') {
      return nativeCanvasRef.current!.makeImageSnapshot();
    } else {
      const image = skiaRef.current?.makeImageSnapshot();
      return image.encodeToBase64();
    }
  };

  const fetchStreakStats = useCallback(async () => {
    try {
      const getUserStats = getCallableFunction("getUserStats");
      const response = await getUserStats({}) as {
        data: { currentStreak: number; paletteAvailable: boolean; freezesAvailable: number }
      };
      setCurrentStreak(response.data.currentStreak);
      setPaletteAvailable(response.data.paletteAvailable);
      setFreezesAvailable(response.data.freezesAvailable);
    } catch (error) {}
  }, []);

  const addImageToDB = async (imageBase64: string) => {
    try {
      const addImage = getCallableFunction("addImageToDB") as unknown as (params: { imageBase64: string }) => Promise<AddImageResponse>;
      const response = await addImage({ imageBase64 });
      Alert.alert("Success", response.data.message);
      clearCanvas();
      fetchStreakStats();
    } catch (error) {
      Alert.alert("Submission Failed", error.message || "Error submitting drawing");
      clearCanvas();
    }
  };

  const captureCanvas = () => {
    Alert.alert(
      "Submit Drawing?",
      "You can only submit one drawing per day.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log("Submission canceled"),
        },
        {
          text: "Submit",
          style: "default",
          onPress: async () => {
            const base64 = await getBase64Snapshot();
            addImageToDB(base64);
          },
        },
      ]
    );
  };

  const handleNextPage = () => setCurrentPage((prev) => prev + 1);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const fetchUserAndCheckTutorial = getCallableFunction("fetchUserAndCheckTutorial");
        const response = await fetchUserAndCheckTutorial({}) as { data: { hasSeenTutorial: boolean } };
        setIsVisible(!response.data.hasSeenTutorial);
      } catch (error) {
      }
    };
    checkTutorialStatus();
  }, []);

  useEffect(() => {
    fetchStreakStats();
  }, [fetchStreakStats]);

  const handleModalClose = async () => {
    setIsVisible(false);
    try {
      const updateTutorialStatus = getCallableFunction("updateTutorialStatus");
      await updateTutorialStatus({});
    } catch (error) {
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
      }
    );
    return () => unsubscribe();
  }, []);

  const renderCanvas = () => {
    if (Platform.OS === 'ios') {
      const { DrawingCanvas } = require('drawing-canvas');
      return (
        <DrawingCanvas
          ref={nativeCanvasRef}
          style={{ flex: 8 }}
          strokeColor={selectedColor}
        />
      );
    }
    return (
      <GestureDetector gesture={drawGesture}>
        <Canvas style={{ flex: 8 }} ref={skiaRef}>
          <Rect x={0} y={0} width={width} height={height} color="white" />
          {Children.toArray(paths.map((entry, index) => (
            <Path
              key={index}
              path={entry.path}
              strokeWidth={5}
              style="stroke"
              color={entry.color}
            />
          )))}
        </Canvas>
      </GestureDetector>
    );
  };

  return (
    <>
      <GestureHandlerRootView>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          {renderCanvas()}

          <View style={styles.cornerBadges}>
            {currentStreak > 0 && (
              <View pointerEvents="none" style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {currentStreak}</Text>
              </View>
            )}
            {freezesAvailable > 0 && (
              <TouchableOpacity
                onPress={() => Alert.alert(
                  "❄️ Streak Freeze",
                  "If you miss a day, your freeze automatically saves your streak. You earn 1 freeze every 7 days."
                )}
                style={[styles.streakBadge, styles.freezeBadge]}
              >
                <Text style={styles.streakText}>❄️ {freezesAvailable}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.paletteRow}>
            {PALETTE.map((color, index) => {
              const isBlack = index === 0;
              const locked = !paletteAvailable && !isBlack;
              return (
                <TouchableOpacity
                  key={color}
                  disabled={locked}
                  onPress={() => {
                    setSelectedColor(color);
                    currentColor.current = color;
                  }}
                  style={[
                    styles.swatch,
                    { backgroundColor: locked ? '#ccc' : color },
                    !locked && selectedColor === color && styles.swatchSelected,
                  ]}
                >
                  {locked && (
                    <AntDesign name="lock" size={12} color="white" style={styles.lockIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.paletteHint}>
            <Text style={styles.paletteHintText}>{paletteHint}</Text>
          </View>

          <View style={styles.swatchContainer}>
            <TouchableOpacity onPress={clearCanvas} style={styles.buttonAnother}>
              <AntDesign name="delete" size={22} color="white" />
            </TouchableOpacity>

            <View style={styles.themeWrapper}>
              <Text style={styles.themeLabel}>Today's theme</Text>
              <Text style={styles.themeText}>{word || "Loading..."}</Text>
              <Text style={styles.countdownText}>
                {phase === 'drawing' && `Drawing closes in ${countdown}`}
                {phase === 'voting' && `Voting open · Results in ${countdown}`}
                {phase === 'results' && 'Results are in!'}
              </Text>
            </View>

            <TouchableOpacity onPress={captureCanvas} style={styles.buttonOther}>
              <MaterialIcons name="check-circle" size={22} color="white" />
            </TouchableOpacity>
          </View>

          <Modal visible={isVisible} transparent={true} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {currentPage === 1 && (
                  <>
                    <Text style={styles.titleText}>
                      Welcome to Doodle of the Day! Here's how the app works:
                    </Text>
                    <Text style={styles.modalText}>
                      • Draw your picture based on the daily theme by 14:00 UK time.
                      {"\n"}
                      • At 14:00 you are allocated a voting room. You have one vote, and once cast, it can't be taken back, so use it wisely.
                      {"\n"}
                      • Winners are picked at 20:00.
                    </Text>
                    <TouchableOpacity onPress={handleNextPage} style={styles.modalButton}>
                      <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                  </>
                )}

                {currentPage === 2 && (
                  <>
                    <Text style={styles.titleText}>Our Doodle Philosophy</Text>
                    <Text style={styles.modalText}>
                      • In our app, there's no eraser. Why? Because we want you to be bold! But don't worry—there is a delete button if you've been a little too bold.
                      {"\n"}
                      • We've also kept it simple with just one line thickness and no colour options. Why? Too many options can get in the way of creativity.
                      {"\n"}
                      • Happy doodling! 😊
                    </Text>
                    <View>
                      <TouchableOpacity onPress={handleModalClose} style={styles.modalButton}>
                        <Text style={styles.buttonText}>Got it!</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </GestureHandlerRootView>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  swatchContainer: {
    flexDirection: "row",
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  buttonOther: {
    backgroundColor: '#023448',
    padding: 10,
    borderRadius: 10,
  },
  buttonAnother: {
    backgroundColor: 'rgba(2,52,72,0.7)',
    padding: 10,
    borderRadius: 10,
  },
  themeWrapper: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  themeLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 26,
    color: '#111',
    textAlign: 'left',
  },
  titleText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
    lineHeight: 26,
    color: '#111',
  },
  themeText: {
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    fontSize: 15,
    color: '#111',
  },
  countdownText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginTop: 1,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#023448',
    transform: [{ scale: 1.2 }],
  },
  lockIcon: {
    position: 'absolute',
  },
  paletteHint: {
    alignItems: 'center',
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  paletteHintText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#666',
  },
  cornerBadges: {
    position: 'absolute',
    top: 12,
    right: 16,
    alignItems: 'flex-end',
    gap: 6,
  },
  streakBadge: {
    backgroundColor: 'rgba(2,52,72,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freezeBadge: {
    backgroundColor: 'rgba(120,180,220,0.22)',
  },
  streakText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#023448',
  },
  modalButton: {
    backgroundColor: 'rgba(2,52,72,0.7)',
    padding: 10,
    borderRadius: 10,
  },
});
