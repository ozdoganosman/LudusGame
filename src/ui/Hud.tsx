import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from './palette';

type Props = {
  mission: string;
  score: number;
  highScore: number;
  lives: number;
  percent: number;
  target: number;
  /** Kasadaki + bu seferde kazanılan altın. */
  gold: number;
  /** Dolu kalkan sayısı. */
  shield: number;
  /** Kalkanın toplam kapasitesi; 0 ise gösterge çizilmez. */
  shieldCharges: number;
  onPause: () => void;
};

export const Hud = memo(function Hud({
  mission,
  score,
  highScore,
  lives,
  percent,
  target,
  gold,
  shield,
  shieldCharges,
  onPause,
}: Props) {
  const progress = Math.min(100, (percent / target) * 100);
  const reached = percent >= target;

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.missionBlock}>
          <Text style={styles.label}>GÖREV</Text>
          <Text style={styles.mission} numberOfLines={1}>
            {mission}
          </Text>
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

      <View style={styles.row}>
        <View style={styles.lives}>
          {Array.from({ length: Math.max(0, lives) }, (_, index) => (
            <View key={index} style={styles.life} />
          ))}
          {Array.from({ length: shieldCharges }, (_, index) => (
            <View key={`shield-${index}`} style={[styles.pip, index < shield && styles.pipFull]} />
          ))}
        </View>

        <View style={styles.purse}>
          <View style={styles.coin} />
          <Text style={styles.gold}>{gold.toLocaleString('tr-TR')}</Text>
        </View>
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
  missionBlock: {
    flex: 1,
    minWidth: 0,
  },
  mission: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  scoreBlock: {
    alignItems: 'flex-end',
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
    alignItems: 'center',
    gap: 6,
    height: 12,
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: palette.filledEdge,
  },
  pipFull: {
    backgroundColor: palette.filledEdge,
  },
  purse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coin: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: palette.gold,
  },
  gold: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  life: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.playerGlow,
  },
});
