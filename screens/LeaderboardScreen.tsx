import { collection, query, orderBy, getDocs, limit, getDoc, doc } from "firebase/firestore";
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
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const allUsersQuery = query(
        collection(db, "users"),
        orderBy("winCount", "desc")
      );
  
      const querySnapshot = await getDocs(allUsersQuery);
      const allUsersArray: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allUsersArray.push({
          id: doc.id,
          username: data.username,
          winCount: data.winCount,
        });
      });
  
      // Get the current user
      const currentUser = auth.currentUser;
      let currentUserRank = -1;
      let currentUserData: User | null = null;
  
      if (currentUser) {
        setCurrentUserId(currentUser.uid);
        
        // Find the rank of the current user in the sorted list
        currentUserRank = allUsersArray.findIndex(
          (user) => user.id === currentUser.uid
        ) + 1;

        // If the current user is outside the top 10, get their data
        if (currentUserRank > 12) {
          currentUserData = allUsersArray.find(
            (user) => user.id === currentUser.uid
          ) || null;
        }
      }
  
      // Update state with top 10 users, current user rank, and data if outside top 10
      setUsers(allUsersArray.slice(0, 12));
      setCurrentUserRank(currentUserRank);
      setCurrentUserData(currentUserData);
  
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
        <>
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
            showsVerticalScrollIndicator={false}
          />
          {/* Show the current user’s rank if they’re outside the top 10 */}
          {currentUserRank > 12 && currentUserData && (
            <View style={styles.leaderboardItemTwo}>
              <Text style={styles.rank}>{currentUserRank}</Text>
              <Text style={styles.username}>{currentUserData.username}</Text>
              <Text style={styles.wins}>Wins: {currentUserData.winCount}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    //padding: 20,
    paddingHorizontal: 20,
    paddingTop: 5,
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
  leaderboardItemTwo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    backgroundColor: '#d1e7ff',
  },
  rank: {
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
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  currentUserItem: {
    backgroundColor: '#d1e7ff', 
  },
});

export default LeaderboardScreen;
