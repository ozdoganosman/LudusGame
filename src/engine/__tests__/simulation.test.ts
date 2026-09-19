import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findEmptyRegions } from '../field';
import { Game } from '../game';
import { createRng } from '../rng';
import { FILLED, TRAIL } from '../types';
import type { Input } from '../types';

const DIRECTIONS: Input[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
];

test('rng aynı tohumla aynı diziyi üretir', () => {
  const a = createRng(1234);
  const b = createRng(1234);
  const c = createRng(1235);
  const first = [a.next(), a.next(), a.next()];
  const second = [b.next(), b.next(), b.next()];

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, [c.next(), c.next(), c.next()]);
  assert.ok(first.every((value) => value >= 0 && value < 1));
});

test('60 saniyelik rastgele oynanışta oyun tutarlı kalır', () => {
  const game = new Game({ seed: 2024 });
  game.start();
  const rng = createRng(99);
  let direction = DIRECTIONS[0];
  let captures = 0;
  let deaths = 0;

  for (let frame = 0; frame < 3600; frame++) {
    // Yön ara sıra değişsin ki oyuncu alanın içinde gerçekten dolaşsın.
    if (frame % 12 === 0) direction = rng.pick(DIRECTIONS);
    const events = game.update(1 / 60, direction);

    for (const event of events) {
      if (event.type === 'capture') {
        captures++;
        // Her kapatmadan sonra tek bir boş bölge kalmalı: patronunki.
        // Aksi halde asla dolmayacak bir cep oluşmuş demektir.
        assert.equal(
          findEmptyRegions(game.field).cells.length,
          1,
          `${frame}. karede kapatma sonrası kapalı cep kaldı`
        );
      }
      if (event.type === 'death') deaths++;
      if (event.type === 'level-clear') game.nextLevel();
      if (event.type === 'game-over') game.start();
    }

    const percent = game.percent;
    assert.ok(percent >= 0 && percent <= 100, `yüzde aralık dışında: ${percent}`);

    // Oyun akarken oyuncu ya ele geçirilmiş alanda ya da kendi izinde olmalı.
    // 'dying' fazında iz silindiği için gemi kısa süre boş alanda kalır.
    if (game.phase === 'playing') {
      const cell = game.field.get(game.player.x, game.player.y);
      assert.ok(
        cell === FILLED || cell === TRAIL,
        `oyuncu ${frame}. karede geçersiz hücrede: ${cell}`
      );
      // Çizim yapmıyorsa ele geçirilmiş alanın kenarında olmalı, içinde değil.
      if (cell === FILLED) {
        assert.ok(
          game.field.isEdge(game.player.x, game.player.y),
          `oyuncu ${frame}. karede bloğun içinde kaldı`
        );
      }
    }

    for (const enemy of game.enemies) {
      const ex = Math.floor(enemy.x);
      const ey = Math.floor(enemy.y);
      assert.ok(game.field.inBounds(ex, ey), 'düşman alan dışına çıktı');
      if (enemy.kind === 'boss') {
        assert.notEqual(
          game.field.get(ex, ey),
          FILLED,
          `patron ${frame}. karede ele geçirilmiş alanın içinde kaldı`
        );
      }
      assert.notEqual(
        game.field.get(ex, ey),
        FILLED,
        `düşman ${frame}. karede dolu hücreye sıkıştı`
      );
    }

    if (game.player.drawing) {
      assert.ok(game.trail.length > 0, 'çizim sırasında iz boş olamaz');
    } else {
      assert.equal(game.trail.length, 0, 'çizim bitince iz temizlenir');
    }
  }

  assert.ok(captures > 0, 'rastgele oynanışta en az bir alan kapatılmalı');
  assert.ok(game.score >= 0);
  assert.ok(deaths >= 0);
});
