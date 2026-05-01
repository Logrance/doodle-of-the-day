import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

type BadgeVariant = 'default' | 'gold';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export default function Badge({ label, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.container, variant === 'gold' ? styles.gold : styles.default, style]}>
      <Text style={[styles.label, variant === 'gold' ? styles.labelGold : styles.labelDefault]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: colors.navyAlpha08,
  },
  gold: {
    backgroundColor: colors.gold,
  },
  label: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },
  labelDefault: {
    color: colors.navy,
  },
  labelGold: {
    color: colors.navy,
  },
});
