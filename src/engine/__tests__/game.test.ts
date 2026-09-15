import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEATH_FREEZE, MAX_DT, START_LIVES } from '../config';
import { Game } from '../game';
import { EMPTY, FILLED, TRAIL } from '../types';
import { eventsOfType, makeEnemy, stepMany, stepOnce } from './helpers';

/** 16x16 alanda, sağ bölgede sabit patronla kontrollü bir oyun kurar. */
function setupGame() {
  const game = new Game({ width: 16, height: 16, seed: 42 });
  game.start();
  game.enemies = [makeEnemy('boss', 11.5, 7.5)];
  return game;
}

test('yeni oyun çerçeve üzerinde ve çizim yapmadan başlar', () => {
  const game = setupGame();
  assert.equal(game.phase, 'playing');
  assert.equal(game.lives, START_LIVES);
  assert.equal(game.player.x, 8);
  assert.equal(game.player.y, 15);
  assert.equal(game.player.drawing, false);
  assert.equal(game.percent, 0);
});

test('çerçeve üzerinde hareket iz bırakmaz', () => {
  const game = setupGame();
  stepMany(game, { dx: -1, dy: 0 }, 3);

  assert.equal(game.player.x, 5);
  assert.equal(game.player.y, 15);
  assert.equal(game.player.drawing, false);
  assert.equal(game.trail.length, 0);
  assert.equal(game.percent, 0);
});

test('boş alana girmek izi başlatır', () => {
  const game = setupGame();
  const events = stepOnce(game, { dx: 0, dy: -1 });

  assert.equal(eventsOfType(events, 'trail-start').length, 1);
  assert.equal(game.player.drawing, true);
  assert.deepEqual(game.trail, [{ x: 8, y: 14 }]);
  assert.equal(game.field.get(8, 14), TRAIL);
});

test('izi çerçeveye bağlamak patronsuz bölgeyi ele geçirir', () => {
  const game = setupGame();
  // (8,15) -> (8,0): 14 hücre iz, son adım çerçeveye değip izi kapatır.
  const events = stepMany(game, { dx: 0, dy: -1 }, 15);
  const captures = eventsOfType(events, 'capture');

  assert.equal(captures.length, 1);
  // 14 iz hücresi + soldaki 7x14 = 98 hücrelik bölge
  assert.equal(captures[0].cells, 112);
  assert.equal(captures[0].trapped, 0);
  assert.ok(captures[0].points > 0, 'ele geçirme puan vermeli');
  assert.equal(game.player.drawing, false);
  assert.equal(game.trail.length, 0);
  assert.equal(game.field.get(3, 7), FILLED, 'patronsuz bölge dolmalı');
  assert.equal(game.field.get(11, 7), EMPTY, 'patronun bölgesi boş kalmalı');
  assert.equal(game.field.recount(), 112);
  assert.ok(Math.abs(game.percent - (112 / 196) * 100) < 1e-9);
});

test('çapraz iz 4 komşuluk üzerinden bağlı kalır', () => {
  const game = setupGame();
  stepMany(game, { dx: -1, dy: -1 }, 5);

  assert.ok(game.trail.length >= 5);
  for (let i = 1; i < game.trail.length; i++) {
    const previous = game.trail[i - 1];
    const current = game.trail[i];
    const distance = Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y);
    assert.equal(distance, 1, `iz ${i}. adımda kopuk: köşe hücresi doldurulmamış`);
  }
});

test('kendi izine girmek canı götürür', () => {
  const game = setupGame();
  stepMany(game, { dx: 0, dy: -1 }, 5); // yukarı: (8,14)...(8,10)
  stepMany(game, { dx: -1, dy: 0 }, 3); // sola: (7,10),(6,10),(5,10)
  stepMany(game, { dx: 0, dy: 1 }, 2); // aşağı: (5,11),(5,12)
  const events = stepMany(game, { dx: 1, dy: 0 }, 3); // sağa: (6,12),(7,12) -> (8,12) iz

  const deaths = eventsOfType(events, 'death');
  assert.equal(deaths.length, 1);
  assert.equal(deaths[0].cause, 'self');
  assert.equal(game.lives, START_LIVES - 1);
  assert.equal(game.phase, 'dying');
  assert.equal(game.trail.length, 0, 'ölümde iz silinir');
  assert.equal(game.field.get(8, 12), EMPTY);
});

test('bir hücre geri dönmek öldürmez, sadece engellenir', () => {
  const game = setupGame();
  stepMany(game, { dx: 0, dy: -1 }, 3);
  const before = { ...game.player };

  const events = stepOnce(game, { dx: 0, dy: 1 });

  assert.equal(eventsOfType(events, 'death').length, 0);
  assert.equal(game.player.x, before.x);
  assert.equal(game.player.y, before.y);
});

test('düşman ize değerse oyuncu ölür', () => {
  const game = setupGame();
  stepMany(game, { dx: 0, dy: -1 }, 4);
  const trailCell = game.trail[1];
  game.enemies.push(makeEnemy('drifter', trailCell.x + 0.5, trailCell.y + 0.5, 99));

  const events = game.update(1 / 60, { dx: 0, dy: 0 });
  const deaths = eventsOfType(events, 'death');

  assert.equal(deaths.length, 1);
  assert.equal(deaths[0].cause, 'trail-cut');
});

