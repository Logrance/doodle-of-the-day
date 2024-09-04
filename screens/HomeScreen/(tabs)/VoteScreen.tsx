import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function VoteScreen() {
  return (
    <View style={styles.container}>
      <Text>Voting will take place here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
