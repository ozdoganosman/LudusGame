/**
 * Gemi parçalarının adları ve etki metinleri. Sayılar motordan
 * (src/engine/upgrades.ts) okunur; burada yalnızca nasıl yazıldıkları var.
 */
import { MAX_PART_LEVEL, PART_IDS, defaultLoadout, partCost, shipStats } from '../engine/upgrades';
import type { Loadout, PartId } from '../engine/upgrades';

export { MAX_PART_LEVEL, PART_IDS };

/** Parça adları ve tek satırlık tanıtımları. */
export const PART_TEXT: Record<PartId, { name: string; blurb: string }> = {
  wing: { name: 'KANAT', blurb: 'Temizlenmiş dokunun kenarında daha hızlı süzülürsün.' },
  engine: { name: 'MOTOR', blurb: 'Dokuya dalışta hız: iz daha kısa sürede kapanır.' },
  tail: { name: 'KUYRUK', blurb: 'İzde geri sarma hızlanır; köşeye sıkışınca kurtarır.' },
  composite: { name: 'KOMPOZİT GÖVDE', blurb: 'Yedek gemi ve daha hızlı toparlanma.' },
  weapon: { name: 'IŞIN TOPU', blurb: 'Baktığın yöne otomatik ateş; mikrop ve virüsü düşürür.' },
  shield: { name: 'KALKAN', blurb: 'Bir darbeyi emer, sonra kendini doldurur.' },
};

function statsFor(id: PartId, level: number) {
  const loadout: Loadout = { ...defaultLoadout(), [id]: Math.max(0, level) };
  return shipStats(loadout);
}

/** Parçanın o seviyedeki etkisi; 0. seviyede fabrika ayarı görünür. */
export function partValue(id: PartId, level: number): string {
  const stats = statsFor(id, level);
  switch (id) {
    case 'wing':
      return `kenarda ${stats.edgeSpeed} hücre/s`;
    case 'engine':
      return `dalışta ${stats.diveSpeed} hücre/s`;
    case 'tail':
      return `geri sarma ×${stats.retraceBoost.toFixed(2)}`;
    case 'composite':
      return stats.extraLives === 0 ? 'ek gemi yok' : `+${stats.extraLives} gemi`;
    case 'weapon':
      return level === 0
        ? 'silahsız'
        : `${(1 / stats.shotInterval).toFixed(1)} atış/s · ${stats.shotRange} hücre`;
    case 'shield':
      return stats.shieldCharges === 0
        ? 'kalkan yok'
        : `${stats.shieldCharges} darbe · ${stats.shieldRecharge}s dolum`;
  }
}

export type PartCard = {
  id: PartId;
  name: string;
  blurb: string;
  level: number;
  /** Bir sonraki kademenin fiyatı; parça doluysa null. */
  cost: number | null;
  /** Şu andaki etki. */
  value: string;
  /** Yükseltme sonrası etki; parça doluysa null. */
  next: string | null;
  maxed: boolean;
  affordable: boolean;
};

/** Hangar ekranının gösterdiği kartlar; sıra PART_IDS sırasıdır. */
export function partCards(loadout: Loadout, gold: number): PartCard[] {
  return PART_IDS.map((id) => {
    const level = loadout[id];
    const cost = partCost(id, level);
    return {
      id,
      name: PART_TEXT[id].name,
      blurb: PART_TEXT[id].blurb,
      level,
      cost,
      value: partValue(id, level),
      next: cost === null ? null : partValue(id, level + 1),
      maxed: cost === null,
      affordable: cost !== null && gold >= cost,
    };
  });
}
