import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Dimensions, TouchableOpacity, StyleSheet, Button, Alert } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler'
import { Canvas, Path, useCanvasRef, SkPath, Skia, TouchInfo, useTouchHandler } from '@shopify/react-native-skia';
import Animated, {useSharedValue, withTiming, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { collection, addDoc, Timestamp, where, getDocs, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import { auth } from '../../../firebaseConfig';

/*interface IPath {
  segments: String[];
  color?: string;
} */


export default function CanvasScreen() {
  const { width, height } = Dimensions.get("window");

  const paletteColors = ["black", "purple", "grey", "orange"];

  const [activePaletteColorIndex, setActivePaletteColorIndex] = useState(0);
  //const [paths, setPaths] = useState<IPath[]>([]);
  const [paths, setPaths] = useState<SkPath[]>([]);

  const ref = useCanvasRef();

  //Defining a Pan Gesture
  /*const pan = Gesture.Pan()
    .runOnJS(true)
    .onStart((g) => {
        const newPaths = [...paths];
        newPaths[paths.length] = {
          segments: [],
          color: paletteColors[activePaletteColorIndex],
        };
        newPaths[paths.length].segments.push(`M ${g.x} ${g.y}`); 
        setPaths(newPaths);
    })
    .onUpdate((g) => {
        const index = paths.length - 1;
        const newPaths = [...paths];
        if (newPaths?.[index]?.segments) {
          newPaths[index].segments.push(`L ${g.x} ${g.y}`);
          setPaths(newPaths);
        }
    })
    .minDistance(1); */

    //Experiment code
    const onDrawingStart = useCallback((touchInfo: TouchInfo) => {
      setPaths((old) => {
        const { x, y } = touchInfo;
        const newPath = Skia.Path.Make();
        newPath.moveTo(x, y);
        return [...old, newPath];
      });
    }, []);
  
    const onDrawingActive = useCallback((touchInfo: TouchInfo) => {
      setPaths((currentPaths) => {
        const { x, y } = touchInfo;
        const currentPath = currentPaths[currentPaths.length - 1];
        const lastPoint = currentPath.getLastPt();
        const xMid = (lastPoint.x + x) / 2;
        const yMid = (lastPoint.y + y) / 2;
  
        currentPath.quadTo(lastPoint.x, lastPoint.y, xMid, yMid);
        return [...currentPaths.slice(0, currentPaths.length - 1), currentPath];
      });
    }, []);
  
    const touchHandler = useTouchHandler(
      {
        onActive: onDrawingActive,
        onStart: onDrawingStart,
      },
      [onDrawingActive, onDrawingStart]
    );

  //defining animated styles with UseAnimatedStyle
  const paletteVisible = useSharedValue(false);
  const animatedPaletteStyle = useAnimatedStyle(() => {
    return {
      top: withSpring(paletteVisible.value ? -275 : -100),
      height: withTiming(paletteVisible.value ? 200 : 50),
      opacity: withTiming(paletteVisible.value ? 100 : 0, { duration: 100 }),
    };
  });

  const animatedSwatchStyle = useAnimatedStyle(() => {
    return {
      top: withSpring(paletteVisible.value ? -50 : 0),
      height: paletteVisible.value ? 0 : 50,
      opacity: withTiming(paletteVisible.value ? 0 : 100, { duration: 100 }),
    };
  });

  const clearCanvas = () => {
    setPaths([]);
  };


//Canvas snapshot and send to Firestore db

const addImageToDB = async (imageBase64: string) => {
  try {
    // Ensure a user is logged in
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No user is signed in");
    }

    // Get the current date (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight

    // Query for existing drawings for the current user on the current day
    const querySnapshot = await getDocs(query(
      collection(db, 'drawings'),
      where('userId', '==', user.uid),
      where('date', '>=', today.getTime()),
      where('date', '<', today.getTime() + (24 * 60 * 60 * 1000)) // Add 24 hours
    ));

    // Check if there are any existing drawings for today
    if (querySnapshot.empty) {
      // No drawings found, proceed with adding the new drawing
      const docRef = await addDoc(collection(db, 'drawings'), {
        title: "Captured Image",  
        done: false,
        image: imageBase64,  
        userId: user.uid,
        votes: 0,
        date: Date.now(),
      });
      Alert.alert("Canvas Captured", "The canvas snapshot was successfully captured!");
      console.log('Document written with ID: ', docRef.id);
      clearCanvas();
    } else {
      // User already has a drawing for today
      Alert.alert("Capture Failed", "You have already doodled today!");
      console.log('User already has a drawing for today.');
      clearCanvas();
    }
  } catch (e) {
    console.error('Error adding document: ', e);
  }
};


const captureCanvas = () => {
  const image = ref.current?.makeImageSnapshot();

  if (image) {
    const imageConversion = image.encodeToBase64();
     addImageToDB(imageConversion);
     console.log("drawing captured")
    //Alert.alert("Canvas Captured", "The canvas snapshot was successfully captured!");
  } else {
    console.log("Drawing unsuccessful")
    //Alert.alert("Capture Failed", "Could not capture the canvas.");
  }
}; 


return (
  <>
  <GestureHandlerRootView>
    <View style={{ height, width }}>
      
        
          <Canvas style={{ flex: 8 }} ref={ref} onTouch={touchHandler}>
            {paths.map((path, index) => (
              <Path
                key={index}
                path={path}
                strokeWidth={5}
                style="stroke"
                color={"black"}
              />
            ))}
          </Canvas>
          
        
        <View style={{ padding: 10, flex: 1, backgroundColor: "#edede9" }}>
          <View style={{ flex: 1, flexDirection: "row" }}>
            <Animated.View
              style={[
                { padding: 10, position: "absolute", width: 60 },
                animatedPaletteStyle,
              ]}
            >
              {paletteColors.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setActivePaletteColorIndex(i);
                    paletteVisible.value = false;
                  }}
                >
                  <View
                    style={[
                      {
                        backgroundColor: c,
                      },
                      styles.paletteColor,
                    ]}
                  ></View>
                </TouchableOpacity>
              ))}
            </Animated.View>
            <View style={styles.swatchContainer}>
              <TouchableOpacity
                onPress={() => {
                  paletteVisible.value !== true
                    ? (paletteVisible.value = true)
                    : (paletteVisible.value = false);
                }}
              >
                <Animated.View
                  style={[
                    {
                      backgroundColor: paletteColors[activePaletteColorIndex],
                    },
                    styles.swatch,
                    animatedSwatchStyle,
                  ]}
                />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={clearCanvas}>
              <AntDesign name="delete" size={24} color="black" />
              </TouchableOpacity>
            
            <Button title="Capture" onPress={captureCanvas}/>
            </View>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
    <StatusBar style="auto" />
  </>
);
}

const styles = StyleSheet.create({
icon: {
  fontSize: 40,
  textAlign: "center",
},
paletteColor: {
  width: 50,
  height: 50,
  borderRadius: 25,
  marginVertical: 5,
  zIndex: 2,
},
swatch: {
  width: 50,
  height: 50,
  borderRadius: 25,
  borderColor: "black",
  marginVertical: 5,
  zIndex: 1,
},
swatchContainer: {
  flexDirection: "row",
  flex: 1,
  padding: 10,
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 35,
},
});