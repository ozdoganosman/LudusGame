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

export const MAX_ENEMIES = 10;

export type LevelConfig = {
  drifters: number;
  hunters: number;
  drifterSpeed: number;
  hunterSpeed: number;
  bossSpeed: number;
  /** Yeni düşman doğma aralığı (saniye); 0 ise doğma yok. */
  spawnInterval: number;
};

/**
 * Zorluk eğrisi. İlk görev öğrenmeye açık olsun diye tek mikropla başlar;
 * virüsler 4. görevde sahneye girer. Kampanya bittikten sonra da artmaya
 * devam eder, üst sınırlar MAX_ENEMIES ile dengelenir.
 */
export function levelConfig(level: number): LevelConfig {
  const n = Math.max(1, level);
  return {
    drifters: Math.min(7, 1 + Math.floor(n / 2)),
    hunters: n < 4 ? 0 : Math.min(4, Math.floor((n - 2) / 2)),
    drifterSpeed: 6.5 + n * 0.8,
    hunterSpeed: 6 + n * 0.6,
    bossSpeed: 8 + n * 0.9,
    spawnInterval: Math.max(10, 34 - n * 2),
  };
}
