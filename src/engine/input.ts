import type { Input } from './types';

/** Hareketsiz girdi. */
export const NEUTRAL: Input = { dx: 0, dy: 0 };

/** Parmağın/farenin yön saymaya başlaması için gereken en küçük kayma (piksel). */
export const DEFAULT_DEADZONE = 16;

const EIGHT_WAY: Input[] = [
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
];

/**
 * Kayma vektörünü 8 yöne yuvarlar; ölü bölge içindeyse durma döner.
 * Hem mobil joystick hem web dokunmatik kontrolü bunu kullanır.
 */
export function snapToEight(dx: number, dy: number, deadzone = DEFAULT_DEADZONE): Input {
  if (Math.hypot(dx, dy) < deadzone) return NEUTRAL;
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return EIGHT_WAY[((sector % 8) + 8) % 8];
}
