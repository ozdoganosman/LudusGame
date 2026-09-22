import { Pressable, StyleSheet, Text } from 'react-native';

import { palette } from './palette';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
};

export function Button({ label, onPress, variant = 'solid' }: Props) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        ghost ? styles.ghost : styles.solid,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, ghost && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  solid: {
    backgroundColor: palette.accent,
  },
  ghost: {
    borderWidth: 1,
    borderColor: palette.filled,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    color: palette.background,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  ghostLabel: {
    color: palette.text,
  },
});
