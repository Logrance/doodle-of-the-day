import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, FlatList, Text, Button } from 'react-native';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, increment, getDoc, setDoc, onSnapshot } from "firebase/firestore"; 
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


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch the user's drawing to get the roomId
    const userDrawingRef = query(
      collection(db, "drawings"),
      where("userId", "==", user.uid),
      where("date", ">=", today.getTime()),
      where("date", "<", today.getTime() + (24 * 60 * 60 * 1000))
    );
    
    const userDrawingSnapshot = await getDocs(userDrawingRef);

    if (userDrawingSnapshot.empty) {
      console.log("No drawing found for the current user.");
      return;
    }

    // Assuming the user has only one drawing for today, retrieve their roomId
    const userDrawing = userDrawingSnapshot.docs[0].data();
    const userRoomId = userDrawing.roomId;

      const q = query(
        collection(db, "drawings"),
        where("roomId", "==", userRoomId),
        where("userId", "!=", user.uid),
        where("date", '>=', today.getTime()), 
        where('date', '<', today.getTime() + (24 * 60 * 60 * 1000)),
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

 const handleVote = async (userId: string) => {
  const currentUser = auth.currentUser?.uid; // Get current user ID
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for consistent date checking

  if (!currentUser) {
    console.log("User not authenticated");
    return;
  }

  try {
    // Reference to the user's vote for today
    const voteRef = doc(db, "user_votes", `${currentUser}_${today.toISOString().split('T')[0]}`);

    // Fetch user's vote for today
    const voteDoc = await getDoc(voteRef);

    // If the user has already voted today
    if (voteDoc.exists()) {
      console.log("User has already voted today.");
      return;
    }

    // If user hasn't voted today, proceed to cast vote
    const drawingRef = doc(db, "drawings", userId);
    await updateDoc(drawingRef, {
      votes: increment(1)
    });

    // Store the vote in 'user_votes' collection
    await setDoc(voteRef, {
      userId: currentUser,
      drawingId: userId,
      voteDate: today
    });

    // Fetch updated data after voting
    fetchData();
  } catch (error) {
    console.log("Error voting:", error);
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
