/** Oyunun tek renk kaynağı; hem uygulama hem önizleme aracı buradan okur. */
export const palette = {
  background: '#05070f',
  surface: '#0c1226',
  empty: '#0b1024',
  emptyDot: '#161e3d',
  filled: '#1b4b8f',
  filledEdge: '#3f8ae0',
  trail: '#5df2ff',
  player: '#ffffff',
  playerGlow: '#5df2ff',
  boss: '#ff3b7f',
  hunter: '#ffb038',
  drifter: '#ff7a45',
  text: '#e8f1ff',
  textDim: '#8fa3c8',
  accent: '#5df2ff',
  danger: '#ff3b7f',
  gold: '#ffd75e',
} as const;

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
