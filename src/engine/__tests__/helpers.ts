import { PLAYER_SPEED } from '../config';
import { Game } from '../game';
import type { Enemy, EnemyKind, GameEvent, Input } from '../types';

/** Test için sabit, hareketsiz düşman. */
export function makeEnemy(kind: EnemyKind, x: number, y: number, id = 1): Enemy {
  return {
    id,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: kind === 'boss' ? 2.1 : 1.3,
    spin: 0,
  };
}

/** Oyuncuyu tam olarak bir hücre ilerletecek kadar süre işletir. */
export function stepOnce(game: Game, input: Input): GameEvent[] {
  const diagonal = input.dx !== 0 && input.dy !== 0;
  const dt = (diagonal ? Math.SQRT2 : 1) / PLAYER_SPEED + 1e-9;
  return game.update(dt, input);
}

/** Aynı yönde n hücre ilerletir, oluşan tüm olayları döndürür. */
export function stepMany(game: Game, input: Input, times: number): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < times; i++) events.push(...stepOnce(game, input));
  return events;
}

export function eventsOfType<T extends GameEvent['type']>(
  events: readonly GameEvent[],
  type: T
): Extract<GameEvent, { type: T }>[] {
  return events.filter((event): event is Extract<GameEvent, { type: T }> => event.type === type);
}
