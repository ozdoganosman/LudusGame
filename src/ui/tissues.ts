/**
 * Bölümlerin görsel kimliği: hastalıklı dokunun ve iyileşmiş dokunun renkleri,
 * arka plan doku deseni ve o bölümün canavar kadrosu.
 *
 * Yalnızca görünüm — hedef yüzde, düşman sayısı ve hız motorun kampanya
 * planından gelir (src/engine/campaign.ts).
 */
import { CAMPAIGN_LENGTH } from '../engine/campaign';
import type { EnemyKind } from '../engine/types';

/** Arka plan deseni; her doku kendi dokusuyla çizilir. */
export type TextureKind =
  | 'vein'
  | 'mucus'
  | 'alveoli'
  | 'acid'
  | 'flow'
  | 'lymph'
  | 'marrow'
  | 'lobule'
  | 'crystal'
  | 'muscle'
  | 'nerve'
  | 'core';

/** Canavar arketipleri; şekilleri src/ui/creatures.ts içinde. */
export type MonsterFamily =
  | 'coccus'
  | 'bacillus'
  | 'worm'
  | 'spore'
  | 'jelly'
  | 'crystal'
  | 'phage'
  | 'amoeba'
  | 'maw'
  | 'eye'
  | 'hydra';

export type Monster = {
  family: MonsterFamily;
  /** Gövde rengi. */
  color: string;
  /** Tema adı; brifingde geçer. */
  name: string;
};

export type TissueTheme = {
  /** Hastalıklı doku: temel renk. */
  sick: string;
  /** Hastalıklı dokunun gölgeleri. */
  sickDeep: string;
  /** Damar, iplik, kabarcık gibi desen rengi. */
  sickVein: string;
  /** İyileşmiş doku: temel renk. */
  healthy: string;
  /** İyileşmiş dokunun aydınlık damarları. */
  healthyLight: string;
  /** İyileşmiş alanın sınır ışığı. */
  healthyEdge: string;
  texture: TextureKind;
  /** Bölümün canavarları (motor davranışına göre). */
  drifter: Monster;
  hunter: Monster;
  boss: Monster;
};

