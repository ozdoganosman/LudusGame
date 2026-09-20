/**
 * Oyunun tek renk kaynağı; hem uygulama hem web hem önizleme aracı buradan okur.
 * Tema: küçültülmüş bir nanogeminin insan dokusu içindeki seferi. Koyu, mor
 * dokunun üzerinde parlak naneye çalan "temizlenmiş" bölgeler.
 */
export const palette = {
  background: '#090614',
  surface: '#191033',
  surfaceEdge: '#2e1e5c',
  /** Henüz temizlenmemiş, hastalıklı doku. */
  empty: '#1b0f2e',
  emptyDot: '#2d1a4d',
  /** Temizlenmiş doku. */
  filled: '#0f6f63',
  filledEdge: '#3ff0c0',
  /** Geminin sterilizasyon izi. */
  trail: '#7df9ff',
  player: '#eaf6ff',
  playerGlow: '#7df9ff',
  /** Patojen (patron). */
  boss: '#ff3d6e',
  /** Virüs (avcı). */
  hunter: '#b06bff',
  /** Mikrop (gezgin) — gövde rengi id'ye göre germColors'tan seçilir. */
  drifter: '#8bd94b',
  text: '#f3edff',
  textDim: '#a294cc',
  accent: '#3ff0c0',
  danger: '#ff3d6e',
  gold: '#ffd75e',
} as const;

/** Mikropların gövde renkleri; çizgi film hissi için doygun ve çeşitli. */
export const germColors = ['#8bd94b', '#ffa63d', '#4fc3ff', '#ff6fd8', '#ffe34f'] as const;

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/** Rengi koyulaştırır (gölge/kontur için). */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number) => Math.round(channel * (1 - amount));
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
