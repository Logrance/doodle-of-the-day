import { collection, query, orderBy, getDocs, limit, where, getDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { db, auth } from "../firebaseConfig";

interface User {
  id: string;
  username: string;
  winCount: number;
}

const LeaderboardScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);


  const fetchLeaderboard = async () => {
    try {
      // Fetch top 10 users
      const top10Query = query(
        collection(db, "users"),
        orderBy("winCount", "desc"),
        limit(10) 
      );

      const querySnapshot = await getDocs(top10Query);
      const usersArray: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersArray.push({
          id: doc.id,
          username: data.username,
          winCount: data.winCount,
        });
      });

      // Get the current user
      const currentUser = auth.currentUser;
      if (currentUser) {
        setCurrentUserId(currentUser.uid);
        const isCurrentUserInTop10 = usersArray.some(user => user.id === currentUser.uid);

        // Fetch current user separately if they are not in the top 10
        if (!isCurrentUserInTop10) {
          const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (currentUserDoc.exists()) {
            const data = currentUserDoc.data();
            usersArray.push({
              id: currentUserDoc.id,
              username: data.username,
              winCount: data.winCount,
            });
          }
        }
      }

      // Update state with users
      setUsers(usersArray);
    } catch (error) {
      console.log("Error fetching leaderboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="grey" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View 
            style={[ 
              styles.leaderboardItem,
              item.id === currentUserId && styles.currentUserItem, 
              ]}
            >
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.wins}>Wins: {item.winCount}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  leaderboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  rank: {
   // fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'PressStart2P_400Regular',
  },
  username: {
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Poppins_400Regular',
  },
  wins: {
    //fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  currentUserItem: {
    backgroundColor: '#d1e7ff', 
  },
});

export default LeaderboardScreen;
