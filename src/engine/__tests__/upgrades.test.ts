import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CAMPAIGN_LENGTH, captureGold, missionPlan } from '../campaign';
import { DEATH_FREEZE, PLAYER_SPEED, START_LIVES } from '../config';
import { Game } from '../game';
import {
  MAX_PART_LEVEL,
  PART_IDS,
  defaultLoadout,
  loadoutValue,
  normalizeLoadout,
  partCost,
  shipStats,
} from '../upgrades';
import { eventsOfType, makeEnemy, stepOnce } from './helpers';

test('fabrika çıkışı gemi yükseltme öncesi değerleri korur', () => {
  const stats = shipStats(defaultLoadout());

  assert.equal(stats.edgeSpeed, PLAYER_SPEED);
  assert.equal(stats.diveSpeed, PLAYER_SPEED);
  assert.equal(stats.retraceBoost, 1);
  assert.equal(stats.extraLives, 0);
  assert.equal(stats.deathFreeze, DEATH_FREEZE);
  assert.equal(stats.shieldCharges, 0);
  assert.equal(stats.shotInterval, Infinity, 'silah alınmadan ateş edilmez');
});

test('her parça kendi değerini artırır', () => {
  assert.ok(shipStats({ ...defaultLoadout(), wing: 4 }).edgeSpeed > PLAYER_SPEED);
  assert.ok(shipStats({ ...defaultLoadout(), engine: 4 }).diveSpeed > PLAYER_SPEED);
  assert.ok(shipStats({ ...defaultLoadout(), tail: 4 }).retraceBoost > 1);
  assert.ok(shipStats({ ...defaultLoadout(), composite: 4 }).extraLives > 0);
  assert.ok(shipStats({ ...defaultLoadout(), composite: 4 }).deathFreeze < DEATH_FREEZE);
  assert.ok(Number.isFinite(shipStats({ ...defaultLoadout(), weapon: 1 }).shotInterval));
  assert.ok(shipStats({ ...defaultLoadout(), shield: 4 }).shieldCharges > 0);
});

test('kademe fiyatları artar ve dolu parça satın alınamaz', () => {
  for (const id of PART_IDS) {
    let previous = 0;
    for (let level = 0; level < MAX_PART_LEVEL; level++) {
      const cost = partCost(id, level);
      assert.ok(cost !== null && cost > previous, `${id} ${level}. kademe fiyatı artmalı`);
      previous = cost;
    }
    assert.equal(partCost(id, MAX_PART_LEVEL), null);
  }
});

test('bozuk donanım verisi geçerli seviyelere indirilir', () => {
  const loadout = normalizeLoadout({ wing: 99, engine: -3, tail: 2.7, bilinmeyen: 4, shield: 'x' });

  assert.equal(loadout.wing, MAX_PART_LEVEL);
  assert.equal(loadout.engine, 0);
  assert.equal(loadout.tail, 2);
  assert.equal(loadout.shield, 0);
  assert.equal(Object.keys(loadout).length, PART_IDS.length);
});

test('gemi değeri alınan kademelerin toplamıdır', () => {
  const empty = loadoutValue(defaultLoadout());
  const one = loadoutValue({ ...defaultLoadout(), wing: 1 });
  const two = loadoutValue({ ...defaultLoadout(), wing: 2 });

  assert.equal(empty, 0);
  assert.equal(one, partCost('wing', 0));
  assert.equal(two, (partCost('wing', 0) ?? 0) + (partCost('wing', 1) ?? 0));
});

test('kampanya görev görev zorlaşır', () => {
  let previousTarget = 0;
  let previousReward = 0;
  for (let index = 1; index <= CAMPAIGN_LENGTH + 4; index++) {
    const plan = missionPlan(index);
    assert.ok(plan.target >= previousTarget, `${index}. görevde hedef düşmemeli`);
    assert.ok(plan.reward > previousReward, `${index}. görevde prim artmalı`);
    assert.equal(plan.endless, index > CAMPAIGN_LENGTH);
    previousTarget = plan.target;
    previousReward = plan.reward;
  }

  const first = missionPlan(1).difficulty;
  const last = missionPlan(CAMPAIGN_LENGTH).difficulty;
  assert.ok(last.swarm > first.swarm);
  assert.ok(last.hunters > first.hunters);
  assert.ok(last.speed > first.speed);
  assert.ok(last.hunterTurn > first.hunterTurn, 'virüsler görev görev daha ısrarlı olur');
  assert.ok(last.spawnInterval < first.spawnInterval, 'doğumlar sıklaşır');
  // İlk bölüm de rahat değil: iki tür mikrop, bir avcı, hızlı patojen, sık doğum.
  assert.ok(first.hunters >= 1, 'ilk görevde de avcı virüs var');
  assert.ok(first.swarm >= 2, 'ilk görevde en az iki mikrop');
  assert.ok(first.speed >= 9);
  assert.ok(first.spawnInterval <= 24);
  assert.ok(missionPlan(1).target >= 62, 'ilk görevde hedef en az %62');
});

