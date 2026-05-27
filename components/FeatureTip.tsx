import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFeatureTip } from '../hooks/useFeatureTip';
import { colors } from '../theme/colors';

type Props = {
  // Stable id used to remember dismissal. Reuse the same id across screens to
  // show a hint only once even if it appears in more than one place.
  tipId: string;
  text: string;
  title?: string;
  // Draws a small caret pointing at the element above ('up') or below ('down')
  // the tip. 'none' renders a plain card.
  arrow?: 'up' | 'down' | 'none';
  style?: StyleProp<ViewStyle>;
};

export default function FeatureTip({ tipId, text, title, arrow = 'none', style }: Props) {
  const { visible, dismiss } = useFeatureTip(tipId);
  if (!visible) return null;

  return (
    <View style={[styles.wrap, style]}>
      {arrow === 'up' && <View style={[styles.arrow, styles.arrowUp]} />}
      <View style={styles.card}>
        <View style={styles.textWrap}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.text}>{text}</Text>
        </View>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.dismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tip"
        >
          <Ionicons name="close" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
      {arrow === 'down' && <View style={[styles.arrow, styles.arrowDown]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  textWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.white,
    marginBottom: 2,
  },
  text: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.white,
    lineHeight: 18,
  },
  dismiss: {
    padding: 6,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
  arrowUp: {
    borderBottomWidth: 8,
    borderBottomColor: colors.navy,
    marginBottom: -1,
  },
  arrowDown: {
    borderTopWidth: 8,
    borderTopColor: colors.navy,
    marginTop: -1,
  },
});
