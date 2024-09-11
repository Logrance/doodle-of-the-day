import React, { useRef, useState, useEffect } from 'react';
import { View, Dimensions, TouchableOpacity, StyleSheet, Button, Alert } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler'
import { Canvas, Circle, Path, Skia, ImageSVG, useCanvasRef } from '@shopify/react-native-skia';
import Animated, {useSharedValue, withTiming, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';

interface IPath {
  segments: String[];
  color?: string;
}

interface ICircle {
  x: number;
  y: number;
}
interface IStamp {
  x: number;
  y: number;
  color: string;
}

enum Tools {
  Pencil,
  Stamp,
}


export default function CanvasScreen() {
  const { width, height } = Dimensions.get("window");

  const paletteColors = ["red", "green", "blue", "yellow"];

  const svgStar =
    '<svg class="star-svg" version="1.1" ……………..></polygon></svg>';

  const [activePaletteColorIndex, setActivePaletteColorIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<Tools>(Tools.Pencil);
  const [paths, setPaths] = useState<IPath[]>([]);
  const [circles, setCircles] = useState<ICircle[]>([]);
  const [stamps, setStamps] = useState<IStamp[]>([]);

  //added for saving image logic
  const [capturedImage, setCapturedImage] = useState('')
  const ref = useCanvasRef();

  //Defining a Pan Gesture
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onStart((g) => {
      if (activeTool === Tools.Pencil) {
        const newPaths = [...paths];
        newPaths[paths.length] = {
          segments: [],
          color: paletteColors[activePaletteColorIndex],
        };
        newPaths[paths.length].segments.push(`M ${g.x} ${g.y}`);
        setPaths(newPaths);
      }
    })
    .onUpdate((g) => {
      if (activeTool === Tools.Pencil) {
        const index = paths.length - 1;
        const newPaths = [...paths];
        if (newPaths?.[index]?.segments) {
          newPaths[index].segments.push(`L ${g.x} ${g.y}`);
          setPaths(newPaths);
        }
      }
    })
    .onTouchesUp((g) => {
      if (activeTool === Tools.Pencil) {
        const newPaths = [...paths];
        setPaths(newPaths);
      }
    })
    .minDistance(1);

    //defining a tap gesture
    const tap = Gesture.Tap()
    .runOnJS(true)
    .onStart((g) => {
      if (activeTool === Tools.Stamp) {
        setStamps([
          ...stamps,
          {
            x: g.x - 25,
            y: g.y - 25,
            color: paletteColors[activePaletteColorIndex],
          },
        ]);
      }
    });

  const clearCanvas = () => {
    setPaths([]);
    setCircles([]);
    setStamps([]);
  };

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


//Canvas snapshot and send to Firestore db
const addImageToDB = async (imageBase64: string) => {
  try {
    const docRef = await addDoc(collection(db, 'drawings'), {
      title: "Captured Image",  
      done: false,
      image: imageBase64,  
    });
    console.log('Document written with ID: ', docRef.id);
  } catch (e) {
    console.error('Error adding document: ', e);
  }
}; 

const captureCanvas = () => {
  const image = ref.current?.makeImageSnapshot();

  if (image) {
    const imageConversion = image.encodeToBase64();
     addImageToDB(imageConversion);
    Alert.alert("Canvas Captured", "The canvas snapshot was successfully captured!");
  } else {
    Alert.alert("Capture Failed", "Could not capture the canvas.");
  }
}; 


  return (
    <>
    <GestureHandlerRootView>
      <View style={{ height, width }}>
        <GestureDetector gesture={tap}>
          <GestureDetector gesture={pan}>
            <Canvas style={{ flex: 8 }} ref={ref}>
              {circles.map((c, index) => (
                <Circle key={index} cx={c.x} cy={c.y} r={10} />
              ))}
              {paths.map((p, index) => (
                <Path
                  key={index}
                  path={p.segments.join(" ")}
                  strokeWidth={5}
                  style="stroke"
                  color={p.color}
                />
              ))}
              {stamps.map((s, index) => {
                const image = Skia.SVG.MakeFromString(
                  svgStar.replace("{{fillColor}}", s.color)
                );
                if (!image) return null;
                return (
                  <ImageSVG
                    key={index}
                    width={50}
                    height={50}
                    x={s.x}
                    y={s.y}
                    svg={image}
                  />
                );
              })}
            </Canvas>
          </GestureDetector>
        </GestureDetector>
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
              <View>
                {activeTool === Tools.Pencil ? (
                  <TouchableOpacity
                    onPress={() => setActiveTool(Tools.Stamp)}
                  >
                    <FontAwesome5
                      name="pencil-alt"
                      style={styles.icon}
                    ></FontAwesome5>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setActiveTool(Tools.Pencil)}
                  >
                    <FontAwesome5
                      name="stamp"
                      style={styles.icon}
                    ></FontAwesome5>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={clearCanvas}>
              <AntDesign name="delete" size={24} color="black" />
              </TouchableOpacity>
              {/*<TouchableOpacity onPress={}>
              <AntDesign name="save" size={24} color="black" />
            </TouchableOpacity>*/}
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
},
});
