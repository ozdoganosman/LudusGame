/**
 * Türlerin görünümü: silueti (aile), rengi ve tema adı. Davranış, hız ve
 * boyut motorda (src/engine/species.ts); burada yalnızca nasıl göründükleri var.
 */
import { missionPlan } from '../engine/campaign';
import { SPECIES_IDS } from '../engine/species';
import type { SpeciesId } from '../engine/species';

/**
 * Gövde tipleri. Küçük boyutta ayırt edilebilmesi için hepsi farklı siluet:
 * salkım, çubuk, spiral, eklemli, yıldız, halka, mızrak, çarpı, çan, kristal,
 * altıgen baş + bacaklar, düzensiz blob; patronlar ağız, göz, üç baş ve taç.
 */
export type MonsterFamily =
  | 'cluster'
  | 'rod'
  | 'coil'
  | 'worm'
  | 'star'
  | 'ring'
  | 'dart'
  | 'cross'
  | 'jelly'
  | 'crystal'
  | 'phage'
  | 'amoeba'
  | 'maw'
  | 'eye'
  | 'hydra'
  | 'crown';

export type Monster = {
  name: string;
  family: MonsterFamily;
  color: string;
};

const monster = (name: string, family: MonsterFamily, color: string): Monster => ({
  name,
  family,
  color,
});

/**
 * Her türün görünümü. Aynı bölümdeki üç tür hem siluet hem renk olarak
 * birbirinden ayrılır; komşu bölümler aynı siluetleri tekrarlamaz.
 */
export const SPECIES_VISUALS: Record<SpeciesId, Monster> = {
  // 1 — kılcal damar
  clot: monster('pıhtı mikrobu', 'cluster', '#d8e04b'),
  plateletSpike: monster('trombosit dikeni', 'star', '#ff9a3d'),
  needle: monster('iğne virüsü', 'rod', '#6fd0ff'),
  sediment: monster('TORTU ÇEKİRDEĞİ', 'maw', '#ff3d6e'),
  // 2 — soluk borusu
  mucusWorm: monster('balgam solucanı', 'worm', '#ffd24a'),
  mucusBubble: monster('balgam kabarcığı', 'ring', '#b9e04b'),
  ciliaPhage: monster('siliyer virüs', 'phage', '#ff7ad0'),
  throatPlug: monster('BOĞAZ TIKACI', 'crown', '#ff5e4a'),
  // 3 — akciğer
  sacMold: monster('kese küfü', 'ring', '#7fe0c0'),
  alveolarHook: monster('kese kancası', 'cross', '#7f9bff'),
  membrane: monster('zar virüsü', 'dart', '#ffb03d'),
  blackBalloon: monster('KARA BALON', 'eye', '#ff3d6e'),
  // 4 — mide astarı
  acidAmoeba: monster('asit amipi', 'amoeba', '#6fe0ff'),
  secretionHook: monster('salgı kancası', 'cross', '#c86bff'),
  stomachLeech: monster('MİDE SÜLÜĞÜ', 'maw', '#ff4f3a'),
  // 5 — kan dolaşımı
  bloodClot: monster('kan pıhtısı', 'cluster', '#ff9a5e'),
  streamVirus: monster('akıntı virüsü', 'dart', '#8fffe0'),
  veinKing: monster('DAMAR KRALI', 'hydra', '#ff2f5e'),
  // 6 — lenf düğümü
  lymphJelly: monster('lenf denizanası', 'jelly', '#ffe066'),
  armoredVirus: monster('zırhlı virüs', 'crystal', '#c06bff'),
  swollenNode: monster('ŞİŞMİŞ DÜĞÜM', 'eye', '#ff4b7a'),
  // 7 — kemik iliği
  sporeCluster: monster('spor kümesi', 'star', '#8ff0dc'),
  borer: monster('delici basil', 'rod', '#ff6fd8'),
  factoryQueen: monster('FABRİKA KRALİÇESİ', 'crown', '#ff3d5e'),
  // 8 — karaciğer
  bileAmoeba: monster('safra amibi', 'amoeba', '#c8e04b'),
  filterVirus: monster('süzgeç virüsü', 'phage', '#6fd0ff'),
  fatGiant: monster('YAĞ DEVİ', 'maw', '#ff8a3d'),
  // 9 — böbrek
  saltCrystal: monster('tuz kristali', 'crystal', '#7fe0ff'),
  ductWorm: monster('kanal solucanı', 'coil', '#ffd24a'),
  stoneCore: monster('TAŞ ÇEKİRDEK', 'eye', '#ff5e7a'),
  // 10 — kalp kapağı
  muscleEater: monster('kas yiyen', 'ring', '#ffb03d'),
  rhythmVirus: monster('ritim virüsü', 'cross', '#8f6bff'),
  fourMouths: monster('DÖRT AĞIZ', 'hydra', '#ff2f4e'),
  // 11 — omurilik
  nerveParasite: monster('sinir paraziti', 'coil', '#9fe86b'),
  axisVirus: monster('aks virüsü', 'star', '#ff7ad0'),
  whiteWorm: monster('BEYAZ SOLUCAN', 'worm', '#f4f0ff'),
  // 12 — beyin sapı
  shadowCell: monster('gölge hücre', 'amoeba', '#8ff0dc'),
  coreVirus: monster('çekirdek virüsü', 'phage', '#ffb03d'),
  blackColony: monster('SİYAH KOLONİ', 'eye', '#ff2f5e'),
  // mutasyon dalgaları
  mutantCell: monster('mutant hücre', 'cluster', '#ffe066'),
  mutantVirus: monster('mutant virüs', 'crystal', '#ff7ad0'),
  mutation: monster('MUTASYON', 'hydra', '#ff3d3d'),
};

export function speciesVisual(id: SpeciesId): Monster {
  return SPECIES_VISUALS[id];
}

/** Tüm türlerin görünümü tanımlı mı (test ve geliştirme kolaylığı). */
export const VISUAL_COVERAGE = SPECIES_IDS.every((id) => SPECIES_VISUALS[id] !== undefined);

/** Brifingdeki kadro satırı: "balgam solucanı, siliyer virüs, BOĞAZ TIKACI". */
export function bestiaryLine(missionIndex: number): string {
  const names: string[] = [];
  for (const entry of missionPlan(missionIndex).roster) {
    const name = speciesVisual(entry.species).name;
    if (!names.includes(name)) names.push(name);
  }
  return names.join(', ');
}
