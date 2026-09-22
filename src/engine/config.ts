/** Oyun alanı hücre cinsinden. 2:3 oranı dikey telefon ekranına oturuyor. */
export const FIELD_W = 64;
export const FIELD_H = 96;

/** Seviyeyi geçmek için ele geçirilmesi gereken alan yüzdesi. */
export const TARGET_PERCENT = 80;

export const START_LIVES = 3;

/** Oyuncu hızı, hücre/saniye. */
export const PLAYER_SPEED = 30;

/** Ölümden sonra dokunulmazlık ve donma süreleri (saniye). */
export const RESPAWN_INVULN = 1.6;
export const DEATH_FREEZE = 0.7;
export const LEVEL_CLEAR_FREEZE = 0.4;

/** Tek karede işlenecek en büyük zaman adımı — arka plandan dönüşte ışınlanmayı önler. */
export const MAX_DT = 1 / 20;

export const MAX_ENEMIES = 15;

export type LevelConfig = {
  drifters: number;
  hunters: number;
  drifterSpeed: number;
  hunterSpeed: number;
  bossSpeed: number;
  /** Avcının dönüş çevikliği (radyan/saniye); yükseldikçe daha ısrarlı takip. */
  hunterTurn: number;
  /** Yeni düşman doğma aralığı (saniye); 0 ise doğma yok. */
  spawnInterval: number;
};

/**
 * Zorluk eğrisi. İlk görev de dahil oyun baştan sıkıştırır: iki mikrop, hızlı
 * bir patojen ve 23 saniyede bir yeni doğum. Virüsler 3. görevde sahneye girer.
 * Kampanya bittikten sonra da artmaya devam eder; üst sınırlar MAX_ENEMIES ile
 * dengelenir.
 */
export function levelConfig(level: number): LevelConfig {
  const n = Math.max(1, level);
  return {
    drifters: Math.min(8, 2 + Math.floor(n * 0.8)),
    hunters: n < 3 ? 0 : Math.min(5, Math.floor((n - 1) / 2)),
    drifterSpeed: 9 + n,
    hunterSpeed: 8.5 + n * 0.8,
    bossSpeed: 11 + n * 1.1,
    hunterTurn: Math.min(3.2, 1.8 + n * 0.12),
    spawnInterval: Math.max(7, 24 - n * 1.4),
  };
}
