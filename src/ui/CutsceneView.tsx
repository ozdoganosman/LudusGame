import { Canvas, Group } from '@shopify/react-native-skia';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CUTSCENE_LENGTH, SCENE_H, SCENE_W, cutsceneFrame } from './cutscene';
import { ShapeNodes } from './SkiaShapes';
import { useGameLoop } from './useGameLoop';

type Props = {
  /** Temizlenen bölüm; null ise hikâyenin başı (enjeksiyon). */
  from: number | null;
  to: number;
  /** Sahne bitince ya da dokunulunca çağrılır. */
  onDone: () => void;
};

/**
 * Bölüm geçişi ara sahnesi (src/ui/cutscene): tam ekran, 100×160'lık sahne
 * ekrana ortalanıp sığdırılır. Dokununca geçilir.
 */
export function CutsceneView({ from, to, onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  const step = useCallback(
    (dt: number) => {
      timeRef.current += dt;
      if (timeRef.current >= CUTSCENE_LENGTH) finish();
      else setTime(timeRef.current);
    },
    [finish]
  );

  useGameLoop(step, true);

  const scale = Math.min(width / SCENE_W, height / SCENE_H);
  const left = (width - SCENE_W * scale) / 2;
  const top = (height - SCENE_H * scale) / 2;
  const frame = cutsceneFrame(from, to, time);

  return (
    <Pressable style={styles.root} onPress={finish}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ translateX: left }, { translateY: top }]}>
          <ShapeNodes shapes={frame.shapes} cell={scale} />
        </Group>
      </Canvas>
      {frame.texts.map((text, index) =>
        text.alpha > 0 && text.text.length > 0 ? (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.text,
              {
                // Sahne genişliğinde bir kutu, yazının x noktasına ortalanır.
                left: left + (text.x - SCENE_W / 2) * scale,
                width: SCENE_W * scale,
                top: top + text.y * scale - text.size * scale * 0.7,
                opacity: text.alpha,
              },
            ]}
          >
            <Text
              style={{
                color: text.color,
                fontSize: text.size * scale,
                lineHeight: text.size * scale * 1.4,
                fontWeight: text.bold ? '800' : '500',
              }}
            >
              {text.text}
            </Text>
          </View>
        ) : null
      )}
      <Text style={[styles.skip, { bottom: 16 + insets.bottom }]}>dokun: geç</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#07040f',
  },
  text: {
    position: 'absolute',
    alignItems: 'center',
  },
  skip: {
    position: 'absolute',
    right: 16,
    fontSize: 12,
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.45)',
  },
});
