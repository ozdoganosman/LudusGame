import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CAMPAIGN_LENGTH, missionPlan } from '../../engine/campaign';
import { Field } from '../../engine/field';
import { SPECIES_IDS, speciesOf } from '../../engine/species';
import type { SpeciesId } from '../../engine/species';
import type { Enemy } from '../../engine/types';
import { SPECIES_VISUALS, bestiaryLine, speciesVisual } from '../bestiary';
import type { MonsterFamily } from '../bestiary';
import { enemyShapes } from '../creatures';
import {
  TEXTURE_SCALE,
  textureBufferSize,
  writeHealthyPixels,
  writeSickPixels,
} from '../gridImage';
import { tissueTheme } from '../tissues';

const HEX = /^#[0-9a-f]{6}$/i;

function makeEnemy(id: SpeciesId): Enemy {
  const species = speciesOf(id);
  return {
    id: 3,
    kind: species.kind,
    species: id,
    behavior: species.behavior,
    x: 12.5,
    y: 8.5,
    vx: 4,
    vy: -3,
    heading: -0.6,
    speed: 8,
    timer: 1.2,
    phase: 0,
    radius: species.radius,
    spin: 0.7,
  };
}

test('her bölümün dokusu tanımlı ve desenler birbirinden farklı', () => {
  const textures = new Set<string>();

  for (let index = 1; index <= CAMPAIGN_LENGTH; index++) {
    const theme = tissueTheme(index);
    for (const color of [
      theme.sick,
      theme.sickDeep,
      theme.sickVein,
      theme.healthy,
      theme.healthyLight,
      theme.healthyEdge,
    ]) {
      assert.match(color, HEX, `${index}. bölümde geçersiz renk: ${color}`);
    }
    textures.add(theme.texture);
  }

  assert.ok(textures.size >= 10, `dokular birbirine benziyor: ${textures.size} çeşit`);
});

test('kampanyadan sonra mutasyon dokusu gelir', () => {
  const beyond = tissueTheme(CAMPAIGN_LENGTH + 1);
  assert.deepEqual(beyond, tissueTheme(CAMPAIGN_LENGTH + 9), 'dalgalar aynı dokuyu paylaşır');
  assert.notDeepEqual(beyond, tissueTheme(CAMPAIGN_LENGTH));
});

test('her türün görünümü tanımlı', () => {
  for (const id of SPECIES_IDS) {
    const visual = SPECIES_VISUALS[id];
    assert.ok(visual, `${id} için görünüm yok`);
    assert.ok(visual.name.length > 2, `${id} adı yok`);
    assert.match(visual.color, HEX);
  }
});

test('bir bölümün türleri hem siluet hem renk olarak ayrışır', () => {
  for (let index = 1; index <= CAMPAIGN_LENGTH + 1; index++) {
    const roster = missionPlan(index).roster;
    const families = new Set<MonsterFamily>();
    const colors = new Set<string>();
    for (const entry of roster) {
      const visual = speciesVisual(entry.species);
      families.add(visual.family);
      colors.add(visual.color);
    }
    assert.equal(families.size, roster.length, `${index}. bölümde aynı siluet iki kez var`);
    assert.equal(colors.size, roster.length, `${index}. bölümde aynı renk iki kez var`);
  }
});

test('kadro satırı bölümün türlerini sayar', () => {
  const line = bestiaryLine(2);
  for (const entry of missionPlan(2).roster) {
    assert.ok(line.includes(speciesVisual(entry.species).name), `${entry.species} kadroda yok`);
  }
  assert.notEqual(bestiaryLine(1), bestiaryLine(6), 'bölümlerin kadroları farklı');
});

test('her siluet çizilebilir şekiller üretir', () => {
  const target = { x: 4, y: 4 };
  const drawn = new Set<MonsterFamily>();

  for (const id of SPECIES_IDS) {
    const shapes = enemyShapes(makeEnemy(id), target);
    drawn.add(speciesVisual(id).family);

    assert.ok(shapes.length >= 3, `${id} için şekil yok`);
    for (const shape of shapes) {
      if (shape.kind === 'circle') {
        assert.ok(Number.isFinite(shape.x) && Number.isFinite(shape.y));
        assert.ok(shape.r > 0, `${id}: yarıçap sıfır`);
      } else {
        assert.ok(shape.points.length >= 3, `${id}: çokgen eksik`);
        for (const point of shape.points) {
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
        }
      }
      assert.match(shape.color, HEX);
    }
  }

  assert.ok(drawn.size >= 14, `siluet çeşidi az: ${drawn.size}`);
});

test('doku görüntüleri deterministik, opak ve bölüme göre farklı', () => {
  const field = new Field(16, 20);
  const size = textureBufferSize(field);
  assert.equal(size, field.w * TEXTURE_SCALE * field.h * TEXTURE_SCALE * 4);

  const first = new Uint8Array(size);
  const again = new Uint8Array(size);
  const healthy = new Uint8Array(size);
  const other = new Uint8Array(size);

  writeSickPixels(field, first, tissueTheme(2));
  writeSickPixels(field, again, tissueTheme(2));
  writeHealthyPixels(field, healthy, tissueTheme(2));
  writeSickPixels(field, other, tissueTheme(7));

  assert.deepEqual(first, again, 'aynı doku iki kez aynı çizilmeli');
  assert.notDeepEqual(first, healthy, 'hastalıklı ve iyileşmiş doku farklı görünmeli');
  assert.notDeepEqual(first, other, 'her bölümün dokusu kendine ait');

  for (let i = 3; i < size; i += 4) {
    assert.equal(first[i], 255, 'doku tamamen opak olmalı');
  }
  const tones = new Set<number>();
  for (let i = 0; i < size; i += 4) {
    tones.add((first[i] << 16) | (first[i + 1] << 8) | first[i + 2]);
  }
  assert.ok(tones.size > 40, `doku fazla düz: ${tones.size} ton`);
});
