import type { Field } from '../engine/field';
import { EMPTY, FILLED, TRAIL } from '../engine/types';
import { hexToRgb, palette } from './palette';

const EMPTY_RGB = hexToRgb(palette.empty);
const EMPTY_DOT_RGB = hexToRgb(palette.emptyDot);
const FILLED_RGB = hexToRgb(palette.filled);
const FILLED_EDGE_RGB = hexToRgb(palette.filledEdge);
const TRAIL_RGB = hexToRgb(palette.trail);

/** Bir alan için gereken RGBA tampon boyutu. */
export function pixelBufferSize(field: Field): number {
  return field.w * field.h * 4;
}

/**
 * Alanı RGBA piksel tamponuna yazar: her hücre bir piksel.
 * Ele geçirilmiş alanın boşa bakan kenarları vurgulanır, böylece
 * sınır çizgisi okunur olur.
 */
export function writeFieldPixels(field: Field, out: Uint8Array): void {
  const { w, h, cells } = field;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const index = y * w + x;
      const cell = cells[index];
      let rgb = EMPTY_RGB;

      if (cell === TRAIL) {
        rgb = TRAIL_RGB;
      } else if (cell === FILLED) {
        rgb = isEdge(field, x, y) ? FILLED_EDGE_RGB : FILLED_RGB;
      } else if (cell === EMPTY) {
        // Boş alana seyrek nokta dokusu: hareket hissi ve derinlik için.
        rgb = x % 8 === 4 && y % 8 === 4 ? EMPTY_DOT_RGB : EMPTY_RGB;
      }

      const offset = index * 4;
      out[offset] = rgb[0];
      out[offset + 1] = rgb[1];
      out[offset + 2] = rgb[2];
      out[offset + 3] = 255;
    }
  }
}

/** Dolu hücrenin boş alana veya ize komşu olup olmadığı. */
function isEdge(field: Field, x: number, y: number): boolean {
  const { w, h, cells } = field;
  if (x > 0 && cells[y * w + x - 1] !== FILLED) return true;
  if (x < w - 1 && cells[y * w + x + 1] !== FILLED) return true;
  if (y > 0 && cells[(y - 1) * w + x] !== FILLED) return true;
  if (y < h - 1 && cells[(y + 1) * w + x] !== FILLED) return true;
  return false;
}
