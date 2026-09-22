import { PLAYER_SPEED } from '../config';
import { Game } from '../game';
import { speciesOf } from '../species';
import type { SpeciesId } from '../species';
import type { Enemy, EnemyKind, GameEvent, Input } from '../types';

const SAMPLE: Record<EnemyKind, SpeciesId> = {
  drifter: 'clot',
  hunter: 'needle',
  boss: 'sediment',
};

/**
 * Test için sabit, hareketsiz düşman: hızı sıfır ve davranışı 'bouncer'
 * olduğu için motor onu yerinden oynatmaz.
 */
export function makeEnemy(kind: EnemyKind, x: number, y: number, id = 1): Enemy {
  return {
    id,
    kind,
    species: SAMPLE[kind],
    behavior: 'bouncer',
    x,
    y,
    vx: 0,
    vy: 0,
    heading: 0,
    speed: 0,
    timer: 0,
    phase: 0,
    radius: speciesOf(SAMPLE[kind]).radius,
    spin: 0,
  };
}

/** Belirli bir türü sahaya koyar (davranış testleri için). */
export function placeSpecies(game: Game, id: SpeciesId, x: number, y: number, speed = 8): Enemy {
  const species = speciesOf(id);
  const enemy: Enemy = {
    id: 1,
    kind: species.kind,
    species: id,
    behavior: species.behavior,
    x,
    y,
    vx: speed,
    vy: 0,
    heading: 0,
    speed,
    timer: 0,
    phase: 0,
    anchor: species.behavior === 'spinner' ? { x, y } : undefined,
    radius: species.radius,
    spin: 0,
  };
  game.enemies = [enemy];
  return enemy;
}

/**
 * Oyuncuyu tam olarak bir hücre ilerletecek kadar süre işletir.
 * Dalış tuşu aksi belirtilmedikçe basılı sayılır; tuşun kendisini sınayan
 * testler `dive: false` geçirir.
 */
export function stepOnce(game: Game, input: Input): GameEvent[] {
  const diagonal = input.dx !== 0 && input.dy !== 0;
  const dt = (diagonal ? Math.SQRT2 : 1) / PLAYER_SPEED + 1e-9;
  return game.update(dt, { dive: true, ...input });
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