test('ele geçirilmiş alanda dururken düşman teması öldürmez', () => {
  const game = setupGame();
  game.invulnerable = 0;
  // Oyuncu çerçevede (dolu hücrede); düşman duvarın hemen ardında.
  game.enemies.push(makeEnemy('drifter', game.player.x + 0.5, game.player.y - 0.6, 99));

  const events = game.update(1 / 60, { dx: 0, dy: 0 });

  assert.equal(eventsOfType(events, 'death').length, 0);
  assert.equal(game.lives, START_LIVES);
});

test('boş alanda düşman teması öldürür', () => {
  const game = setupGame();
  stepOnce(game, { dx: 0, dy: -1 }); // (8,14): artık izde, yani açıkta
  game.invulnerable = 0;
  // Menzil içinde ama iz hücresinde değil: ölüm sebebi temas olmalı.
  game.enemies.push(makeEnemy('drifter', game.player.x + 2, game.player.y + 0.5, 99));

  const events = game.update(1 / 60, { dx: 0, dy: 0 });
  const deaths = eventsOfType(events, 'death');

  assert.equal(deaths.length, 1);
  assert.equal(deaths[0].cause, 'enemy');
});

test('dokunulmazken düşman teması öldürmez', () => {
  const game = setupGame();
  stepOnce(game, { dx: 0, dy: -1 });
  game.invulnerable = 1.5;
  game.enemies.push(makeEnemy('drifter', game.player.x + 2, game.player.y + 0.5, 99));

  const events = game.update(1 / 60, { dx: 0, dy: 0 });

  assert.equal(eventsOfType(events, 'death').length, 0);
});

test('ölüm donmasından sonra oyuncu geri doğar', () => {
  const game = setupGame();
  stepOnce(game, { dx: 0, dy: -1 });
  game.invulnerable = 0;
  game.enemies.push(makeEnemy('drifter', game.player.x + 2, game.player.y + 0.5, 99));
  game.update(1 / 60, { dx: 0, dy: 0 });
  assert.equal(game.phase, 'dying');

  // update büyük dt'yi MAX_DT'ye kırptığı için donma birkaç karede tükenir.
  const events = [];
  for (let i = 0; i < Math.ceil(DEATH_FREEZE / MAX_DT) + 2; i++) {
    events.push(...game.update(MAX_DT, { dx: 0, dy: 0 }));
  }

  assert.equal(eventsOfType(events, 'respawn').length, 1);
  assert.equal(game.phase, 'playing');
  assert.equal(game.field.get(game.player.x, game.player.y), FILLED, 'ele geçirilmiş alanda doğmalı');
  assert.ok(game.invulnerable > 0);
});

test('canlar tükenince oyun biter', () => {
  const game = new Game({ width: 16, height: 16, seed: 7, lives: 1 });
  game.start();
  game.enemies = [makeEnemy('boss', 11.5, 7.5)];
  stepOnce(game, { dx: 0, dy: -1 });
  game.invulnerable = 0;
  game.enemies.push(makeEnemy('drifter', game.player.x + 2, game.player.y + 0.5, 99));

  const events = game.update(1 / 60, { dx: 0, dy: 0 });

  assert.equal(game.phase, 'gameOver');
  assert.equal(game.lives, 0);
  const over = eventsOfType(events, 'game-over');
  assert.equal(over.length, 1);
  assert.equal(over[0].level, 1);
});

test('hedef yüzdeye ulaşınca seviye tamamlanır', () => {
  const game = setupGame();
  game.enemies = [];
  // İç alanın %85'ini doldur: 196 hücrenin 167'si.
  let filled = 0;
  for (let y = 1; y < 15 && filled < 167; y++) {
    for (let x = 1; x < 15 && filled < 167; x++) {
      game.field.set(x, y, FILLED);
      filled++;
    }
  }

  const events = game.update(1 / 60, { dx: 0, dy: 0 });
  const clear = eventsOfType(events, 'level-clear');

  assert.equal(clear.length, 1);
  assert.equal(clear[0].level, 1);
  assert.ok(clear[0].percent >= game.targetPercent);
  assert.ok(clear[0].bonus > 0);
  assert.equal(game.phase, 'levelClear');
});

test('sonraki seviye alanı sıfırlar ve zorluğu artırır', () => {
  const game = setupGame();
  const firstLevelEnemies = game.enemies.length;
  stepMany(game, { dx: 0, dy: -1 }, 15);
  assert.ok(game.percent > 0);

  game.nextLevel();

  assert.equal(game.level, 2);
  assert.equal(game.percent, 0);
  assert.equal(game.phase, 'playing');
  assert.ok(game.enemies.some((enemy) => enemy.kind === 'boss'), 'her seviyede patron olur');
  assert.ok(game.enemies.length > firstLevelEnemies);
});

test('kapatılan bölgede kalan düşman yok edilir ve puan verir', () => {
  const game = setupGame();
  game.enemies.push(makeEnemy('drifter', 3.5, 7.5, 50));
  const scoreBefore = game.score;

  const events = stepMany(game, { dx: 0, dy: -1 }, 15);
  const captures = eventsOfType(events, 'capture');

  assert.equal(captures.length, 1);
  assert.equal(captures[0].trapped, 1);
  assert.ok(game.score - scoreBefore > captures[0].cells * 8);
  assert.ok(!game.enemies.some((enemy) => enemy.id === 50));
});

test('duraklatma girdisi yoksa oyuncu yerinde kalır', () => {
  const game = setupGame();
  game.update(0.5, { dx: 0, dy: 0 });
  assert.equal(game.player.x, 8);
  assert.equal(game.player.y, 15);
});
