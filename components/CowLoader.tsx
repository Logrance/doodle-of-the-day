import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';

type Props = {
  size?: 'small' | 'large' | number;
};

const CowLoader: React.FC<Props> = ({ size = 'large' }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.9, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]).start(() => loop());
    };

    loop();
    return () => {
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, [opacity, scale]);

  // increase default sizes so the cow is more visible across the app
  const numericSize = typeof size === 'number' ? Math.round(size * 1.6) : size === 'small' ? 28 : 64;

  return (
    <Animated.Image
      source={require('../assets/cow.png')}
      style={[styles.image, { width: numericSize, height: numericSize, opacity, transform: [{ scale }] }]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    // center handled by parent
  },
});

export default CowLoader;
