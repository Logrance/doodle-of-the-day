import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import CowLoader from '../components/CowLoader';
import { auth, getCallableFunction } from "../firebaseConfig";
import { colors } from '../theme/colors';

interface User {
  id: string;
  username: string;
  winCount: number;
}

type GetLeaderboardResponse = {
  leaderboard: User[];
  currentUserRank: number | null;
  currentUserData: User | null;
};

type Range = 'week' | 'month' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  week: 'Weekly',
  month: 'Monthly',
  all: 'All-time',
};

const LeaderboardScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [range, setRange] = useState<Range>('all');

  const fetchLeaderboard = async (selected: Range) => {
    setLoading(true);
    try {
      const getLeaderboard = getCallableFunction("getLeaderboardByRange");
      const response = await getLeaderboard({ range: selected });
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
    fetchLeaderboard(range);
  }, [range]);

  const { height: screenHeight } = Dimensions.get('window');
  const loaderSize = screenHeight < 667 ? 80 : 100;

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumHeights = [70, 96, 56];
  const podiumMedals = ['🥈', '🥇', '🥉'];
  const podiumPlaces = [2, 1, 3];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.segmented}>
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={[styles.segment, range === r && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, range === r && styles.segmentTextActive]}>
                {RANGE_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <CowLoader size={loaderSize} />
        </View>
      ) : (
        <>
          {top3.length > 0 && (
            <View style={styles.podiumContainer}>
              {podiumOrder.map((u, i) => {
                if (!u) return <View key={`empty-${i}`} style={[styles.podiumSlot, { opacity: 0 }]} />;
                const place = podiumPlaces[i];
                return (
                  <View key={u.id} style={styles.podiumSlot}>
                    <Text style={styles.podiumMedal}>{podiumMedals[i]}</Text>
                    <Text
                      style={[styles.podiumName, u.id === currentUserId && styles.podiumNameSelf]}
                      numberOfLines={1}
                    >
                      {u.username}
                    </Text>
                    <Text style={styles.podiumWins}>
                      {u.winCount} {u.winCount === 1 ? 'win' : 'wins'}
                    </Text>
                    <View
                      style={[
                        styles.podiumBlock,
                        { height: podiumHeights[i] },
                        place === 1 && styles.podiumBlockGold,
                        place === 2 && styles.podiumBlockSilver,
                        place === 3 && styles.podiumBlockBronze,
                      ]}
                    >
                      <Text style={styles.podiumPlace}>{place}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No wins yet</Text>
              <Text style={styles.emptySubtitle}>
                {range === 'week' ? 'Nobody has won this week — could be you next.' :
                  range === 'month' ? 'Nobody has won this month yet.' :
                  'Be the first to win!'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={rest}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <View style={[styles.leaderboardItem, item.id === currentUserId && styles.currentUserItem]}>
                  <Text style={styles.rankNumber}>{index + 4}</Text>
                  <Text style={styles.username}>{item.username}</Text>
                  <Text style={styles.wins}>{item.winCount} {item.winCount === 1 ? 'win' : 'wins'}</Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
          {currentUserRank !== null && currentUserRank > 12 && currentUserData && (
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
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceTrack,
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  segmentTextActive: {
    fontFamily: 'Poppins_700Bold',
    color: colors.navy,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  podiumMedal: {
    fontSize: 28,
    marginBottom: 2,
  },
  podiumName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    maxWidth: '100%',
  },
  podiumNameSelf: {
    color: colors.navy,
  },
  podiumWins: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumBlockGold: { backgroundColor: colors.gold },
  podiumBlockSilver: { backgroundColor: colors.silver },
  podiumBlockBronze: { backgroundColor: colors.bronze },
  podiumPlace: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: colors.white,
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  currentUserItem: {
    backgroundColor: colors.navyAlpha08,
    borderWidth: 1.5,
    borderColor: colors.navyAlpha20,
  },
  currentUserSticky: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  rankNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: colors.textMuted,
    width: 36,
  },
  username: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    flex: 1,
    marginLeft: 8,
    color: colors.textPrimary,
  },
  wins: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default LeaderboardScreen;
