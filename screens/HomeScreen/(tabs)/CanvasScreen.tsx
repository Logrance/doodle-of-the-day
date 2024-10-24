import React, { useState, useCallback, useEffect } from 'react';
import { View, Dimensions, TouchableOpacity, StyleSheet, Button, Alert, Text, Modal } from 'react-native';
import { GestureHandlerRootView} from 'react-native-gesture-handler'
import { Canvas, Path, useCanvasRef, SkPath, Skia, TouchInfo, useTouchHandler } from '@shopify/react-native-skia';
import { StatusBar } from 'expo-status-bar';
import { collection, addDoc, where, getDocs, query, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';



export default function CanvasScreen() {
  const { width, height } = Dimensions.get("window");

  const [paths, setPaths] = useState<SkPath[]>([]);

  const [isVisible, setIsVisible] = useState(false); // Modal visibility state
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

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
      Alert.alert("Canvas Captured", "Thanks for submitting your doodle for today!");
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

  // Fetch user tutorial status
  useEffect(() => {
    const fetchUserAndCheckTutorial = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setHasSeenTutorial(userData.hasSeenTutorial);

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
      setIsVisible(false); // Close the modal
  
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { hasSeenTutorial: true });
        setHasSeenTutorial(true); // Update local state
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
          <View style={{ flex: 1, flexDirection: "row"}}>
          <View style={styles.swatchContainer}>
              
              <TouchableOpacity onPress={clearCanvas}>
              <AntDesign name="delete" size={24} color="black" />
              </TouchableOpacity>
            
              <TouchableOpacity onPress={captureCanvas} style={styles.buttonOther}>
               <Text style={styles.buttonText}>Capture</Text>
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
                • Draw your picture by 12pm UK time.
                {"\n"}
                • At 12pm you are allocated a voting room. You have one vote, and once cast, it can't be taken back, so use it wisely.
                {"\n"}
                • Winners are picked at 6pm.
              </Text>
              {/* Add any other tutorial content */}
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
  backgroundColor: 'rgba(2,52,72,0.7)',
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