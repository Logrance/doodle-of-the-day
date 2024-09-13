import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, FlatList, Text, Button } from 'react-native';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, increment } from "firebase/firestore"; 
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

      //Test code for getting all the other user images to cote on
      const q = query(
        collection(db, "drawings"),
        where("userId", "!=", user.uid),
        orderBy("votes", "desc"),
        orderBy("userId", "desc")
      );

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.log("No documents init");
      } else {
        const drawingArray: any[] = [];
        querySnapshot.forEach((doc) => {
          drawingArray.push({ id: doc.id, ...doc.data() });
        });
        setDrawingInfo(drawingArray);
      }
    } catch (error) {
      console.log("Error message", error);
    }
  };
  
  //Voting logic

  const handleVote = async (userId: string) => {

    try {
      const drawingRef = doc(db, "drawings", userId);
      await updateDoc(drawingRef, {
        votes: increment(1)
      });
      fetchData();
    } catch (error) {
      console.log("Error", error)
    }
  }; 
  
 useEffect(() => {
  fetchData();
 }, [])

  return (
    <View style={styles.container}>
        <FlatList
          data={drawingInfo}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.drawingContainer}>
               <Image 
                source={{ uri: `data:image/png;base64,${item.image}` }} 
                style={styles.image}
                />
                <Text>{item.votes || 0}</Text>
                <Button title="Vote" onPress={() => handleVote(item.id)} /> 
            </View>
          )}
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
  drawingContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
});
