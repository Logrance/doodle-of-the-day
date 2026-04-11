import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Dimensions } from "react-native";
import CowLoader from '../components/CowLoader';
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
  const { height: screenHeight } = Dimensions.get('window');
  const loaderSize = screenHeight < 667 ? 80 : 100;
  
  const medal = (index: number) => {
    if (index === 0) return '🥇 ';
    if (index === 1) return '🥈 ';
    if (index === 2) return '🥉 ';
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <CowLoader size={loaderSize} />
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View style={[styles.leaderboardItem, item.id === currentUserId && styles.currentUserItem]}>
                <Text style={styles.rank}>
                  {medal(index) ?? <Text style={styles.rankNumber}>{index + 1}</Text>}
                </Text>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.wins}>{item.winCount} {item.winCount === 1 ? 'win' : 'wins'}</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
          {currentUserRank > 12 && currentUserData && (
            <>
              <View style={styles.divider} />
              <View style={[styles.leaderboardItem, styles.currentUserItem, styles.currentUserSticky]}>
                <Text style={styles.rankNumber}>{currentUserRank}</Text>
                <Text style={styles.username}>{currentUserData.username}</Text>
                <Text style={styles.wins}>{currentUserData.winCount} {currentUserData.winCount === 1 ? 'win' : 'wins'}</Text>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f9' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#111',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  currentUserItem: {
    backgroundColor: 'rgba(2,52,72,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(2,52,72,0.2)',
  },
  currentUserSticky: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  rank: {
    fontSize: 20,
    width: 36,
  },
  rankNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#888',
    width: 36,
  },
  username: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    flex: 1,
    marginLeft: 8,
    color: '#111',
  },
  wins: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#555',
  },
});

export default LeaderboardScreen;
