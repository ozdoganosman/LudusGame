import { memo, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { NEUTRAL, snapToEight } from '../engine/input';
import type { Input } from '../engine/types';
import { palette } from './palette';

/** Topuzun merkezden çıkabileceği en büyük uzaklık (px). */
const KNOB_RANGE = 54;

type Stick = {
  origin: { x: number; y: number };
  knob: { x: number; y: number };
};

type Props = {
  onChange: (input: Input) => void;
  height: number;
};

/**
 * Serbest yerleşimli joystick: parmağın ilk değdiği nokta merkez olur,
 * böylece oyuncu ekranın alt bölgesinde istediği yerden kontrol edebilir.
 */
export const Joystick = memo(function Joystick({ onChange, height }: Props) {
  // Render sırasında hem merkezi hem topuzu çizmek için tek durumda tutuyoruz.
  const [stick, setStick] = useState<Stick | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const responder = useMemo(() => {
    const release = () => {
      origin.current = null;
      setStick(null);
      onChangeRef.current(NEUTRAL);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        origin.current = { x: locationX, y: locationY };
        setStick({ origin: { x: locationX, y: locationY }, knob: { x: locationX, y: locationY } });
        onChangeRef.current(NEUTRAL);
      },
      onPanResponderMove: (_event, gesture) => {
        const base = origin.current;
        if (!base) return;
        const distance = Math.hypot(gesture.dx, gesture.dy);
        const scale = distance > KNOB_RANGE ? KNOB_RANGE / distance : 1;
        setStick({
          origin: base,
          knob: { x: base.x + gesture.dx * scale, y: base.y + gesture.dy * scale },
        });
        onChangeRef.current(snapToEight(gesture.dx, gesture.dy));
      },
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    });
  }, []);

  return (
    <View style={[styles.zone, { height }]} {...responder.panHandlers}>
      {stick ? (
        <>
          <View
            style={[
              styles.base,
              { left: stick.origin.x - KNOB_RANGE, top: stick.origin.y - KNOB_RANGE },
            ]}
          />
          <View style={[styles.knob, { left: stick.knob.x - 22, top: stick.knob.y - 22 }]} />
        </>
      ) : (
        <View style={styles.hintWrap} pointerEvents="none">
          <View style={styles.hintRing} />
          <View style={styles.hintDot} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  zone: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  base: {
    position: 'absolute',
    width: KNOB_RANGE * 2,
    height: KNOB_RANGE * 2,
    borderRadius: KNOB_RANGE,
    borderWidth: 2,
    borderColor: palette.filledEdge,
    opacity: 0.45,
  },
  knob: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.accent,
    opacity: 0.85,
  },
  hintWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: palette.filled,
    opacity: 0.5,
  },
  hintDot: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.filled,
    opacity: 0.6,
  },
});
