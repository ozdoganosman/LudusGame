import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from './palette';

type Props = {
  level: number;
  score: number;
  highScore: number;
  lives: number;
  percent: number;
  target: number;
  onPause: () => void;
};

export const Hud = memo(function Hud({
  level,
  score,
  highScore,
  lives,
  percent,
  target,
  onPause,
}: Props) {
  const progress = Math.min(100, (percent / target) * 100);
  const reached = percent >= target;

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>SEVİYE</Text>
          <Text style={styles.level}>{level}</Text>
        </View>

        <View style={styles.scoreBlock}>
          <Text style={styles.score}>{score.toLocaleString('tr-TR')}</Text>
          <Text style={styles.label}>REKOR {highScore.toLocaleString('tr-TR')}</Text>
        </View>

        <Pressable onPress={onPause} style={styles.pause} hitSlop={12}>
          <View style={styles.pauseBar} />
          <View style={styles.pauseBar} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${progress}%`, backgroundColor: reached ? palette.gold : palette.accent },
            ]}
          />
        </View>
        <Text style={[styles.percent, reached && { color: palette.gold }]}>
          %{percent.toFixed(1)} / %{target}
        </Text>
      </View>

      <View style={styles.lives}>
        {Array.from({ length: Math.max(0, lives) }, (_, index) => (
          <View key={index} style={styles.life} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: palette.textDim,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  level: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
  },
  score: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  pause: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.filled,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pauseBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: palette.accent,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percent: {
    color: palette.textDim,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 92,
    textAlign: 'right',
  },
  lives: {
    flexDirection: 'row',
    gap: 6,
    height: 10,
  },
  life: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.playerGlow,
  },
});
