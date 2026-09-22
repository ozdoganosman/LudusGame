/**
 * Düşman türleri: her türün kendi hareket davranışı, hızı ve boyutu var.
 * Tür adları ve çizimleri arayüz katmanında (src/ui/bestiary.ts); burada
 * yalnızca oynanışa ait sayılar durur.
 */
import type { EnemyKind } from './types';

/**
 * Hareket davranışları. Motor bunlara göre yön ve hız belirler; duvardan
 * sekme ve alan sınırları her davranış için ortaktır.
 */
export type Behavior =
  /** Düz gider, duvardan seker. Klasik gezgin. */
  | 'bouncer'
  /** Yılan gibi kıvrılarak ilerler. */
  | 'slither'
  /** Denizanası: iter, sürüklenir, yeniden iter. */
  | 'pulse'
  /** Bekler, sonra düz bir hatta atılır. */
  | 'dasher'
  /** Oyuncuya doğru kısa sıçramalar yapar. */
  | 'hopper'
  /** Temizlenmiş alanın sınırını takip eder; güvenli bölgenin kenarında gezer. */
  | 'crawler'
  /** Israrla oyuncuyu takip eder. */
  | 'stalker'
  /** Bir noktanın çevresinde dönerek alanı tarar. */
  | 'spinner'
  /** Ağır ağır dolaşır, sonra oyuncuya hücum eder. */
  | 'charger'
  /** Sekiz çizerek gezinir. */
  | 'weaver'
  /** Seker ve zaman zaman ikiye bölünür. */
  | 'splitter';

export type SpeciesId =
  | 'clot'
  | 'plateletSpike'
  | 'needle'
  | 'sediment'
  | 'mucusBubble'
  | 'alveolarHook'
  | 'mucusWorm'
  | 'ciliaPhage'
  | 'throatPlug'
  | 'sacMold'
  | 'membrane'
  | 'blackBalloon'
  | 'acidAmoeba'
  | 'secretionHook'
  | 'stomachLeech'
  | 'bloodClot'
  | 'streamVirus'
  | 'veinKing'
  | 'lymphJelly'
  | 'armoredVirus'
  | 'swollenNode'
  | 'sporeCluster'
  | 'borer'
  | 'factoryQueen'
  | 'bileAmoeba'
  | 'filterVirus'
  | 'fatGiant'
  | 'saltCrystal'
  | 'ductWorm'
  | 'stoneCore'
  | 'muscleEater'
  | 'rhythmVirus'
  | 'fourMouths'
  | 'nerveParasite'
  | 'axisVirus'
  | 'whiteWorm'
  | 'shadowCell'
  | 'coreVirus'
  | 'blackColony'
  | 'mutantCell'
  | 'mutantVirus'
  | 'mutation';

export type Species = {
  id: SpeciesId;
  /** Oynanış rolü: patron bölgesini korur, avcı puanı daha yüksek. */
  kind: EnemyKind;
  behavior: Behavior;
  /** Bölüm hızının çarpanı. */
  speed: number;
  /** Çarpışma yarıçapı (hücre). */
  radius: number;
};

const species = (
  id: SpeciesId,
  kind: EnemyKind,
  behavior: Behavior,
  speed: number,
  radius: number
): Species => ({ id, kind, behavior, speed, radius });