const THEMES: TissueTheme[] = [
  {
    // 1 — KILCAL DAMAR: morarmış damar duvarı, iyileşince atardamar kırmızısı.
    sick: '#2b1024',
    sickDeep: '#180a16',
    sickVein: '#7a2038',
    healthy: '#b32133',
    healthyLight: '#e0475c',
    healthyEdge: '#ff8fa3',
    texture: 'vein',
    drifter: { family: 'coccus', color: '#d8e04b', name: 'pıhtı mikrobu' },
    hunter: { family: 'bacillus', color: '#b06bff', name: 'iğne virüsü' },
    boss: { family: 'maw', color: '#ff3d6e', name: 'TORTU ÇEKİRDEĞİ' },
  },
  {
    // 2 — SOLUK BORUSU: sümüklü gri-yeşil, iyileşince temiz kırmızı.
    sick: '#28311f',
    sickDeep: '#171d12',
    sickVein: '#647f35',
    healthy: '#b8384a',
    healthyLight: '#e2637a',
    healthyEdge: '#ffa8b4',
    texture: 'mucus',
    drifter: { family: 'worm', color: '#9fe04b', name: 'balgam solucanı' },
    hunter: { family: 'phage', color: '#8f6bff', name: 'siliyer virüs' },
    boss: { family: 'maw', color: '#ff4f5e', name: 'BOĞAZ TIKACI' },
  },
  {
    // 3 — AKCİĞER: kararmış hava keseleri, iyileşince pembe.
    sick: '#281f33',
    sickDeep: '#171024',
    sickVein: '#614d85',
    healthy: '#c55a6e',
    healthyLight: '#e98b9c',
    healthyEdge: '#ffb3c1',
    texture: 'alveoli',
    drifter: { family: 'spore', color: '#7fd6c0', name: 'kese küfü' },
    hunter: { family: 'phage', color: '#a678ff', name: 'zar virüsü' },
    boss: { family: 'eye', color: '#ff3d6e', name: 'KARA BALON' },
  },
  {
    // 4 — MİDE ASTARI: safra sarısı yanık doku, iyileşince canlı et pembesi.
    sick: '#36280f',
    sickDeep: '#201806',
    sickVein: '#93711f',
    healthy: '#c2543c',
    healthyLight: '#e8836a',
    healthyEdge: '#ff9d7a',
    texture: 'acid',
    drifter: { family: 'amoeba', color: '#ffd24a', name: 'asit amipi' },
    hunter: { family: 'bacillus', color: '#c86bff', name: 'salgı kancası' },
    boss: { family: 'maw', color: '#ff5533', name: 'MİDE SÜLÜĞÜ' },
  },
  {
    // 5 — KAN DOLAŞIMI: koyu pıhtı, iyileşince akan kan kırmızısı.
    sick: '#2a0f18',
    sickDeep: '#16070e',
    sickVein: '#83202c',
    healthy: '#c62b3a',
    healthyLight: '#ec5a68',
    healthyEdge: '#ff7b86',
    texture: 'flow',
    drifter: { family: 'coccus', color: '#ff9a3d', name: 'kan pıhtısı' },
    hunter: { family: 'phage', color: '#9d6bff', name: 'akıntı virüsü' },
    boss: { family: 'hydra', color: '#ff2f5e', name: 'DAMAR KRALI' },
  },
  {
    // 6 — LENF DÜĞÜMÜ: şişmiş gri-mavi, iyileşince berrak turkuaz.
    sick: '#1f2c38',
    sickDeep: '#121a22',
    sickVein: '#527f91',
    healthy: '#2f9a86',
    healthyLight: '#5fd4bb',
    healthyEdge: '#8ff0dc',
    texture: 'lymph',
    drifter: { family: 'jelly', color: '#6fe0ff', name: 'lenf denizanası' },
    hunter: { family: 'crystal', color: '#c06bff', name: 'zırhlı virüs' },
    boss: { family: 'eye', color: '#ff4b7a', name: 'ŞİŞMİŞ DÜĞÜM' },
  },
  {
    // 7 — KEMİK İLİĞİ: kurumuş süngerimsi doku, iyileşince ilik kırmızısı.
    sick: '#31281d',
    sickDeep: '#1d1710',
    sickVein: '#8a7648',
    healthy: '#d0514f',
    healthyLight: '#ef8070',
    healthyEdge: '#ffb08f',
    texture: 'marrow',
    drifter: { family: 'spore', color: '#ffe066', name: 'spor kümesi' },
    hunter: { family: 'bacillus', color: '#b06bff', name: 'delici basil' },
    boss: { family: 'hydra', color: '#ff3d5e', name: 'FABRİKA KRALİÇESİ' },
  },
  {
    // 8 — KARACİĞER: yağlanmış lob dokusu, iyileşince koyu ciğer kırmızısı.
    sick: '#2d2318',
    sickDeep: '#1a140d',
    sickVein: '#7d6630',
    healthy: '#9e3128',
    healthyLight: '#c9584a',
    healthyEdge: '#ff9b7a',
    texture: 'lobule',
    drifter: { family: 'amoeba', color: '#c8e04b', name: 'safra amibi' },
    hunter: { family: 'phage', color: '#a06bff', name: 'süzgeç virüsü' },
    boss: { family: 'maw', color: '#ff4a3d', name: 'YAĞ DEVİ' },
  },
  {
    // 9 — BÖBREK: kristalleşmiş kanallar, iyileşince temiz doku.
    sick: '#232030',
    sickDeep: '#14111f',
    sickVein: '#6b6496',
    healthy: '#a8384e',
    healthyLight: '#d66277',
    healthyEdge: '#ffa0b0',
    texture: 'crystal',
    drifter: { family: 'crystal', color: '#7fe0ff', name: 'tuz kristali' },
    hunter: { family: 'worm', color: '#c06bff', name: 'kanal solucanı' },
    boss: { family: 'eye', color: '#ff3d6e', name: 'TAŞ ÇEKİRDEK' },
  },
  {
    // 10 — KALP KAPAĞI: yırtılmış kas, iyileşince güçlü kırmızı.
    sick: '#2c1420',
    sickDeep: '#190b13',
    sickVein: '#93273c',
    healthy: '#d0304a',
    healthyLight: '#f2607a',
    healthyEdge: '#ff8fa0',
    texture: 'muscle',
    drifter: { family: 'coccus', color: '#ffb03d', name: 'kas yiyen' },
    hunter: { family: 'phage', color: '#b06bff', name: 'ritim virüsü' },
    boss: { family: 'hydra', color: '#ff2f4e', name: 'DÖRT AĞIZ' },
  },
  {
    // 11 — OMURİLİK: soğuk sinir hattı, iyileşince ışıyan miyelin.
    sick: '#1c2236',
    sickDeep: '#101423',
    sickVein: '#4b5c96',
    healthy: '#6f7bc8',
    healthyLight: '#9aa6e8',
    healthyEdge: '#dfe6ff',
    texture: 'nerve',
    drifter: { family: 'worm', color: '#7fe0ff', name: 'sinir paraziti' },
    hunter: { family: 'crystal', color: '#c86bff', name: 'aks virüsü' },
    boss: { family: 'maw', color: '#ff4b6e', name: 'BEYAZ SOLUCAN' },
  },
  {
    // 12 — BEYİN SAPI: koloninin çekirdeği; iyileşince mor-eflatun ışık.
    sick: '#1a1226',
    sickDeep: '#0e0917',
    sickVein: '#65309a',
    healthy: '#9a5fd8',
    healthyLight: '#c294f2',
    healthyEdge: '#e0b3ff',
    texture: 'core',
    drifter: { family: 'amoeba', color: '#8ff0dc', name: 'gölge hücre' },
    hunter: { family: 'phage', color: '#ff8fd0', name: 'çekirdek virüsü' },
    boss: { family: 'eye', color: '#ff2f5e', name: 'SİYAH KOLONİ' },
  },
];

/** Kampanya bittikten sonraki mutasyon dalgaları. */
const MUTATION: TissueTheme = {
  sick: '#241018',
  sickDeep: '#130809',
  sickVein: '#93302a',
  healthy: '#c93a2e',
  healthyLight: '#ef6f4a',
  healthyEdge: '#ffb36b',
  texture: 'core',
  drifter: { family: 'amoeba', color: '#ffe066', name: 'mutant hücre' },
  hunter: { family: 'crystal', color: '#c06bff', name: 'mutant virüs' },
  boss: { family: 'hydra', color: '#ff3d3d', name: 'MUTASYON' },
};

/** Görev numarasından doku teması; kampanya sonrası mutasyon teması gelir. */
export function tissueTheme(index: number): TissueTheme {
  const n = Math.max(1, Math.floor(index));
  if (n > CAMPAIGN_LENGTH) return MUTATION;
  return THEMES[n - 1];
}

/** Bir düşman türünün o bölümdeki canavarı. */
export function monsterFor(theme: TissueTheme, kind: EnemyKind): Monster {
  return theme[kind];
}

/** Brifingde geçen kadro metni: "balgam solucanı, siliyer virüs, BOĞAZ TIKACI". */
export function bestiaryLine(index: number): string {
  const theme = tissueTheme(index);
  return `${theme.drifter.name}, ${theme.hunter.name}, ${theme.boss.name}`;
}
