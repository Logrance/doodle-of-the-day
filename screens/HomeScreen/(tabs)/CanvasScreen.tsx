import React, { useState, useRef,useCallback, useEffect, Children } from 'react';
import { View, Dimensions, TouchableOpacity, StyleSheet, Alert, Text, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { GestureHandlerRootView} from 'react-native-gesture-handler'
import { Canvas, Path, useCanvasRef, SkPath, Skia, Rect } from '@shopify/react-native-skia';
import { StatusBar } from 'expo-status-bar';
import { db, getCallableFunction } from '../../../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { CurrentRenderContext } from '@react-navigation/native';

type AddImageResponse = { data: { message: string } };


export default function CanvasScreen() {
  const { width, height } = Dimensions.get("window");
  //const [paths, setPaths] = useState<SkPath[]>([]);
  const [isVisible, setIsVisible] = useState(false); 
  const [currentPage, setCurrentPage] = useState(1);

    //For word theme state
    const [word, setWord] = useState<string | null>(null);


  const ref = useCanvasRef();

  const handleNextPage = () => setCurrentPage((prev) => prev + 1);

  //New code
  const currentPath = useRef<SkPath | null>(null);
  const [paths, setPaths] = useState<SkPath[]>([]);

  const updatePaths = useCallback((newPath: SkPath) => {
    setPaths((prevState) => [...prevState, newPath]);
  }, []);

  const drawGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin(({x, y}) => {
      currentPath.current = Skia.Path.Make();
      currentPath.current.moveTo(x, y);
      runOnJS(updatePaths)(currentPath.current);
    })
    .onUpdate(({x, y}) => {
      if (currentPath.current) {
        currentPath.current.lineTo(x, y);
        setPaths((prev) => [...prev]);
      }
    });





    //Canvas drawing logic
    /*const onDrawingStart = useCallback((touchInfo: TouchInfo) => {
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
    ); */



  const clearCanvas = () => {
    setPaths([]);
  };


const addImageToDB = async (imageBase64: string) => {
  try {
    const addImage = getCallableFunction("addImageToDB") as unknown as (params: { imageBase64: string }) => Promise<AddImageResponse>;
    const response = await addImage({ imageBase64 });
    Alert.alert("Success", response.data.message);
    clearCanvas();
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
        onPress: () => {
  const image = ref.current?.makeImageSnapshot();
    const imageConversion = image.encodeToBase64();
     addImageToDB(imageConversion);
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


   
return (
  <>
  <GestureHandlerRootView>
  <SafeAreaView style={{ flex: 1}} edges={['top', 'left', 'right']}>
    
      <GestureDetector gesture={drawGesture}>
          <Canvas style={{ flex: 8 }} ref={ref}>
          <Rect x={0} y={0} width={width} height={height} color="white" />
            {Children.toArray(paths.map((path, index) => (
              <Path
                key={index}
                path={path}
                strokeWidth={5}
                style="stroke"
                color={"black"}
              />
            )))}
          </Canvas>
        </GestureDetector>
          
        
          <View style={styles.swatchContainer}>
              <TouchableOpacity onPress={clearCanvas} style={styles.buttonAnother}>
              <AntDesign name="delete" size={24} color="black" />
              </TouchableOpacity>

               <Text style={{ 
                fontFamily: 'PressStart2P_400Regular',
                textAlign: 'center',
                lineHeight: 22,
                fontSize: 14,
              }}
            >
                Today's theme:{"\n"}{word || "Loading..."}
            </Text>
            
              <TouchableOpacity onPress={captureCanvas} style={styles.buttonOther}>
              <MaterialIcons name="keyboard-return" size={24} color="black" />
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
                • In our app, there’s no eraser. Why? Because we want you to be bold! But don’t worry—there is a delete button if you’ve been a little too bold. 
                {"\n"}
                • We’ve also kept it simple with just one line thickness and no colour options. Why? Too many options can get in the way of creativity.
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
  padding: 10,
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#edede9",
},
buttonOther: {
  backgroundColor: 'rgb(224,183,202)',
  padding:7,
  borderRadius: 10,
},
buttonAnother: {
  backgroundColor: 'rgba(2,52,72, 0.5)',
  padding:7,
  borderRadius: 10,
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
  fontFamily: 'Poppins_700Bold',
  lineHeight: 26,
},
titleText: {
  fontSize: 18,
  marginBottom: 20,
  textAlign: 'center',
  fontFamily: 'PressStart2P_400Regular',
  lineHeight: 26,
},
modalButton: {
  backgroundColor: 'rgba(2,52,72,0.7)',
  padding: 10,
  borderRadius: 10,
},
});