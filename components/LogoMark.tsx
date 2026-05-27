import React from 'react';
import { View, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface LogoMarkProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function LogoMark({ size = 120, style }: LogoMarkProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size * 0.23,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Image
        source={require('../assets/icon-mark.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
