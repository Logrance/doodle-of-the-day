import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CanvasScreen() {
  return (
    <View style={styles.container}>
      <Text>Canvas will be here</Text>
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
