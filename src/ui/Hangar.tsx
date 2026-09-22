import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { loadoutValue } from '../engine/upgrades';
import type { Loadout, PartId } from '../engine/upgrades';
import { Button } from './Button';
import { MAX_PART_LEVEL, partCards } from './parts';
import type { PartCard } from './parts';
import { palette } from './palette';
import { ShipPreview } from './ShipPreview';

type Props = {
  gold: number;
  loadout: Loadout;
  onBuy: (id: PartId) => void;
  onClose: () => void;
  /** Ekranın altındaki açıklama (görev sürerken uyarı metni). */
  note?: string;
};

/** Altınla gemi parçası alınan ekran. */
export function Hangar({ gold, loadout, onBuy, onClose, note }: Props) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        <Text style={styles.title}>HANGAR</Text>

        <View style={styles.head}>
          <View style={styles.preview}>
            <ShipPreview loadout={loadout} width={168} height={92} />
          </View>
          <View style={styles.purse}>
            <Text style={styles.label}>ALTIN</Text>
            <Text style={styles.gold}>{gold.toLocaleString('tr-TR')}</Text>
            <Text style={styles.label}>GEMİ DEĞERİ</Text>
            <Text style={styles.value}>{loadoutValue(loadout).toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {partCards(loadout, gold).map((card) => (
            <PartRow key={card.id} card={card} onBuy={onBuy} />
          ))}
        </ScrollView>

        {note ? <Text style={styles.note}>{note}</Text> : null}
        <Button label="GERİ DÖN" onPress={onClose} />
      </View>
    </View>
  );
}

function PartRow({ card, onBuy }: { card: PartCard; onBuy: (id: PartId) => void }) {
  return (
    <View style={[styles.part, card.maxed && styles.partMaxed]}>
      <View style={styles.partHead}>
        <Text style={styles.partName}>{card.name}</Text>
        <View style={styles.pips}>
          {Array.from({ length: MAX_PART_LEVEL }, (_, index) => (
            <View key={index} style={[styles.pip, index < card.level && styles.pipOn]} />
          ))}
        </View>
      </View>

      <Text style={styles.blurb}>{card.blurb}</Text>
      <Text style={styles.effect}>
        Şimdi: {card.value}.
        {card.next ? <Text style={styles.next}> Yükseltince: {card.next}.</Text> : null}
      </Text>

      {card.maxed ? (
        <View style={[styles.buy, styles.buyOff]}>
          <Text style={styles.buyOffLabel}>TAM DONANIM</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => onBuy(card.id)}
          disabled={!card.affordable}
          style={({ pressed }) => [
            styles.buy,
            card.affordable ? styles.buyOn : styles.buyOff,
            pressed && card.affordable && styles.pressed,
          ]}
        >
          <Text style={card.affordable ? styles.buyLabel : styles.buyOffLabel}>
            YÜKSELT · {card.cost?.toLocaleString('tr-TR')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 7, 15, 0.94)',
    padding: 16,
  },
  panel: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '96%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.filled,
    backgroundColor: palette.surface,
    padding: 18,
    gap: 12,
  },
  title: {
    color: palette.accent,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preview: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.surfaceEdge,
    backgroundColor: 'rgba(10, 6, 22, 0.6)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  purse: {
    alignItems: 'flex-end',
  },
  label: {
    color: palette.textDim,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  gold: {
    color: palette.gold,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  value: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 10,
    paddingBottom: 2,
  },
  part: {
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.surfaceEdge,
    backgroundColor: 'rgba(10, 6, 22, 0.55)',
  },
  partMaxed: {
    borderColor: palette.filled,
  },
  partHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  partName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pips: {
    flexDirection: 'row',
    gap: 4,
  },
  pip: {
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.surfaceEdge,
  },
  pipOn: {
    backgroundColor: palette.accent,
  },
  blurb: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 17,
  },
  effect: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 17,
  },
  next: {
    color: palette.accent,
  },
  buy: {
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyOn: {
    backgroundColor: palette.accent,
  },
  buyOff: {
    borderWidth: 1,
    borderColor: palette.surfaceEdge,
  },
  pressed: {
    opacity: 0.75,
  },
  buyLabel: {
    color: palette.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  buyOffLabel: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  note: {
    color: palette.textDim,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
