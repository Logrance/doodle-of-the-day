import React, { useState, useRef, useCallback, useEffect, Children } from 'react';
import { usePhaseTimer } from '../../../hooks/usePhaseTimer';
import { usePresence } from '../../../hooks/usePresence';
import { useCachedUserStats } from '../../../hooks/useCachedUserStats';
import { View, Dimensions, TouchableOpacity, StyleSheet, Alert, Text, Modal, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { db, getCallableFunction } from '../../../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { DrawingCanvasRef } from 'drawing-canvas';
import { colors } from '../../../theme/colors';
import { getStreakColor } from '../../../theme/unlocks';

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
  const insets = useSafeAreaInsets();
  const { phase, countdown } = usePhaseTimer();
  const { presence, refresh: refreshPresence } = usePresence();
  const [isVisible, setIsVisible] = useState(false);
  const [word, setWord] = useState<string | null>(null);
  const { stats, refresh: refreshStats } = useCachedUserStats();
  const { currentStreak, paletteAvailable, freezesAvailable } = stats;
  const [selectedColor, setSelectedColor] = useState('#000000');

  const PALETTE = ['#000000', '#800000', '#0047AB', '#50C878', '#FF7800', '#6B2FA0'];

  const paletteHint = (() => {
    if (paletteAvailable) return '🎨 Colours unlocked — use them today!';
    if (currentStreak === 0) return '🔥 Draw 3 days in a row to unlock colours';
    if (currentStreak % 3 === 0) return '🎨 Colours unlock tomorrow — keep your streak alive!';
    const remaining = 3 - (currentStreak % 3);
    return `🎨 ${remaining} more day${remaining === 1 ? '' : 's'} to unlock colours`;
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

  const addImageToDB = async (imageBase64: string) => {
    try {
      const addImage = getCallableFunction("addImageToDB") as unknown as (params: { imageBase64: string }) => Promise<AddImageResponse>;
      const response = await addImage({ imageBase64 });
      Alert.alert("Success", response.data.message);
      clearCanvas();
      refreshStats();
      refreshPresence();
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

          {presence.doodlersToday > 0 && (
            <View pointerEvents="none" style={[styles.presencePill, { top: insets.top + 12 }]}>
              <Text style={styles.presenceText}>
                🎨 {presence.doodlersToday} doodling today
              </Text>
            </View>
          )}

          <View style={[styles.cornerBadges, { top: insets.top + 12 }]}>
            {currentStreak > 0 && (
              <View pointerEvents="none" style={styles.streakBadge}>
                <Text style={[styles.streakText, getStreakColor(currentStreak) ? { color: getStreakColor(currentStreak) } : null]}>🔥 {currentStreak}</Text>
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
                    { backgroundColor: locked ? colors.textDisabled : color },
                    !locked && selectedColor === color && styles.swatchSelected,
                  ]}
                >
                  {locked && (
                    <AntDesign name="lock" size={12} color={colors.white} style={styles.lockIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.paletteHint}>
            <Text style={styles.paletteHintText}>{paletteHint}</Text>
          </View>

          <View style={styles.swatchContainer}>
            <TouchableOpacity
              onPress={clearCanvas}
              style={styles.deleteButton}
              accessibilityLabel="Clear canvas"
            >
              <AntDesign name="delete" size={20} color={colors.textMuted} />
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

            <TouchableOpacity
              onPress={captureCanvas}
              style={styles.submitButton}
              accessibilityLabel="Submit drawing"
            >
              <MaterialIcons name="check-circle" size={18} color={colors.white} />
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>

          <Modal visible={isVisible} transparent={true} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.titleText}>Welcome to Doodle of the Day</Text>
                <Text style={styles.modalLead}>One theme, one drawing, every day.</Text>
                <View style={styles.modalBullets}>
                  <Text style={styles.modalBullet}>
                    • Draw before <Text style={styles.modalStrong}>14:00 UK</Text> — one submission per day.
                  </Text>
                  <Text style={styles.modalBullet}>
                    • Vote in your room before <Text style={styles.modalStrong}>20:00</Text> — one vote, and it's final.
                  </Text>
                  <Text style={styles.modalBullet}>
                    • Winners are revealed at <Text style={styles.modalStrong}>20:00</Text>.
                  </Text>
                </View>
                <Text style={styles.modalFootnote}>
                  The canvas has no eraser and starts in black ink. Build a 3-day streak to unlock the colour palette.
                </Text>
                <TouchableOpacity onPress={handleModalClose} style={styles.modalButton}>
                  <Text style={styles.buttonText}>Got it</Text>
                </TouchableOpacity>
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.navy,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  themeWrapper: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  themeLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.scrim50,
  },
  modalContent: {
    width: '80%',
    maxWidth: 460,
    padding: 28,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'stretch',
  },
  titleText: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalLead: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    color: colors.textMuted,
    marginBottom: 20,
  },
  modalBullets: {
    gap: 10,
    marginBottom: 20,
  },
  modalBullet: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  modalStrong: {
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  modalFootnote: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  themeText: {
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    fontSize: 15,
    color: colors.textPrimary,
  },
  countdownText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.navy,
    transform: [{ scale: 1.2 }],
  },
  lockIcon: {
    position: 'absolute',
  },
  paletteHint: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    minHeight: 24,
    backgroundColor: colors.surface,
  },
  paletteHintText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  cornerBadges: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    gap: 6,
  },
  presencePill: {
    position: 'absolute',
    left: 16,
    backgroundColor: colors.navyAlpha06,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  presenceText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  streakBadge: {
    backgroundColor: colors.navyAlpha08,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freezeBadge: {
    backgroundColor: colors.freezeIce,
  },
  streakText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: colors.navy,
  },
  modalButton: {
    backgroundColor: colors.navy,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: 'center',
  },
});
