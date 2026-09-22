import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Field, clearTrail, closeTrail, findEmptyRegions } from '../field';
import { EMPTY, FILLED, TRAIL } from '../types';
import { makeEnemy } from './helpers';

test('alan çerçeveyle başlar ve çerçeve yüzdeye sayılmaz', () => {
  const field = new Field(10, 10);
  assert.equal(field.interiorTotal, 64);
  assert.equal(field.captured, 0);
  assert.equal(field.percent(), 0);
  assert.equal(field.get(0, 0), FILLED);
  assert.equal(field.get(9, 5), FILLED);
  assert.equal(field.get(1, 1), EMPTY);
});

/** x=5 sütununa dikey iz çizer; iç alan iki bölgeye ayrılır (sol 32, sağ 24). */
function drawVerticalTrail(field: Field) {
  const trail = [];
  for (let y = 1; y <= 8; y++) {
    field.set(5, y, TRAIL);
    trail.push({ x: 5, y });
  }
  return trail;
}

test('patronun olduğu bölge korunur, diğeri ele geçirilir', () => {
  const field = new Field(10, 10);
  const trail = drawVerticalTrail(field);
  const boss = makeEnemy('boss', 7.5, 4.5);

  const result = closeTrail(field, trail, [boss]);

  // 8 iz hücresi + soldaki 32 hücrelik bölge
  assert.equal(result.cells, 40);
  assert.equal(field.captured, 40);
  assert.equal(field.percent(), 62.5);
  assert.equal(field.get(2, 4), FILLED, 'sol bölge dolmalı');
  assert.equal(field.get(7, 4), EMPTY, 'patronun bölgesi boş kalmalı');
  assert.equal(field.recount(), 40, 'sayaç grid ile tutarlı');
});

test('patron yoksa en büyük bölge korunur', () => {
  const field = new Field(10, 10);
  const trail = drawVerticalTrail(field);

  const result = closeTrail(field, trail, []);

  // 8 iz hücresi + sağdaki küçük bölge (24)
  assert.equal(result.cells, 32);
  assert.equal(field.get(7, 4), FILLED);
  assert.equal(field.get(2, 4), EMPTY);
});

test('kapatılan bölgede kalan sıradan düşman yok edilir', () => {
  const field = new Field(10, 10);
  const trail = drawVerticalTrail(field);
  const boss = makeEnemy('boss', 7.5, 4.5, 1);
  const trappedDrifter = makeEnemy('drifter', 2.5, 2.5, 2);
  const safeDrifter = makeEnemy('drifter', 6.5, 6.5, 3);

  const result = closeTrail(field, trail, [boss, trappedDrifter, safeDrifter]);

  assert.deepEqual(result.trapped, [2]);
});

test('boş bölgeler 4 komşulukla ayrılır', () => {
  const field = new Field(10, 10);
  drawVerticalTrail(field);
  for (const cell of [{ x: 5, y: 1 }]) field.set(cell.x, cell.y, TRAIL);

  const regions = findEmptyRegions(field);
  assert.equal(regions.cells.length, 2);
  assert.deepEqual(
    regions.cells.map((cells) => cells.length).sort((a, b) => a - b),
    [24, 32]
  );
});

test('çapraz iz 4 komşulukta duvar oluşturur', () => {
  const field = new Field(10, 10);
  // Köşeden köşeye çapraz zincir: 4 komşuluk çaprazdan geçemediği için alanı böler.
  for (let i = 1; i <= 8; i++) field.set(i, i, TRAIL);

  const regions = findEmptyRegions(field);
  assert.equal(regions.cells.length, 2);
  assert.deepEqual(
    regions.cells.map((cells) => cells.length).sort((a, b) => a - b),
    [28, 28]
  );
});

test('ölümde iz hücreleri boşa döner', () => {
  const field = new Field(10, 10);
  const trail = drawVerticalTrail(field);

  clearTrail(field, trail);

  assert.equal(field.get(5, 4), EMPTY);
  assert.equal(field.captured, 0);
});
