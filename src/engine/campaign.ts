/**
 * Görev zinciri: ana hikâyenin bölümleri sırayla oynanır ve her bölüm bir
 * öncekinden zor olur. Buradaki sayılar oynanışa ait (hedef yüzde, düşman
 * kadrosu, altın primi); bölüm adları ve metinleri arayüz katmanında
 * (src/ui/story.ts).
 */
import { MAX_ENEMIES, difficulty } from './config';
import type { Difficulty } from './config';
import type { SpeciesId } from './species';
import type { EnemyKind } from './types';

/**
 * Bölüm başına temizlenmesi gereken alan. İlk bölüm bile rahat değil; kampanya
 * sonunda dokunun neredeyse tamamı istenir.
 */
const TARGETS = [62, 66, 70, 73, 75, 77, 79, 81, 83, 85, 87, 88];

/** Ana hikâyenin bölüm sayısı. Sonrası sonsuz dalga. */
export const CAMPAIGN_LENGTH = TARGETS.length;

/**
 * Bölümün tür kadrosu: ana mikrop, (ileri bölümlerde) ikinci bir tür, avcı ve
 * patron. Türlerin davranışı ve hızı src/engine/species.ts içinde.
 */
type ChapterRoster = {
  common: SpeciesId;
  hunter: SpeciesId;
  boss: SpeciesId;
  /** 4. bölümden sonra sahneye giren ikinci tür (farklı davranış). */
  second?: SpeciesId;
};

const ROSTERS: ChapterRoster[] = [
  { common: 'clot', hunter: 'needle', boss: 'sediment', second: 'plateletSpike' },
  { common: 'mucusWorm', hunter: 'ciliaPhage', boss: 'throatPlug', second: 'mucusBubble' },
  { common: 'sacMold', hunter: 'membrane', boss: 'blackBalloon', second: 'alveolarHook' },
  { common: 'acidAmoeba', hunter: 'secretionHook', boss: 'stomachLeech', second: 'clot' },
  { common: 'bloodClot', hunter: 'streamVirus', boss: 'veinKing', second: 'mucusWorm' },
  { common: 'lymphJelly', hunter: 'armoredVirus', boss: 'swollenNode', second: 'mucusWorm' },
  { common: 'sporeCluster', hunter: 'borer', boss: 'factoryQueen', second: 'acidAmoeba' },
  { common: 'bileAmoeba', hunter: 'filterVirus', boss: 'fatGiant', second: 'bloodClot' },
  { common: 'saltCrystal', hunter: 'ductWorm', boss: 'stoneCore', second: 'lymphJelly' },
  { common: 'muscleEater', hunter: 'rhythmVirus', boss: 'fourMouths', second: 'saltCrystal' },
  // Omurilik sıvısında lenf denizanası da dolaşır: siluetler birbirine karışmasın.
  { common: 'nerveParasite', hunter: 'axisVirus', boss: 'whiteWorm', second: 'lymphJelly' },
  { common: 'shadowCell', hunter: 'coreVirus', boss: 'blackColony', second: 'nerveParasite' },
];

/** Kampanya sonrası mutasyon dalgaları. */
const MUTATION_ROSTER: ChapterRoster = {
  common: 'mutantCell',
  hunter: 'mutantVirus',
  boss: 'mutation',
  second: 'shadowCell',
};

export type RosterEntry = { species: SpeciesId; count: number };

export type MissionPlan = {
  /** 1'den başlayan görev numarası. */
  index: number;
  /** Görevi tamamlamak için gereken temizlik yüzdesi. */
  target: number;
  /** Görev primi (altın). */
  reward: number;
  /** Zorluk sayıları (hız, avcı çevikliği, doğum aralığı). */
  difficulty: Difficulty;
  /** Görev başında sahaya çıkan türler. */
  roster: RosterEntry[];
  /** Oyun sürerken doğan tür. */
  spawn: SpeciesId;
  /** Ana hikâye bitti mi (sonsuz dalgalar)? */
  endless: boolean;
};

/**
 * Görev numarasından oynanış planı: hedef, kadro ve zorluk. Kampanya bittikten
 * sonra hedef ve zorluk artmaya devam eder, böylece oyun sonsuza kadar
 * oynanabilir kalır.
 */
export function missionPlan(index: number): MissionPlan {
  const n = Math.max(1, Math.floor(index));
  const endless = n > CAMPAIGN_LENGTH;
  const target = endless
    ? Math.min(92, TARGETS[CAMPAIGN_LENGTH - 1] + (n - CAMPAIGN_LENGTH))
    : TARGETS[n - 1];

  const chapter = endless ? MUTATION_ROSTER : ROSTERS[n - 1];
  const level = difficulty(n);
  const secondCount = chapter.second ? Math.max(1, Math.floor(level.swarm / 3)) : 0;
  const commonCount = Math.max(1, level.swarm - secondCount);

  const roster: RosterEntry[] = [{ species: chapter.common, count: commonCount }];
  if (chapter.second && secondCount > 0) {
    roster.push({ species: chapter.second, count: secondCount });
  }
  if (level.hunters > 0) roster.push({ species: chapter.hunter, count: level.hunters });
  roster.push({ species: chapter.boss, count: 1 });

  return {
    index: n,
    target,
    reward: 120 + 70 * (n - 1),
    difficulty: level,
    roster: capRoster(roster),
    spawn: chapter.second ?? chapter.common,
    endless,
  };
}

/** Kadro MAX_ENEMIES'i aşmasın: fazlalık sondan kırpılır, patron korunur. */
function capRoster(roster: RosterEntry[]): RosterEntry[] {
  let total = roster.reduce((sum, entry) => sum + entry.count, 0);
  if (total <= MAX_ENEMIES) return roster;

  const capped = roster.map((entry) => ({ ...entry }));
  for (let i = capped.length - 2; i >= 0 && total > MAX_ENEMIES; i--) {
    const drop = Math.min(capped[i].count - 1, total - MAX_ENEMIES);
    capped[i].count -= drop;
    total -= drop;
  }
  return capped;
}

/**
 * Kapatılan alanın altın karşılığı. Ölçek, tam bir kampanyanın gemiyi
 * neredeyse tamamen donatmaya yetmesi için seçildi (görev başına ~300 altın +
 * görev primi). Hapsolan düşmanların primi ayrı: trapReward.
 */
export function captureGold(cells: number): number {
  return Math.max(1, Math.round(cells / 12));
}

/** Hapsolan düşmanın temel primi (bölüm numarasıyla çarpılır). Patron hapsolmaz. */
export const TRAP_POINTS: Record<EnemyKind, number> = { drifter: 500, hunter: 900, boss: 0 };

/** Hapsolan düşman başına temel altın. */
export const TRAP_GOLD = 8;

/**
 * Tek kapatmada hapsolan düşmanların primi zincirlenir: ikinci düşman iki
 * katı, üçüncüsü üç katı getirir. Birden çok düşmanı aynı hamlede kapatmak
 * oyunun en kârlı hareketi olsun.
 */
export function trapReward(kind: EnemyKind, level: number, chain: number): { points: number; gold: number } {
  return {
    points: TRAP_POINTS[kind] * Math.max(1, level) * chain,
    gold: TRAP_GOLD * chain,
  };
}

/** Silahla düşürülen düşmanın altın karşılığı. */
export const KILL_GOLD = 3;
