/**
 * Gemi parçaları: altınla alınan, seviyeli yükseltmeler.
 *
 * Bu dosya yalnızca sayılar — parça adları ve açıklamaları arayüz katmanında
 * (src/ui/parts.ts). Motor buradan türetilen ShipStats ile çalışır, böylece
 * oynanış etkileri tek yerde tanımlı ve test edilebilir kalır.
 */
import { DEATH_FREEZE, PLAYER_SPEED } from './config';

export type PartId = 'wing' | 'engine' | 'tail' | 'composite' | 'weapon' | 'shield';

export const PART_IDS: readonly PartId[] = ['wing', 'engine', 'tail', 'composite', 'weapon', 'shield'];

/** 0 = fabrika çıkışı. Her parça 4 kademe yükseltilebilir. */
export const MAX_PART_LEVEL = 4;

export type Loadout = Record<PartId, number>;

/**
 * Kademe fiyatları (altın). Dizinin i. elemanı, i. seviyeden (i+1). seviyeye
 * geçişin fiyatı. Silah ve kalkan en pahalısı: oynanışı en çok değiştirenler.
 */
export const PART_COSTS: Record<PartId, readonly number[]> = {
  wing: [120, 260, 460, 780],
  engine: [140, 300, 520, 880],
  tail: [100, 220, 400, 700],
  composite: [200, 420, 740, 1200],
  weapon: [260, 520, 880, 1400],
  shield: [240, 480, 820, 1300],
};

export function defaultLoadout(): Loadout {
  return { wing: 0, engine: 0, tail: 0, composite: 0, weapon: 0, shield: 0 };
}

/** Bilinmeyen/bozuk değerleri temizleyip geçerli bir donanım listesi üretir. */
export function normalizeLoadout(value: Partial<Record<string, unknown>> | null | undefined): Loadout {
  const loadout = defaultLoadout();
  if (!value) return loadout;
  for (const id of PART_IDS) {
    const level = Number((value as Record<string, unknown>)[id]);
    if (!Number.isFinite(level)) continue;
    loadout[id] = Math.min(MAX_PART_LEVEL, Math.max(0, Math.floor(level)));
  }
  return loadout;
}

/** Bir sonraki kademenin fiyatı; parça doluysa null. */
export function partCost(id: PartId, level: number): number | null {
  if (level >= MAX_PART_LEVEL) return null;
  return PART_COSTS[id][Math.max(0, level)];
}

/** Donanımın toplam değeri — hangar ekranında "gemi değeri" olarak gösterilir. */
export function loadoutValue(loadout: Loadout): number {
  let total = 0;
  for (const id of PART_IDS) {
    for (let level = 0; level < loadout[id]; level++) total += PART_COSTS[id][level];
  }
  return total;
}

export type ShipStats = {
  /** Temizlenmiş alanın kenarında hız (hücre/saniye) — kanat. */
  edgeSpeed: number;
  /** Dokuya dalarken hız — motor. */
  diveSpeed: number;
  /** İzi geri sararken hız çarpanı — kuyruk. */
  retraceBoost: number;
  /** Ek gemi (can) — kompozit. */
  extraLives: number;
  /** Ölüm sonrası donma süresi (saniye) — kompozit kısaltır. */
  deathFreeze: number;
  /** İki atış arası süre; silah yoksa Infinity. */
  shotInterval: number;
  shotSpeed: number;
  /** Merminin menzili (hücre). */
  shotRange: number;
  /** Emilecek darbe sayısı — kalkan. */
  shieldCharges: number;
  /** Harcanan kalkanın geri dolma süresi (saniye). */
  shieldRecharge: number;
  /** Doğuştaki ek dokunulmazlık (saniye) — kalkan. */
  invulnBonus: number;
};

/** Kompozit ve kalkanın kademe başına kazandırdığı adet (0. seviye dahil). */
const EXTRA_LIVES = [0, 1, 1, 2, 2];
const SHIELD_CHARGES = [0, 1, 1, 2, 2];

/** Donanımdan oynanış değerleri. Tüm parçalar 0 iken fabrika ayarları çıkar. */
export function shipStats(loadout: Loadout = defaultLoadout()): ShipStats {
  const wing = clampLevel(loadout.wing);
  const engine = clampLevel(loadout.engine);
  const tail = clampLevel(loadout.tail);
  const composite = clampLevel(loadout.composite);
  const weapon = clampLevel(loadout.weapon);
  const shield = clampLevel(loadout.shield);

  return {
    edgeSpeed: PLAYER_SPEED + wing * 5,
    diveSpeed: PLAYER_SPEED + engine * 5,
    retraceBoost: 1 + tail * 0.35,
    extraLives: EXTRA_LIVES[composite],
    deathFreeze: DEATH_FREEZE * (1 - composite * 0.15),
    shotInterval: weapon === 0 ? Infinity : 1.05 - weapon * 0.15,
    shotSpeed: 34 + weapon * 4,
    shotRange: 9 + weapon * 3,
    shieldCharges: SHIELD_CHARGES[shield],
    shieldRecharge: 20 - shield * 3,
    invulnBonus: shield * 0.3,
  };
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(MAX_PART_LEVEL, Math.max(0, Math.floor(level)));
}
