import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CAMPAIGN_LENGTH, missionPlan } from '../campaign';
import { Game } from '../game';
import { SPECIES_IDS, speciesOf } from '../species';
import type { Behavior, SpeciesId } from '../species';
import { FILLED } from '../types';
import type { Enemy } from '../types';
import { placeSpecies } from './helpers';

const SPEED = 8;

type Trace = {
  /** Toplam dönüş miktarı (radyan). */
  turning: number;
  speedMin: number;
  speedMax: number;
  /** Başlangıç ile bitiş arası mesafe (hücre). */
  net: number;
  /** Gemiye olan mesafenin başı ve sonu. */
  firstDistance: number;
  lastDistance: number;
  /** Yana salınım sayısı (hız vektörünün yön değiştirmesi). */
  weaves: number;
  /** x ve y eksenlerinde yön değiştirme sayısı. */
  turnsX: number;
  turnsY: number;
  /** En yakın temizlenmiş hücreye uzaklık: başta ve sonda. */
  firstWall: number;
  lastWall: number;
  count: number;
};

/** Bir türü sahaya koyup hareketini ölçer. */
function observe(id: SpeciesId, seconds: number, at = { x: 32, y: 40 }): Trace {
  const game = new Game({ seed: 99 });
  game.start(1);
  const enemy = placeSpecies(game, id, at.x, at.y, SPEED);
  const target = { x: game.player.x + 0.5, y: game.player.y + 0.5 };

  const distanceTo = (e: Enemy) => Math.hypot(e.x - target.x, e.y - target.y);
  const wallDistance = (e: Enemy) => {
    let best = Infinity;
    for (let y = 0; y < game.field.h; y++) {
      for (let x = 0; x < game.field.w; x++) {
        if (game.field.get(x, y) !== FILLED) continue;
        best = Math.min(best, Math.hypot(x + 0.5 - e.x, y + 0.5 - e.y));
      }
    }
    return best;
  };

  const start = { x: enemy.x, y: enemy.y };
  const trace: Trace = {
    turning: 0,
    speedMin: Infinity,
    speedMax: 0,
    net: 0,
    firstDistance: distanceTo(enemy),
    lastDistance: 0,
    weaves: 0,
    turnsX: 0,
    turnsY: 0,
    firstWall: wallDistance(enemy),
    lastWall: 0,
    count: 1,
  };

  let previousHeading = enemy.heading;
  let previousCross = 0;
  let previousVx = 0;
  let previousVy = 0;

  for (let frame = 0; frame < seconds * 60; frame++) {
    // Ölüm değil hareket ölçülüyor: gemi dokunulmaz kalsın.
    game.invulnerable = 999;
    game.update(1 / 60, { dx: 0, dy: 0 });
    const current = game.enemies[0];
    if (!current) break;

    const speed = Math.hypot(current.vx, current.vy);
    trace.speedMin = Math.min(trace.speedMin, speed);
    trace.speedMax = Math.max(trace.speedMax, speed);
    trace.turning += Math.abs(shortest(current.heading - previousHeading));
    previousHeading = current.heading;

    if (frame > 0) {
      const cross = previousVx * current.vy - previousVy * current.vx;
      if (previousCross !== 0 && Math.sign(cross) !== 0 && Math.sign(cross) !== Math.sign(previousCross)) {
        trace.weaves++;
      }
      if (Math.sign(cross) !== 0) previousCross = Math.sign(cross);
      if (Math.sign(current.vx) !== 0 && Math.sign(previousVx) !== 0 && Math.sign(current.vx) !== Math.sign(previousVx)) {
        trace.turnsX++;
      }
      if (Math.sign(current.vy) !== 0 && Math.sign(previousVy) !== 0 && Math.sign(current.vy) !== Math.sign(previousVy)) {
        trace.turnsY++;
      }
    }
    previousVx = current.vx;
    previousVy = current.vy;

    trace.count = game.enemies.length;
    trace.lastDistance = distanceTo(current);
    trace.net = Math.hypot(current.x - start.x, current.y - start.y);
    trace.lastWall = wallDistance(current);
  }

  return trace;
}

