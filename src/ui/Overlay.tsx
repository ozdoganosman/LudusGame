import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { palette } from './palette';

export type OverlayAction = {
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  subtitle?: string;
  /** Seyir defteri kutusundaki satırlar (açılış hikâyesi). */
  story?: string[];
  rows?: { label: string; value: string }[];
  hint?: string;
  primary: OverlayAction;
  secondary?: OverlayAction;
};

/** Oyun alanının üzerine binen menü / duraklatma / sonuç paneli. */
export function Overlay({ title, subtitle, story, rows, hint, primary, secondary }: Props) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {story && story.length > 0 ? (
          <View style={styles.story}>
            {story.map((line) => (
              <Text key={line} style={styles.storyLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {rows && rows.length > 0 ? (
          <View style={styles.rows}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        <View style={styles.actions}>
          <Button label={primary.label} onPress={primary.onPress} />
          {secondary ? (
            <Button label={secondary.label} onPress={secondary.onPress} variant="ghost" />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 7, 15, 0.86)',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.filled,
    backgroundColor: palette.surface,
    padding: 22,
    gap: 12,
  },
  title: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    color: palette.textDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  story: {
    gap: 7,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.surfaceEdge,
    backgroundColor: 'rgba(10, 6, 22, 0.6)',
  },
  storyLine: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 19,
  },
  rows: {
    gap: 8,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: palette.textDim,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  rowValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
});
