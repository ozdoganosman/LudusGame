import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_PART_LEVEL, PART_COSTS, partCost } from '../../engine/upgrades';
import { partCards, partValue } from '../parts';
import {
  addGold,
  buyPart,
  emptyProfile,
  parseProfile,
  recordScore,
  serializeProfile,
  unlockMission,
} from '../profile';
import { CAMPAIGN_END_LINES, missionFor, missionLabel, missionProgress } from '../story';

test('boş profil ilk bölümde ve sıfır altınla başlar', () => {
  const profile = emptyProfile();

  assert.equal(profile.gold, 0);
  assert.equal(profile.unlocked, 1);
  assert.equal(profile.highScore, 0);
  assert.equal(profile.seenIntro, false);
  assert.equal(profile.loadout.wing, 0);
});

test('profil yazılıp geri okunabilir', () => {
  const profile = { ...emptyProfile(), gold: 700, unlocked: 4, highScore: 120, seenIntro: true };
  const restored = parseProfile(serializeProfile(profile));

  assert.deepEqual(restored, profile);
});

test('bozuk kayıt boş profile düşer', () => {
  assert.deepEqual(parseProfile(null), emptyProfile());
  assert.deepEqual(parseProfile('{'), emptyProfile());
  assert.deepEqual(parseProfile('"metin"'), emptyProfile());

  const odd = parseProfile('{"gold":-5,"unlocked":0,"loadout":{"wing":9}}');
  assert.equal(odd.gold, 0);
  assert.equal(odd.unlocked, 1);
  assert.equal(odd.loadout.wing, MAX_PART_LEVEL);
});

test('parça alımı altını düşürür ve seviyeyi artırır', () => {
  const cost = PART_COSTS.wing[0];
  const rich = { ...emptyProfile(), gold: cost };

  const bought = buyPart(rich, 'wing');
  assert.equal(bought.bought, true);
  assert.equal(bought.profile.gold, 0);
  assert.equal(bought.profile.loadout.wing, 1);

  const broke = buyPart(bought.profile, 'wing');
  assert.equal(broke.bought, false, 'altın yetmiyorsa alım olmaz');
  assert.equal(broke.profile.loadout.wing, 1);
  assert.equal(broke.profile, bought.profile, 'başarısız alım profili değiştirmez');
});

test('dolu parça tekrar satın alınamaz', () => {
  let profile = { ...emptyProfile(), gold: 100000 };
  for (let i = 0; i < MAX_PART_LEVEL; i++) profile = buyPart(profile, 'shield').profile;

  assert.equal(profile.loadout.shield, MAX_PART_LEVEL);
  assert.equal(partCost('shield', MAX_PART_LEVEL), null);
  assert.equal(buyPart(profile, 'shield').bought, false);
});

test('altın, rekor ve bölüm ilerlemesi yalnızca ileri gider', () => {
  const base = { ...emptyProfile(), gold: 10, highScore: 500, unlocked: 3 };

  assert.equal(addGold(base, 90).gold, 100);
  assert.equal(addGold(base, 0), base);
  assert.equal(recordScore(base, 400).highScore, 500);
  assert.equal(recordScore(base, 900).highScore, 900);
  assert.equal(unlockMission(base, 2).unlocked, 3);
  assert.equal(unlockMission(base, 5).unlocked, 5);
});

test('görev metinleri her bölüm için dolu', () => {
  for (let index = 1; index <= 16; index++) {
    const mission = missionFor(index);
    assert.ok(mission.name.length > 0, `${index}. görevin adı yok`);
    assert.ok(mission.title.length > 0);
    assert.ok(mission.hint.length > 0);
    assert.ok(mission.story.length > 0);
    assert.equal(mission.index, index);
    assert.ok(missionLabel(index).length > 0);
    assert.ok(missionProgress(index).length > 0);
  }

  assert.equal(missionFor(12).finale, true, '12. bölüm ana hikâyenin sonu');
  assert.equal(missionFor(13).wave, 1, 'kampanya sonrası mutasyon dalgaları');
  assert.ok(CAMPAIGN_END_LINES.length > 0);
});

test('hangar kartları fiyat ve etkiyi doğru gösterir', () => {
  const cards = partCards(emptyProfile().loadout, PART_COSTS.wing[0]);
  const wing = cards.find((card) => card.id === 'wing');
  const weapon = cards.find((card) => card.id === 'weapon');

  assert.equal(cards.length, 6);
  assert.ok(wing && wing.affordable, 'altın yetiyorsa kanat alınabilir');
  assert.equal(wing?.cost, PART_COSTS.wing[0]);
  assert.ok(wing?.next && wing.next !== wing.value, 'yükseltme farkı görünmeli');
  assert.equal(weapon?.affordable, false, 'pahalı parça altın yetmeyince kapalı');
  assert.equal(partValue('weapon', 0), 'silahsız');

  const full = partCards({ wing: 4, engine: 4, tail: 4, composite: 4, weapon: 4, shield: 4 }, 99999);
  assert.ok(full.every((card) => card.maxed && card.cost === null && card.next === null));
});
