import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { collection, getDocs, query, where } from "firebase/firestore"; 
import { db } from '../../../firebaseConfig';
import { auth } from '../../../firebaseConfig';



export default function VoteScreen() {

  const [drawingInfo, setDrawingInfo] = useState<any | undefined>(null)

  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No user is signed in");
      }
  
    
      const q = query(collection(db, "drawings"), where("userId", "==", user.uid));
  
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("No documents found for this user!");
      } else {
        querySnapshot.forEach((doc) => {
          const base64Image = doc.data()?.image;
          setDrawingInfo(base64Image); 
          console.log("Document data:", doc.data());
        });
      }
    } catch (error) {
      console.error("Error fetching documents: ", error);
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
