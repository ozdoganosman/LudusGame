import assert from 'node:assert/strict';
import { test } from 'node:test';

import { speciesOf } from '../../engine/species';
import type { SpeciesId } from '../../engine/species';
import type { Enemy } from '../../engine/types';
import { Effects, SHOT_LIFE, TRAP_LIFE, labelBox } from '../effects';

function enemy(id: SpeciesId, x = 10, y = 20): Enemy {
  const species = speciesOf(id);
  return {
    id: 5,
    kind: species.kind,
    species: id,
    behavior: species.behavior,
    x,
    y,
    vx: 0,
    vy: 0,
    heading: 0,
    speed: 8,
    timer: 0,
    phase: 0,
    radius: species.radius,
    spin: 0,
  };
}

test('hapsolan düşman patlar, prim yazısı yükselir ve efekt süresi dolunca kalkar', () => {
  const effects = new Effects();
  effects.trapped(enemy('clot'), 1500, 1);

  assert.equal(effects.active, true);
  effects.update(0.05);
  const first = effects.labels();
  assert.equal(first.length, 1);
  assert.equal(first[0].text, '+1.500');
  assert.equal(first[0].sub, undefined, 'tek düşmanda zincir yazısı yok');
  assert.ok(effects.shapes().length > 10, 'siluet, flaş, halka ve damlacıklar çizilmeli');

  effects.update(TRAP_LIFE * 0.6);
  const later = effects.labels();
  assert.ok(later[0].y < first[0].y, 'yazı yukarı süzülür');

  effects.update(TRAP_LIFE);
  assert.equal(effects.active, false);
  assert.equal(effects.shapes().length, 0);
  assert.equal(effects.labels().length, 0);
});

test('zincirdeki düşmanlar sırayla patlar ve çarpan yazılır', () => {
  const effects = new Effects();
  effects.trapped(enemy('clot', 5, 5), 500, 1);
  effects.trapped(enemy('needle', 9, 9), 1800, 2);

  effects.update(0.02);
  const labels = effects.labels();
  assert.equal(labels.length, 1, 'ikinci düşman sırasını bekliyor');

  effects.update(0.1);
  const both = effects.labels();
  assert.equal(both.length, 2);
  assert.equal(both[1].sub, 'ZİNCİR ×2');
});

test('vurulan düşmanın efekti daha kısa ve küçük', () => {
  const effects = new Effects();
  effects.shotDown(enemy('saltCrystal'), 450);
  effects.update(0.01);

  const label = effects.labels()[0];
  assert.equal(label.big, false);
  assert.equal(label.text, '+450');

  effects.update(SHOT_LIFE);
  assert.equal(effects.active, false);
});

test('efektler aynı girdide aynı şekilleri üretir (rastgelelik yok)', () => {
  const a = new Effects();
  const b = new Effects();
  a.trapped(enemy('bloodClot'), 900, 1);
  b.trapped(enemy('bloodClot'), 900, 1);
  a.update(0.3);
  b.update(0.3);
  assert.deepEqual(a.shapes(), b.shapes());
});

test('yan yana patlayanların prim yazıları üst üste binmez', () => {
  const effects = new Effects();
  effects.trapped(enemy('plateletSpike', 10, 20), 900, 1);
  effects.trapped({ ...enemy('needle', 11, 20.5), id: 6 }, 1800, 2);
  effects.update(0.3);
  const [a, b] = effects.labels().map(labelBox);
  assert.ok(a.bottom < b.top || b.bottom < a.top || a.right < b.left || b.right < a.left);
});
