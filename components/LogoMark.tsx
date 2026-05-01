import React from 'react';
import { View, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface LogoMarkProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

// Five colored dots in a horizontal row to the left of the cow, on the same
// plane as its hooves — the cow is contemplating them as food.
const SPECK_COLORS = ['#800000', '#0047AB', '#50C878', '#FF7800', '#6B2FA0'];
const SPECK_RADIUS = 0.025;
const SPECK_Y = 0.65;
const SPECK_X_START = 0.05;
const SPECK_X_STEP = 0.05;
const SPECK_OPACITY = 0.95;

const SPECKS = SPECK_COLORS.map((c, i) => ({
  c,
  x: SPECK_X_START + i * SPECK_X_STEP,
  y: SPECK_Y,
  r: SPECK_RADIUS,
  o: SPECK_OPACITY,
}));

export default function LogoMark({ size = 120, style }: LogoMarkProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size * 0.23,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Image
        source={require('../assets/cow2_highcontrast.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      {SPECKS.map((s, i) => {
        const dim = size * s.r * 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: size * s.y - dim / 2,
              left: size * s.x - dim / 2,
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: s.c,
              opacity: s.o,
            }}
          />
        );
      })}
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
