/** Hücre durumları. Grid Uint8Array olarak tutulduğu için sayısal sabitler. */
export const EMPTY = 0;
export const FILLED = 1;
export const TRAIL = 2;

export type Cell = typeof EMPTY | typeof FILLED | typeof TRAIL;

export type Vec = { x: number; y: number };

export type EnemyKind = 'drifter' | 'hunter' | 'boss';

export type Enemy = {
  id: number;
  kind: EnemyKind;
  /** Hücre koordinatı, kesirli. */
  x: number;
  y: number;
  /** Hücre/saniye. */
  vx: number;
  vy: number;
  /** Hücre cinsinden çarpışma yarıçapı. */
  radius: number;
  /** Görsel dönüş açısı; oynanışı etkilemez. */
  spin: number;
};

export type Phase = 'ready' | 'playing' | 'dying' | 'levelClear' | 'gameOver';

export type DeathCause = 'enemy' | 'trail-cut' | 'self';

/** Joystick'ten gelen yön; her bileşen -1, 0 veya 1. */
export type Input = { dx: number; dy: number };

export type GameEvent =
  | { type: 'trail-start' }
  | { type: 'capture'; cells: number; trapped: number; points: number; percent: number }
  | { type: 'death'; cause: DeathCause; livesLeft: number }
  | { type: 'respawn' }
  | { type: 'level-clear'; level: number; percent: number; bonus: number }
  | { type: 'game-over'; score: number; level: number };
