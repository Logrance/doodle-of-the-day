import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import CowLoader from '../components/CowLoader';
import { useNavigation } from "@react-navigation/native";
import { auth, getCallableFunction } from "../firebaseConfig";
import { colors } from '../theme/colors';
import { hasUnlock } from '../theme/unlocks';
import FeatureTip from '../components/FeatureTip';

interface User {
  id: string;
  username: string;
  winCount: number;
  currentStreak: number;
}

const tierMark = (streak: number): string | null => {
  if (hasUnlock(streak, 'master')) return '👑';
  if (hasUnlock(streak, 'veteran')) return '⭐';
  return null;
};

const ord = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

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
  const navigation = useNavigation<any>();
  const openProfile = (id: string) =>
    navigation.navigate('PublicProfileScreen', { userId: id });

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

  // Dense ranking: tied users share a rank, next distinct count is rank+1
  // (so three tied for 1st → next user is 2nd, not 4th).
  const ranks: number[] = [];
  users.forEach((u, i) => {
    if (i === 0) ranks.push(1);
    else if (u.winCount === users[i - 1].winCount) ranks.push(ranks[i - 1]);
    else ranks.push(ranks[i - 1] + 1);
  });

  const usersByRank = new Map<number, User[]>();
  users.forEach((u, i) => {
    const r = ranks[i];
    const arr = usersByRank.get(r) ?? [];
    arr.push(u);
    usersByRank.set(r, arr);
  });

  // Podium positions: silver-left, gold-centre, bronze-right.
  const podiumHeights = [70, 96, 56];
  const podiumMedals = ['🥈', '🥇', '🥉'];
  const podiumOrder: number[] = [2, 1, 3];
  const podiumSlots = podiumOrder.map((rank) => {
    const arr = usersByRank.get(rank) ?? [];
    return { rank, user: arr.length === 1 ? arr[0] : null, tied: arr.length > 1 };
  });

  // Ties that landed on a podium rank — surfaced as a group above the list.
  const tiedPodiumGroups = [1, 2, 3]
    .map((rank) => ({ rank, users: usersByRank.get(rank) ?? [] }))
    .filter((g) => g.users.length > 1);

  // Everyone below the podium ranks goes in the regular list.
  const listEntries = users
    .map((user, i) => ({ user, rank: ranks[i] }))
    .filter((e) => e.rank > 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
          {users.length > 0 && (
            <FeatureTip
              tipId="tap-author-names"
              style={styles.tipSpacing}
              title="Explore artists"
              text="Tap anyone's name to see their profile and favourite drawings."
            />
          )}
          {users.length > 0 && (
            <View style={styles.podiumContainer}>
              {podiumSlots.map((slot, i) => {
                if (slot.user) {
                  const u = slot.user;
                  return (
                    <TouchableOpacity
                      key={`slot-${slot.rank}`}
                      style={styles.podiumSlot}
                      activeOpacity={0.7}
                      onPress={() => openProfile(u.id)}
                    >
                      <Text style={styles.podiumMedal}>{podiumMedals[i]}</Text>
                      <Text
                        style={[styles.podiumName, u.id === currentUserId && styles.podiumNameSelf]}
                        numberOfLines={1}
                      >
                        {tierMark(u.currentStreak) ? `${tierMark(u.currentStreak)} ` : ''}{u.username}
                      </Text>
                      <Text style={styles.podiumWins}>
                        {u.winCount} {u.winCount === 1 ? 'win' : 'wins'}
                      </Text>
                      <View
                        style={[
                          styles.podiumBlock,
                          { height: podiumHeights[i] },
                          slot.rank === 1 && styles.podiumBlockGold,
                          slot.rank === 2 && styles.podiumBlockSilver,
                          slot.rank === 3 && styles.podiumBlockBronze,
                        ]}
                      >
                        <Text style={styles.podiumPlace}>{slot.rank}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                if (slot.tied) {
                  return (
                    <View key={`slot-tied-${slot.rank}`} style={styles.podiumSlot}>
                      <Text style={[styles.podiumMedal, styles.podiumMuted]}>{podiumMedals[i]}</Text>
                      <Text style={[styles.podiumName, styles.podiumMuted]} numberOfLines={1}>Tied</Text>
                      <Text style={[styles.podiumWins, styles.podiumMuted]}>see below</Text>
                      <View
                        style={[
                          styles.podiumBlock,
                          styles.podiumBlockMuted,
                          { height: podiumHeights[i] },
                        ]}
                      >
                        <Text style={styles.podiumPlace}>{slot.rank}</Text>
                      </View>
                    </View>
                  );
                }
                return <View key={`slot-empty-${i}`} style={[styles.podiumSlot, { opacity: 0 }]} />;
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
              data={listEntries}
              keyExtractor={(item) => item.user.id}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                tiedPodiumGroups.length > 0 ? (
                  <View style={styles.tiedGroupsContainer}>
                    {tiedPodiumGroups.map((g) => (
                      <View key={`tied-${g.rank}`} style={styles.tiedGroupCard}>
                        <Text style={styles.tiedGroupHeader}>Tied for {ord(g.rank)}</Text>
                        {g.users.map((u) => (
                          <TouchableOpacity
                            key={u.id}
                            activeOpacity={0.7}
                            onPress={() => openProfile(u.id)}
                            style={[styles.tiedUserRow, u.id === currentUserId && styles.currentUserItem]}
                          >
                            <Text style={styles.username}>
                              {tierMark(u.currentStreak) ? `${tierMark(u.currentStreak)} ` : ''}{u.username}
                            </Text>
                            <Text style={styles.wins}>
                              {u.winCount} {u.winCount === 1 ? 'win' : 'wins'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openProfile(item.user.id)}
                  style={[styles.leaderboardItem, item.user.id === currentUserId && styles.currentUserItem]}
                >
                  <Text style={styles.rankNumber}>{item.rank}</Text>
                  <Text style={styles.username}>{tierMark(item.user.currentStreak) ? `${tierMark(item.user.currentStreak)} ` : ''}{item.user.username}</Text>
                  <Text style={styles.wins}>{item.user.winCount} {item.user.winCount === 1 ? 'win' : 'wins'}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
          {currentUserRank !== null && currentUserRank > 12 && currentUserData && (
            <>
              <View style={styles.divider} />
              <View style={[styles.leaderboardItem, styles.currentUserItem, styles.currentUserSticky]}>
                <Text style={styles.rankNumber}>{currentUserRank}</Text>
                <Text style={styles.username}>{tierMark(currentUserData.currentStreak) ? `${tierMark(currentUserData.currentStreak)} ` : ''}{currentUserData.username}</Text>
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
  tipSpacing: {
    marginHorizontal: 16,
    marginTop: 12,
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
  podiumBlockMuted: { backgroundColor: colors.textMuted },
  podiumMuted: { opacity: 0.5 },
  tiedGroupsContainer: {
    marginBottom: 4,
  },
  tiedGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tiedGroupHeader: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tiedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
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
