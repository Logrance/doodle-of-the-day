import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { doc, getDoc } from "firebase/firestore"; 
import { db } from '../../../firebaseConfig';



export default function VoteScreen() {

  const [drawingInfo, setDrawingInfo] = useState<any | undefined>(null)

 const fetchData = async () => {
  const docRef = doc(db, "drawings", "8R0eWLLsn5jCiAAAZEnX");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
    const base64Image = docSnap.data()?.image;
    setDrawingInfo(base64Image);
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
  }
 };
  
 useEffect(() => {
  fetchData();
 }, [])

  return (
    <View style={styles.container}>
     <Image 
        source={{ uri: `data:image/png;base64,${drawingInfo}` }} 
        style={styles.image}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
});
