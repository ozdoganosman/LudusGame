/**
 * Kalıcı oyuncu profili: altın kasası, satın alınmış parçalar, kampanyada
 * açılan görev ve rekor. Depolamadan bağımsız — web localStorage, mobil
 * AsyncStorage ile aynı JSON'u kullanır.
 */
import { normalizeLoadout, partCost } from '../engine/upgrades';
import type { Loadout, PartId } from '../engine/upgrades';

export const PROFILE_KEY = 'nanogemi.profile.v1';

export type Profile = {
  /** Kasadaki altın. */
  gold: number;
  loadout: Loadout;
  /** Kampanyada açılmış en ileri görev (1 = ilk bölüm). */
  unlocked: number;
  highScore: number;
  /** Açılış hikâyesi okundu mu? */
  seenIntro: boolean;
};

export function emptyProfile(): Profile {
  return { gold: 0, loadout: normalizeLoadout(null), unlocked: 1, highScore: 0, seenIntro: false };
}

function positiveInt(value: unknown, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

/** Bozuk ya da eski kayıtları boş profile düşürerek okur. */
export function parseProfile(raw: string | null): Profile {
  if (!raw) return emptyProfile();
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      gold: positiveInt(data.gold, 0),
      loadout: normalizeLoadout(data.loadout as Record<string, unknown> | null),
      unlocked: Math.max(1, positiveInt(data.unlocked, 1)),
      highScore: positiveInt(data.highScore, 0),
      seenIntro: data.seenIntro === true,
    };
  } catch {
    return emptyProfile();
  }
}

export function serializeProfile(profile: Profile): string {
  return JSON.stringify(profile);
}

/** Altın ekler (görev sonunda kasaya aktarım). */
export function addGold(profile: Profile, amount: number): Profile {
  if (amount <= 0) return profile;
  return { ...profile, gold: profile.gold + Math.floor(amount) };
}

/** Rekoru günceller; düşük puan profili değiştirmez. */
export function recordScore(profile: Profile, score: number): Profile {
  if (score <= profile.highScore) return profile;
  return { ...profile, highScore: Math.floor(score) };
}

/** Kampanyada bir sonraki bölümü açar. */
export function unlockMission(profile: Profile, index: number): Profile {
  if (index <= profile.unlocked) return profile;
  return { ...profile, unlocked: Math.floor(index) };
}

export type Purchase = { profile: Profile; bought: boolean };

/**
 * Parçayı bir kademe yükseltir. Altın yetmezse ya da parça doluysa profil
 * olduğu gibi döner ve bought false olur.
 */
export function buyPart(profile: Profile, id: PartId): Purchase {
  const level = profile.loadout[id];
  const cost = partCost(id, level);
  if (cost === null || profile.gold < cost) return { profile, bought: false };
  return {
    profile: {
      ...profile,
      gold: profile.gold - cost,
      loadout: { ...profile.loadout, [id]: level + 1 },
    },
    bought: true,
  };
}
