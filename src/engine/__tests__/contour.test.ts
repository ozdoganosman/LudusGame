import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Field } from '../field';
import { FILLED } from '../types';
import { chamfer, traceOutline, territoryOutline } from '../../ui/contour';

test('boş alanın sınırı: dış dikdörtgen ve çerçevenin iç kenarı', () => {
  const field = new Field(10, 10);
  const loops = traceOutline(field);

  assert.equal(loops.length, 2, 'çerçeve bir halka: dışı ve içi');
  const sizes = loops.map((loop) => loop.length).sort();
  assert.deepEqual(sizes, [4, 4], 'ikisi de dört köşeli dikdörtgen');

  const outer = loops.find((loop) => loop.some((p) => p.x === 0 && p.y === 0));
  assert.ok(outer, 'dış hat alanın köşesinden geçmeli');
  assert.ok(outer.some((p) => p.x === 10 && p.y === 10), 'dış hat alanı sarmalı');
});

test('uzun kenarların köşesi keskin kalır', () => {
  const field = new Field(10, 10);
  const loops = territoryOutline(field);
  const outer = loops.find((loop) => loop.some((p) => p.x === 0 && p.y === 0));

  assert.ok(outer);
  assert.equal(outer.length, 4, 'çerçeve köşeleri pahlanmamalı');
});

test('tek hücrelik kare baklavaya pahlanır', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  const result = chamfer(square);

  // Dört köşenin yarıdan kesilmesi kenar orta noktalarından geçen bir baklava verir.
  assert.equal(result.length, 4);
  const sorted = result.map((p) => `${p.x},${p.y}`).sort();
  assert.deepEqual(sorted, ['0,0.5', '0.5,0', '0.5,1', '1,0.5']);
});

test('merdiven basamakları tek bir 45° doğruya dönüşür', () => {
  const field = new Field(16, 16);
  // Alt kenara oturan bir merdiven: her satırda bir hücre daha geniş.
  for (let row = 0; row < 8; row++) {
    for (let x = 1; x <= row + 1; x++) field.set(x, 14 - row, FILLED);
  }

  const loops = territoryOutline(field);
  const best = Math.max(...loops.map(longestDiagonalRun));

  assert.ok(best >= 6, `pahlanmış hat düz bir 45° doğru olmalı, en uzun dizi: ${best}`);
});

/** Aynı 45° adım vektörüyle ardışık ilerleyen en uzun nokta dizisinin uzunluğu. */
function longestDiagonalRun(loop: { x: number; y: number }[]): number {
  let best = 0;
  let run = 1;
  let previous: { x: number; y: number } | null = null;

  for (let i = 1; i < loop.length; i++) {
    const step = { x: loop[i].x - loop[i - 1].x, y: loop[i].y - loop[i - 1].y };
    if (step.x === 0 && step.y === 0) continue;
    const same =
      previous !== null &&
      Math.abs(step.x - previous.x) < 1e-9 &&
      Math.abs(step.y - previous.y) < 1e-9;
    run = same ? run + 1 : 2;
    const diagonal = step.x !== 0 && Math.abs(Math.abs(step.x) - Math.abs(step.y)) < 1e-9;
    if (diagonal) best = Math.max(best, run);
    previous = step;
  }

  return best;
}
