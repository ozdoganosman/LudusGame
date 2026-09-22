/**
 * Görev zinciri: ana hikâyenin bölümleri sırayla oynanır ve her bölüm bir
 * öncekinden zor olur. Buradaki sayılar oynanışa ait (hedef yüzde, düşman
 * kadrosu, altın primi); bölüm adları ve metinleri arayüz katmanında
 * (src/ui/story.ts).
 */
import { levelConfig } from './config';
import type { LevelConfig } from './config';

/**
 * Bölüm başına temizlenmesi gereken alan. Öğrenme bölümü düşük başlar,
 * kampanya sonunda dokunun neredeyse tamamı istenir.
 */
const TARGETS = [60, 64, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86];

/** Ana hikâyenin bölüm sayısı. Sonrası sonsuz dalga. */
export const CAMPAIGN_LENGTH = TARGETS.length;

export type MissionPlan = {
  /** 1'den başlayan görev numarası. */
  index: number;
  /** Görevi tamamlamak için gereken temizlik yüzdesi. */
  target: number;
  /** Görev primi (altın). */
  reward: number;
  /** Düşman kadrosu ve hızları. */
  config: LevelConfig;
  /** Ana hikâye bitti mi (sonsuz dalgalar)? */
  endless: boolean;
};

/**
 * Görev numarasından oynanış planı. Kampanya bittikten sonra hedef ve zorluk
 * artmaya devam eder, böylece oyun sonsuza kadar oynanabilir kalır.
 */
export function missionPlan(index: number): MissionPlan {
  const n = Math.max(1, Math.floor(index));
  const endless = n > CAMPAIGN_LENGTH;
  const target = endless
    ? Math.min(92, TARGETS[CAMPAIGN_LENGTH - 1] + (n - CAMPAIGN_LENGTH))
    : TARGETS[n - 1];

  return {
    index: n,
    target,
    reward: 120 + 70 * (n - 1),
    config: levelConfig(n),
    endless,
  };
}

/**
 * Kapatılan alanın altın karşılığı; tuzağa düşen düşman başına ek prim.
 * Ölçek, tam bir kampanyanın gemiyi neredeyse tamamen donatmaya yetmesi için
 * seçildi (görev başına ~300 altın + görev primi).
 */
export function captureGold(cells: number, trapped: number): number {
  return Math.max(1, Math.round(cells / 12)) + trapped * 8;
}

/** Silahla düşürülen düşmanın altın karşılığı. */
export const KILL_GOLD = 3;
