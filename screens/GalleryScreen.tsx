import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import UserDrawingsScreen from './UserDrawingsScreen';
import WinnerDrawingsScreen from './WinnerDrawingsScreen';

type GalleryRouteParams = {
  initialTab?: 'drawings' | 'winners';
};

type GalleryRoute = RouteProp<{ GalleryScreen: GalleryRouteParams }, 'GalleryScreen'>;

const GalleryScreen: React.FC = () => {
  const route = useRoute<GalleryRoute>();
  const [tab, setTab] = useState<'drawings' | 'winners'>(route.params?.initialTab || 'drawings');

  return (
    <View style={styles.container}>
      <View style={styles.segmented}>
        <TouchableOpacity
          onPress={() => setTab('drawings')}
          style={[styles.segment, tab === 'drawings' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, tab === 'drawings' && styles.segmentTextActive]}>
            My drawings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('winners')}
          style={[styles.segment, tab === 'winners' && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, tab === 'winners' && styles.segmentTextActive]}>
            My wins
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        {tab === 'drawings' ? <UserDrawingsScreen /> : <WinnerDrawingsScreen />}
      </View>
    </View>
  );
};

export default GalleryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  segmented: {
    flexDirection: 'row',
    margin: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#666',
  },
  segmentTextActive: {
    fontFamily: 'Poppins_700Bold',
    color: '#023448',
  },
  body: {
    flex: 1,
  },
});
