import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { auth, getCallableFunction } from "../firebaseConfig";

interface User {
  id: string;
  username: string;
  winCount: number;
}

type GetLeaderboardResponse = {
  leaderboard: User[];
  currentUserRank: number;
  currentUserData: User | null;
};

const LeaderboardScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const getLeaderboard = getCallableFunction("getLeaderboard");
      const response = await getLeaderboard();
      const data = response.data as GetLeaderboardResponse;

      setUsers(data.leaderboard);
      setCurrentUserRank(data.currentUserRank);
      setCurrentUserData(data.currentUserData);
      setCurrentUserId(auth.currentUser?.uid || null);
    } catch (error) {
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
