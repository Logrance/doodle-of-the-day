import { collection, query, orderBy, getDocs } from "firebase/firestore";
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
      const q = query(
        collection(db, "users"),
        orderBy("winCount", "desc")  // Sort users by wins in descending order
      );

      const querySnapshot = await getDocs(q);
      const usersArray: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersArray.push({
          id: doc.id,
          username: data.username,
          winCount: data.winCount,
        });
      });
      setUsers(usersArray);
    } catch (error) {
      console.log("Error fetching leaderboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    const currentUser = auth.currentUser;
    if (currentUser) {
      setCurrentUserId(currentUser.uid);
    }

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
    borderRadius: 10,
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
