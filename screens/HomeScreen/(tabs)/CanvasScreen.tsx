import React, { useState, useCallback, useEffect } from 'react';
import { View, Dimensions, TouchableOpacity, StyleSheet, Alert, Text, Modal } from 'react-native';
import { GestureHandlerRootView} from 'react-native-gesture-handler'
import { Canvas, Path, useCanvasRef, SkPath, Skia, TouchInfo, useTouchHandler, Rect } from '@shopify/react-native-skia';
import { StatusBar } from 'expo-status-bar';
import { collection, addDoc, where, getDocs, query, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth, getCallableFunction } from '../../../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


export default function CanvasScreen() {
  const { width, height } = Dimensions.get("window");
  const [paths, setPaths] = useState<SkPath[]>([]);
  const [isVisible, setIsVisible] = useState(false); 

    //For word theme state
    const [word, setWord] = useState<string | null>(null);

  const ref = useCanvasRef();

    //Canvas drawing logic
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

  const clearCanvas = () => {
    setPaths([]);
  };


//Canvas snapshot and send to Firestore db

const addImageToDB = async (imageBase64: string) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No user is signed in");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    
    const querySnapshot = await getDocs(query(
      collection(db, 'drawings'),
      where('userId', '==', user.uid),
      where('date', '>=', today.getTime()),
      where('date', '<', today.getTime() + (24 * 60 * 60 * 1000)) 
    ));

    // Check if there are any existing drawings for today
    if (querySnapshot.empty) {
      // No drawings found, proceed with adding the new drawing
      await addDoc(collection(db, 'drawings'), {
        title: "Captured Image",  
        done: false,
        image: imageBase64,  
        userId: user.uid,
        votes: 0,
        date: Date.now(),
      });
      Alert.alert("Drawing Submitted", "Thanks for submitting your doodle for today!");
      clearCanvas();
    } else {
      Alert.alert("Submission Failed", "You have already doodled today!");
      clearCanvas();
    }
  } catch (e) {
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

  // Fetch user tutorial status
  useEffect(() => {
    const fetchUserAndCheckTutorial = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Show tutorial if not seen
          if (!userData.hasSeenTutorial) {
            setIsVisible(true);
          }
        }
      }
    };
    fetchUserAndCheckTutorial();
  }, []);

    // Handle modal close
    const handleModalClose = async () => {
      setIsVisible(false); 
  
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { hasSeenTutorial: true });
      }
    };

    useEffect(() => {
      const fetchWord = async () => {
        try {
          const fetchLatestWord = getCallableFunction("fetchLatestWord") as unknown as () => Promise<{ data: { word: string } }>;
          const response = await fetchLatestWord();
    
          setWord(response.data.word);
        } catch (error) {
        }
      };
    
      fetchWord();
    }, []);


return (
  <>
  <GestureHandlerRootView>
    <View style={{ height, width }}>
      
        
          <Canvas style={{ flex: 8 }} ref={ref} onTouch={touchHandler}>
          <Rect x={0} y={0} width={width} height={height} color="white" />
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
          <View style={{ flex: 1, flexDirection: "row"}}>
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
          </View>
        </View>
      </View>

      <Modal visible={isVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.titleText}>
              Welcome to Doodle of the Day! Here's how the app works: 
              </Text>
                <Text style={styles.modalText}>
                • Draw your picture based on the daily theme by 12pm UK time.
                {"\n"}
                • At 12pm you are allocated a voting room. You have one vote, and once cast, it can't be taken back, so use it wisely.
                {"\n"}
                • Winners are picked at 6pm.
              </Text>
              <TouchableOpacity onPress={handleModalClose} style={styles.modalButton}>
                <Text style={styles.buttonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  marginBottom: 35,
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