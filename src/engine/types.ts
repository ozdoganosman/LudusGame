import type { Behavior, SpeciesId } from './species';

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
  /** Tür kimliği: davranışı, adı ve çizimi buradan gelir. */
  species: SpeciesId;
  behavior: Behavior;
  /** Hücre koordinatı, kesirli. */
  x: number;
  y: number;
  /** Hücre/saniye. */
  vx: number;
  vy: number;
  /** Gittiği yön (radyan); davranışlar bunu değiştirir. */
  heading: number;
  /** Temel hız (hücre/saniye); davranışlar bunu çarpanla kullanır. */
  speed: number;
  /** Davranışın kendi zamanlayıcısı (saniye). */
  timer: number;
  /** Durum makinesi olan davranışlarda evre (0 = bekle, 1 = atıl). */
  phase: number;
  /** Dönen türlerin merkezi. */
  anchor?: Vec;
  /** Hücre cinsinden çarpışma yarıçapı. */
  radius: number;
  /** Görsel dönüş açısı; oynanışı etkilemez. */
  spin: number;
};

/** Silah yükseltmesinin attığı mermi. */
export type Shot = {
  id: number;
  /** Hücre koordinatı, kesirli. */
  x: number;
  y: number;
  /** Hücre/saniye. */
  vx: number;
  vy: number;
  /** Kalan menzil (hücre); tükenince mermi kaybolur. */
  range: number;
};

export type Phase = 'ready' | 'playing' | 'dying' | 'levelClear' | 'gameOver';

export type DeathCause = 'enemy' | 'trail-cut' | 'self';

/** Joystick'ten gelen yön; her bileşen -1, 0 veya 1. */
export type Input = {
  dx: number;
  dy: number;
  /**
   * Dalış tuşu basılı mı? Ele geçirilmiş alandan boş alana ilk adım yalnızca
   * bu açıkken atılır; kazara kenardan çıkmayı önler. İz başladıktan sonra
   * hareket serbesttir.
   */
  dive?: boolean;
};

export type GameEvent =
  | { type: 'trail-start' }
  | {
      type: 'capture';
      cells: number;
      trapped: number;
      points: number;
      percent: number;
      gold: number;
    }
  /** Kalkan bir darbeyi emdi: can gitmedi. */
  | { type: 'shield-hit'; chargesLeft: number }
  /** Silahla düşman düşürüldü. */
  | { type: 'enemy-down'; kind: EnemyKind; species: SpeciesId; points: number; gold: number }
  /** Bölünen bir tür çoğaldı. */
  | { type: 'enemy-split'; species: SpeciesId }
  | { type: 'death'; cause: DeathCause; livesLeft: number }
  | { type: 'respawn' }
  | { type: 'level-clear'; level: number; percent: number; bonus: number; gold: number }
  | { type: 'game-over'; score: number; level: number };