test('görev kurulumu kampanyanın hedefini kullanır', () => {
  const game = new Game({ width: 16, height: 16, seed: 3 });
  game.startMission(5);

  assert.equal(game.level, 5);
  assert.equal(game.targetPercent, missionPlan(5).target);
});

test('kompozit gövde ek gemi verir', () => {
  const game = new Game({ width: 16, height: 16, seed: 3, loadout: { composite: 3 } });
  game.start();

  assert.equal(game.lives, START_LIVES + shipStats({ ...defaultLoadout(), composite: 3 }).extraLives);
});

test('kanat kenarda daha çok hücre kat ettirir', () => {
  const run = (wing: number) => {
    const game = new Game({ width: 24, height: 24, seed: 5, loadout: { wing } });
    game.start();
    const startX = game.player.x;
    game.update(0.2, { dx: -1, dy: 0 });
    return startX - game.player.x;
  };

  assert.ok(run(4) > run(0), 'kanatlı gemi aynı sürede daha uzağa gitmeli');
});

test('alan kapatmak ve görevi bitirmek altın kazandırır', () => {
  const game = new Game({ width: 16, height: 16, seed: 42 });
  game.start();
  game.enemies = [makeEnemy('boss', 11.5, 7.5)];

  const events = [
    ...stepOnce(game, { dx: 0, dy: -1 }),
    ...stepOnce(game, { dx: -1, dy: 0 }),
    ...stepOnce(game, { dx: 0, dy: 1 }),
  ];
  const capture = eventsOfType(events, 'capture');

  assert.equal(capture.length, 1);
  assert.ok(capture[0].gold > 0);
  assert.equal(game.gold, capture[0].gold);

  const earned = game.takeGold();
  assert.equal(earned, capture[0].gold);
  assert.equal(game.gold, 0, 'altın arayüze devredilince sıfırlanır');
});

test('ışın topu mikrobu düşürür', () => {
  const game = new Game({ width: 24, height: 24, seed: 11, loadout: { weapon: 1 } });
  game.start();
  game.enemies = [makeEnemy('drifter', game.player.x + 0.5, game.player.y - 5, 7)];

  const events: ReturnType<Game['update']> = [];
  for (let i = 0; i < 120 && game.enemies.length > 0; i++) {
    events.push(...game.update(1 / 60, { dx: 0, dy: 0 }));
  }
  const down = eventsOfType(events, 'enemy-down');

  assert.equal(down.length, 1);
  assert.equal(down[0].kind, 'drifter');
  assert.ok(down[0].points > 0);
  assert.equal(game.enemies.length, 0);
});

test('silahsız gemi ateş etmez', () => {
  const game = new Game({ width: 24, height: 24, seed: 11 });
  game.start();
  game.enemies = [makeEnemy('drifter', game.player.x + 0.5, game.player.y - 5, 7)];

  for (let i = 0; i < 180; i++) game.update(1 / 60, { dx: 0, dy: 0 });

  assert.equal(game.shots.length, 0);
  assert.equal(game.enemies.length, 1);
});

test('kalkan darbeyi emer, ikinci vuruş can götürür', () => {
  const game = new Game({ width: 16, height: 16, seed: 7, loadout: { shield: 1 } });
  game.start();
  game.enemies = [makeEnemy('boss', 11.5, 7.5)];
  assert.equal(game.shield, 1);

  stepOnce(game, { dx: 0, dy: -1 });
  game.invulnerable = 0;
  game.enemies.push(makeEnemy('drifter', game.player.x + 0.5, game.player.y + 0.5, 99));

  const absorbed = game.update(1 / 60, { dx: 0, dy: 0 });

  assert.equal(eventsOfType(absorbed, 'shield-hit').length, 1);
  assert.equal(eventsOfType(absorbed, 'death').length, 0);
  assert.equal(game.lives, START_LIVES);
  assert.equal(game.shield, 0);
  assert.equal(game.phase, 'playing');

  game.invulnerable = 0;
  game.enemies.push(makeEnemy('drifter', game.player.x + 0.5, game.player.y + 0.5, 100));
  // Kalkan boşken aynı temas canı götürür; ölüm adımın kendisinde olur.
  const hit = [...stepOnce(game, { dx: 0, dy: -1 }), ...game.update(1 / 60, { dx: 0, dy: 0 })];

  assert.equal(eventsOfType(hit, 'death').length, 1);
  assert.equal(game.lives, START_LIVES - 1);
});

test('kapatma altını hücre ve tuzak sayısıyla artar', () => {
  assert.ok(captureGold(500, 0) > captureGold(100, 0));
  assert.ok(captureGold(100, 2) > captureGold(100, 0));
  assert.ok(captureGold(1, 0) >= 1);
});