/** Tüm türler. Hız çarpanı 1 = bölümün temel hızı. */
export const SPECIES: Record<SpeciesId, Species> = {
  // 1 — kılcal damar
  clot: species('clot', 'drifter', 'bouncer', 1, 1.3),
  plateletSpike: species('plateletSpike', 'drifter', 'dasher', 1.15, 1.2),
  needle: species('needle', 'hunter', 'stalker', 0.9, 1.15),
  sediment: species('sediment', 'boss', 'charger', 0.8, 2.1),
  // 2 — soluk borusu
  mucusWorm: species('mucusWorm', 'drifter', 'slither', 1.05, 1.2),
  mucusBubble: species('mucusBubble', 'drifter', 'pulse', 0.95, 1.5),
  ciliaPhage: species('ciliaPhage', 'hunter', 'hopper', 1.1, 1.1),
  throatPlug: species('throatPlug', 'boss', 'crawler', 0.7, 2.2),
  // 3 — akciğer
  sacMold: species('sacMold', 'drifter', 'pulse', 1.15, 1.45),
  alveolarHook: species('alveolarHook', 'drifter', 'spinner', 1, 1.3),
  membrane: species('membrane', 'hunter', 'stalker', 0.95, 1.15),
  blackBalloon: species('blackBalloon', 'boss', 'weaver', 0.85, 2.3),
  // 4 — mide astarı
  acidAmoeba: species('acidAmoeba', 'drifter', 'crawler', 0.75, 1.6),
  secretionHook: species('secretionHook', 'hunter', 'dasher', 1.25, 1.1),
  stomachLeech: species('stomachLeech', 'boss', 'charger', 0.9, 2.2),
  // 5 — kan dolaşımı
  bloodClot: species('bloodClot', 'drifter', 'splitter', 1, 1.5),
  streamVirus: species('streamVirus', 'hunter', 'hopper', 1.15, 1.1),
  veinKing: species('veinKing', 'boss', 'weaver', 0.95, 2.3),
  // 6 — lenf düğümü
  lymphJelly: species('lymphJelly', 'drifter', 'pulse', 1.1, 1.55),
  armoredVirus: species('armoredVirus', 'hunter', 'dasher', 1.3, 1.15),
  swollenNode: species('swollenNode', 'boss', 'spinner', 0.9, 2.3),
  // 7 — kemik iliği
  sporeCluster: species('sporeCluster', 'drifter', 'splitter', 1.05, 1.45),
  borer: species('borer', 'hunter', 'stalker', 1, 1.15),
  factoryQueen: species('factoryQueen', 'boss', 'spinner', 1, 2.35),
  // 8 — karaciğer
  bileAmoeba: species('bileAmoeba', 'drifter', 'crawler', 0.8, 1.65),
  filterVirus: species('filterVirus', 'hunter', 'hopper', 1.2, 1.1),
  fatGiant: species('fatGiant', 'boss', 'charger', 0.95, 2.4),
  // 9 — böbrek
  saltCrystal: species('saltCrystal', 'drifter', 'dasher', 1.2, 1.25),
  ductWorm: species('ductWorm', 'hunter', 'slither', 1.05, 1.2),
  stoneCore: species('stoneCore', 'boss', 'weaver', 1, 2.3),
  // 10 — kalp kapağı
  muscleEater: species('muscleEater', 'drifter', 'bouncer', 1.3, 1.3),
  rhythmVirus: species('rhythmVirus', 'hunter', 'pulse', 1.25, 1.2),
  fourMouths: species('fourMouths', 'boss', 'spinner', 1.05, 2.35),
  // 11 — omurilik
  nerveParasite: species('nerveParasite', 'drifter', 'slither', 1.15, 1.2),
  axisVirus: species('axisVirus', 'hunter', 'dasher', 1.35, 1.15),
  whiteWorm: species('whiteWorm', 'boss', 'slither', 1, 2.2),
  // 12 — beyin sapı
  shadowCell: species('shadowCell', 'drifter', 'crawler', 0.9, 1.6),
  coreVirus: species('coreVirus', 'hunter', 'hopper', 1.3, 1.15),
  blackColony: species('blackColony', 'boss', 'weaver', 1.1, 2.4),
  // mutasyon dalgaları
  mutantCell: species('mutantCell', 'drifter', 'splitter', 1.1, 1.5),
  mutantVirus: species('mutantVirus', 'hunter', 'stalker', 1.15, 1.2),
  mutation: species('mutation', 'boss', 'charger', 1.1, 2.4),
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export function speciesOf(id: SpeciesId): Species {
  return SPECIES[id];
}
