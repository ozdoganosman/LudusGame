import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CAMPAIGN_LENGTH } from '../../engine/campaign';
import { CUTSCENE_LENGTH, SCENE_H, SCENE_W, cutsceneFrame, organPoint } from '../cutscene';
import { missionFor } from '../story';

test('her bölümün ve mutasyon dalgalarının haritada ayrı bir noktası var', () => {
  const seen = new Set<string>();
  for (let index = 1; index <= CAMPAIGN_LENGTH + 1; index++) {
    const point = organPoint(index);
    assert.ok(point, `${index}. bölüm noktası yok`);
    assert.ok(point.x > 0 && point.x < SCENE_W && point.y > 0 && point.y < SCENE_H);
    seen.add(`${point.x},${point.y}`);
  }
  assert.equal(seen.size, CAMPAIGN_LENGTH + 1);
  assert.deepEqual(organPoint(CAMPAIGN_LENGTH + 5), organPoint(CAMPAIGN_LENGTH + 1));
});

test('ara sahne süresince geçerli şekiller üretir ve sonunda biter', () => {
  for (const [from, to] of [
    [null, 1],
    [1, 2],
    [11, 12],
    [12, 13],
    [14, 15],
  ] as const) {
    for (let t = 0; t < CUTSCENE_LENGTH; t += 0.25) {
      const frame = cutsceneFrame(from, to, t);
      assert.equal(frame.done, false);
      assert.ok(frame.shapes.length > 20);
      for (const shape of frame.shapes) {
        const alpha = shape.alpha ?? 1;
        assert.ok(alpha >= 0 && alpha <= 1, `saydamlık aralık dışı: ${alpha}`);
        if (shape.kind === 'circle') assert.ok(Number.isFinite(shape.r) && shape.r >= 0);
        else {
          assert.ok(shape.points.length >= (shape.open ? 2 : 3));
          for (const point of shape.points) {
            assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
          }
        }
      }
    }
    assert.equal(cutsceneFrame(from, to, CUTSCENE_LENGTH).done, true);
  }
});

test('hedef organın adı daktiloyla yazılır ve sahne ortasında tamamlanır', () => {
  const name = missionFor(4).name;
  const early = cutsceneFrame(3, 4, 0.5).texts.find((text) => text.size === 8);
  const late = cutsceneFrame(3, 4, 2.6).texts.find((text) => text.size === 8);
  assert.equal(early?.text, '');
  assert.equal(late?.text, name);
  assert.equal(late?.alpha, 1);
});

test('enjeksiyon sahnesi ile geçiş sahnesinin başlığı farklı', () => {
  const header = (from: number | null) => cutsceneFrame(from, 2, 1).texts[0].text;
  assert.equal(header(null), 'ENJEKSİYON');
  assert.equal(header(1), 'SONRAKİ HEDEF');
});

test('başta ve sonda sahne kararır', () => {
  const opacity = (t: number) => Math.max(...cutsceneFrame(1, 2, t).shapes.map((s) => s.alpha ?? 1));
  assert.equal(opacity(0), 0);
  assert.equal(opacity(1.5), 1);
  assert.ok(opacity(CUTSCENE_LENGTH - 0.05) < 0.2);
});