function shortest(diff: number): number {
  let d = diff;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

test('seken tür düz gider, sabit hızda', () => {
  const trace = observe('clot', 1.2);

  assert.ok(trace.turning < 0.05, `seken tür dönmemeli: ${trace.turning.toFixed(2)}`);
  assert.ok(trace.speedMax - trace.speedMin < 0.01, 'hızı sabit olmalı');
  assert.ok(trace.net > 5, 'yerinde durmamalı');
});

test('kıvrılan tür yana salınarak ilerler', () => {
  const trace = observe('mucusWorm', 4);

  assert.ok(trace.weaves >= 4, `salınım yok: ${trace.weaves}`);
  assert.ok(trace.net > 8, 'salınırken de yol almalı');
});

test('nabızlı tür iter ve sürüklenir', () => {
  const trace = observe('mucusBubble', 4);

  assert.ok(trace.speedMax / Math.max(trace.speedMin, 0.01) > 3, 'hız nabız gibi atmalı');
});

test('atılgan tür bekler, sonra hızla atılır', () => {
  const trace = observe('saltCrystal', 4);

  assert.ok(trace.speedMin < SPEED * 0.2, `beklemiyor: ${trace.speedMin.toFixed(2)}`);
  assert.ok(trace.speedMax > SPEED * 1.8, `atılmıyor: ${trace.speedMax.toFixed(2)}`);
});

test('zıplayan tür gemiye doğru sıçrar', () => {
  const trace = observe('ciliaPhage', 5);

  assert.ok(trace.lastDistance < trace.firstDistance, 'gemiye yaklaşmalı');
  assert.ok(trace.speedMax / Math.max(trace.speedMin, 0.01) > 3, 'sıçrayışlar arasında yavaşlamalı');
});

test('takipçi tür ısrarla gemiye yaklaşır', () => {
  const trace = observe('needle', 5);

  assert.ok(
    trace.lastDistance < trace.firstDistance * 0.6,
    `takip etmiyor: ${trace.firstDistance.toFixed(1)} -> ${trace.lastDistance.toFixed(1)}`
  );
});

test('duvarda gezen tür temizlenmiş dokunun sınırına yapışır', () => {
  const trace = observe('acidAmoeba', 11);

  assert.ok(
    trace.lastWall < trace.firstWall * 0.2,
    `sınıra yaklaşmıyor: ${trace.firstWall.toFixed(1)} -> ${trace.lastWall.toFixed(1)}`
  );
  assert.ok(trace.lastWall < 2, `sınırın dibinde dolaşmalı: ${trace.lastWall.toFixed(2)}`);
});

test('dönen tür çapasının çevresinde tur atar', () => {
  const trace = observe('alveolarHook', 8);

  assert.ok(trace.turning > Math.PI * 2, `tur atmıyor: ${trace.turning.toFixed(1)}`);
  assert.ok(trace.net < 26, 'çapasından kopmamalı');
});

test('hücum eden tür önce dolaşır, sonra saldırır', () => {
  const trace = observe('sediment', 6);

  assert.ok(trace.speedMin < SPEED * 0.6, 'ağır ağır dolaşmalı');
  assert.ok(trace.speedMax > SPEED * 2, `hücum etmiyor: ${trace.speedMax.toFixed(2)}`);
});

test('sekiz çizen tür iki eksende de yön değiştirir', () => {
  const trace = observe('blackBalloon', 10);

  assert.ok(trace.turnsX >= 2, `yatayda dönmüyor: ${trace.turnsX}`);
  assert.ok(trace.turnsY >= 4, `düşeyde dönmüyor: ${trace.turnsY}`);
});

test('bölünen tür zamanla çoğalır', () => {
  const trace = observe('bloodClot', 9);

  assert.ok(trace.count > 1, 'bölünmedi');
});

test('her tür bir bölümün kadrosunda geçer ve her davranış kullanılır', () => {
  const used = new Set<SpeciesId>();
  const behaviors = new Set<Behavior>();

  for (let index = 1; index <= CAMPAIGN_LENGTH + 1; index++) {
    for (const entry of missionPlan(index).roster) {
      used.add(entry.species);
      behaviors.add(speciesOf(entry.species).behavior);
    }
  }

  for (const id of SPECIES_IDS) {
    assert.ok(used.has(id), `${id} hiçbir bölümde kullanılmıyor`);
  }
  assert.equal(behaviors.size, 11, `kullanılmayan davranış var: ${[...behaviors].join(',')}`);
});

test('bölümlerin kadrosu birbirinden farklı', () => {
  const signatures = new Set<string>();
  for (let index = 1; index <= CAMPAIGN_LENGTH; index++) {
    const signature = missionPlan(index)
      .roster.map((entry) => entry.species)
      .sort()
      .join(',');
    assert.ok(!signatures.has(signature), `${index}. bölümün kadrosu tekrar ediyor`);
    signatures.add(signature);
  }
});

test('bir bölümde en az üç farklı davranış bulunur', () => {
  for (let index = 3; index <= CAMPAIGN_LENGTH; index++) {
    const behaviors = new Set(
      missionPlan(index).roster.map((entry) => speciesOf(entry.species).behavior)
    );
    assert.ok(
      behaviors.size >= 3,
      `${index}. bölümde düşmanlar aynı hareket ediyor: ${[...behaviors].join(',')}`
    );
  }
});
