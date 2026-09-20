import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { palette } from './palette';

type Props = {
  /** Basılıyken true, bırakılınca false. */
  onChange: (held: boolean) => void;
};

/**
 * Dalış tuşu: ele geçirilmiş alandan boş alana ancak bu basılıyken çıkılır.
 * Joystick'ten ayrı bir dokunuşla kullanılır, bu yüzden joystick alanının
 * üstünde ayrı bir öğe olarak durur.
 */
export const DiveButton = memo(function DiveButton({ onChange }: Props) {
  const [held, setHeld] = useState(false);

  const set = (value: boolean) => {
    setHeld(value);
    onChange(value);
  };

  return (
    <Pressable
      accessibilityLabel="Çiz"
      onPressIn={() => set(true)}
      onPressOut={() => set(false)}
      style={[styles.button, held && styles.held]}
    >
      <Text style={[styles.label, held && styles.heldLabel]}>ÇİZ</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: palette.accent,
    backgroundColor: 'rgba(93, 242, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  held: {
    backgroundColor: palette.accent,
  },
  label: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heldLabel: {
    color: palette.background,
  },
});
