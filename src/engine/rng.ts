/** Deterministik PRNG (mulberry32) — testlerin tekrarlanabilir olması için. */
export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (minInclusive: number, maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number) => min + next() * (max - min);
  const int = (minInclusive: number, maxExclusive: number) =>
    Math.floor(range(minInclusive, maxExclusive));
  return {
    next,
    range,
    int,
    pick: <T,>(items: readonly T[]) => items[Math.min(items.length - 1, int(0, items.length))],
  };
}
