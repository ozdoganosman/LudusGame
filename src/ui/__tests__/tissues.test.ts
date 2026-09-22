import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CAMPAIGN_LENGTH } from '../../engine/campaign';
import { Field } from '../../engine/field';
import type { Enemy, EnemyKind } from '../../engine/types';
import { enemyShapes } from '../creatures';
import {
  TEXTURE_SCALE,
  textureBufferSize,
  writeHealthyPixels,
  writeSickPixels,
} from '../gridImage';
import { bestiaryLine, monsterFor, tissueTheme } from '../tissues';
import type { MonsterFamily } from '../tissues';

const KINDS: EnemyKind[] = ['drifter', 'hunter', 'boss'];
const HEX = /^#[0-9a-f]{6}$/;

function makeEnemy(kind: EnemyKind): Enemy {
  return {
    id: 3,
    kind,
    x: 12.5,
    y: 8.5,
    vx: 4,
    vy: -3,
    radius: kind === 'boss' ? 2.1 : 1.3,
    spin: 0.7,
  };
}

test('her bölümün dokusu ve kadrosu tam', () => {
  const textures = new Set<string>();
  const families = new Set<MonsterFamily>();

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

    for (const kind of KINDS) {
      const monster = monsterFor(theme, kind);
      assert.match(monster.color, HEX);
      assert.ok(monster.name.length > 2, `${index}. bölümde ${kind} adı yok`);
      families.add(monster.family);
    }

    const line = bestiaryLine(index);
    assert.ok(line.includes(theme.drifter.name));
    assert.ok(line.includes(theme.hunter.name));
    assert.ok(line.includes(theme.boss.name));
  }

  assert.ok(textures.size >= 10, `dokular birbirine benziyor: ${textures.size} çeşit`);
  assert.ok(families.size >= 8, `canavarlar birbirine benziyor: ${families.size} çeşit`);
});

test('kampanyadan sonra mutasyon teması gelir', () => {
  const beyond = tissueTheme(CAMPAIGN_LENGTH + 1);
  assert.deepEqual(beyond, tissueTheme(CAMPAIGN_LENGTH + 9), 'dalgalar aynı temayı paylaşır');
  assert.notDeepEqual(beyond, tissueTheme(CAMPAIGN_LENGTH));
  assert.equal(beyond.boss.name, 'MUTASYON');
});

test('her canavar ailesi çizilebilir şekiller üretir', () => {
  const target = { x: 4, y: 4 };
  const seen = new Set<MonsterFamily>();

  for (let index = 1; index <= CAMPAIGN_LENGTH + 1; index++) {
    const theme = tissueTheme(index);
    for (const kind of KINDS) {
      const monster = monsterFor(theme, kind);
      const shapes = enemyShapes(makeEnemy(kind), target, monster);
      seen.add(monster.family);

      assert.ok(shapes.length >= 3, `${monster.family} için şekil yok`);
      for (const shape of shapes) {
        if (shape.kind === 'circle') {
          assert.ok(Number.isFinite(shape.x) && Number.isFinite(shape.y));
          assert.ok(shape.r > 0, `${monster.family}: yarıçap sıfır`);
        } else {
          assert.ok(shape.points.length >= 3, `${monster.family}: çokgen eksik`);
          for (const point of shape.points) {
            assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
          }
        }
        assert.match(shape.color, /^#[0-9a-fA-F]{6}$/);
      }
    }
  }

  assert.ok(seen.size >= 8);
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
  // Desen gerçekten renk değiştiriyor mu: en az 40 farklı ton çıkmalı.
  const tones = new Set<number>();
  for (let i = 0; i < size; i += 4) {
    tones.add((first[i] << 16) | (first[i + 1] << 8) | first[i + 2]);
  }
  assert.ok(tones.size > 40, `doku fazla düz: ${tones.size} ton`);
});
