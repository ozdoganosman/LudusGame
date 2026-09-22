/**
 * Alanın piksel görüntüleri: hastalıklı doku (zemin), iyileşmiş doku
 * (ele geçirilen alanın içine kırpılarak çizilir) ve önizleme aracının
 * kullandığı ham grid görünümü.
 *
 * Desenler tamamen yordamsaldır (konuma bağlı deterministik gürültü), yani
 * varlık dosyası yok: her doku kendi görünümünü hesaplar ve görev başına bir
 * kez üretilir.
 */
import type { Field } from '../engine/field';
import { EMPTY, FILLED, TRAIL } from '../engine/types';
import { hexToRgb, palette } from './palette';
import type { Rgb } from './palette';
import { tissueTheme } from './tissues';
import type { TextureKind, TissueTheme } from './tissues';

const TRAIL_RGB = hexToRgb(palette.trail);

/**
 * Doku görüntüsü hücre başına bu kadar piksel üretir: desen hücre biriminde
 * tanımlı, ama ekrana daha ince bir ayrıntıyla çiziliyor.
 */
export const TEXTURE_SCALE = 3;

/** Bir alan için gereken RGBA tampon boyutu (ham grid görünümü). */
export function pixelBufferSize(field: Field): number {
  return field.w * field.h * 4;
}

/** Doku görüntüsünün piksel genişliği/yüksekliği. */
export function textureWidth(field: Field): number {
  return field.w * TEXTURE_SCALE;
}

export function textureHeight(field: Field): number {
  return field.h * TEXTURE_SCALE;
}

/** Doku görüntüsü için gereken RGBA tampon boyutu. */
export function textureBufferSize(field: Field): number {
  return textureWidth(field) * textureHeight(field) * 4;
}

/**
 * Hastalıklı doku: dokunun kendi deseni (sümük iplikleri, hava keseleri,
 * damarlar, kas lifleri...) lekeli bir zemin üzerine işlenir.
 */
export function writeSickPixels(
  field: Field,
  out: Uint8Array | Uint8ClampedArray,
  theme: TissueTheme
): void {
  const base = hexToRgb(theme.sick);
  const deep = hexToRgb(theme.sickDeep);
  const vein = hexToRgb(theme.sickVein);
  const width = textureWidth(field);
  const height = textureHeight(field);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Desen hücre biriminde tanımlı; burada alt piksel çözünürlükte örnekleniyor.
      const x = px / TEXTURE_SCALE;
      const y = py / TEXTURE_SCALE;
      // Büyük lekeler dokuya derinlik verir, desen üstüne biner.
      const blotch = smoothNoise(x, y, 11);
      const amount = pattern(theme.texture, x, y, field.w, field.h);
      let rgb = mix(deep, base, 0.35 + blotch * 0.85);
      rgb = mix(rgb, vein, amount * 0.7);
      writePixel(out, (py * width + px) * 4, rgb, (hash(px, py) % 7) - 3);
    }
  }
}

/**
 * İyileşmiş doku: aynı desen daha yumuşak ve aydınlık, sağlıklı organ rengiyle.
 * Ele geçirilen alanın içine kırpılarak çizilir.
 */
export function writeHealthyPixels(
  field: Field,
  out: Uint8Array | Uint8ClampedArray,
  theme: TissueTheme
): void {
  const base = hexToRgb(theme.healthy);
  const light = hexToRgb(theme.healthyLight);
  const width = textureWidth(field);
  const height = textureHeight(field);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const x = px / TEXTURE_SCALE;
      const y = py / TEXTURE_SCALE;
      const blotch = smoothNoise(x + 37, y + 11, 9);
      const amount = pattern(theme.texture, x, y, field.w, field.h);
      let rgb = mix(base, light, 0.12 + blotch * 0.32);
      rgb = mix(rgb, light, amount * 0.5);
      writePixel(out, (py * width + px) * 4, rgb, (hash(px + 5, py + 7) % 5) - 2);
    }
  }
}

/**
 * Ham grid görünümü (önizleme aracı): her hücre bir piksel, durum renkleri
 * doğrudan. Doldurma mantığını gözle denetlemek için yumuşatma yok.
 */
export function writeFieldPixels(
  field: Field,
  out: Uint8Array | Uint8ClampedArray,
  theme: TissueTheme = tissueTheme(1)
): void {
  const { w, h, cells } = field;
  const sick = hexToRgb(theme.sick);
  const sickVein = hexToRgb(theme.sickVein);
  const healthy = hexToRgb(theme.healthy);
  const healthyEdge = hexToRgb(theme.healthyEdge);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const index = y * w + x;
      const cell = cells[index];
      let rgb = sick;

      if (cell === TRAIL) {
        rgb = TRAIL_RGB;
      } else if (cell === FILLED) {
        rgb = field.isEdge(x, y) ? healthyEdge : healthy;
      } else if (cell === EMPTY) {
        rgb = pattern(theme.texture, x, y, w, h) > 0.6 ? sickVein : sick;
      }

      writePixel(out, index * 4, rgb, 0);
    }
  }
}

// ----------------------------------------------------------------- desenler

/** Dokuya göre desen yoğunluğu (0 = temel renk, 1 = desen rengi). */
function pattern(kind: TextureKind, x: number, y: number, w: number, h: number): number {
  switch (kind) {
    case 'vein': {
      // Yatay seyreden damarlar ve onlardan ayrılan ince kılcallar.
      const warp = smoothNoise(x, y, 15) * 10;
      const trunk = Math.abs(Math.sin((y + warp) * 0.32));
      const branch = Math.abs(Math.sin((y * 0.6 + x * 0.5 + warp) * 0.5));
      const speck = smoothNoise(x + 91, y + 17, 3) > 0.86 ? 0.25 : 0;
      return Math.max(
        trunk > 0.95 ? 1 : trunk > 0.9 ? 0.5 : 0,
        branch > 0.97 ? 0.55 : 0,
        speck
      );
    }
    case 'mucus': {
      // Aşağı sarkan sümük iplikleri ve kabarcıklar.
      const drift = smoothNoise(x, y * 0.4, 9) * 7;
      const strand = Math.abs(Math.sin((x + drift) * 0.5));
      return Math.max(strand > 0.9 ? 0.9 : strand > 0.84 ? 0.35 : 0, bubbles(x, y, 9, 1.9) * 0.8);
    }
    case 'alveoli':
      // Hava keseleri: iç içe kabarcık kümeleri.
      return Math.max(bubbles(x, y, 8, 3), bubbles(x + 4, y + 4, 5, 1.4) * 0.5);
    case 'acid': {
      // Asit çukurları ve serpinti.
      const speck = smoothNoise(x + 13, y + 29, 2) > 0.85 ? 0.45 : 0;
      return Math.max(bubbles(x, y, 6, 1.7), speck);
    }
    case 'flow': {
      // Akıntı çizgileri.
      const warp = smoothNoise(x, y, 16) * 5;
      const streak = Math.abs(Math.sin((x * 0.45 + y * 0.85 + warp) * 0.45));
      return streak > 0.9 ? 0.85 : streak > 0.82 ? 0.3 : 0;
    }
    case 'lymph': {
      // Şişmiş hücre kümeleri, aralarında bulutlu sıvı.
      const cloud = smoothNoise(x, y, 10) * 0.65 + smoothNoise(x + 51, y + 7, 4) * 0.35;
      return Math.max(bubbles(x, y, 7, 2.4), cloud > 0.66 ? (cloud - 0.66) * 2 : 0);
    }
    case 'marrow':
      // Süngerimsi petek.
      return hexLattice(x, y, 7);
    case 'lobule': {
      // Karaciğer lobülleri: geniş petek, merkezinde toplayıcı damar.
      const vein = Math.abs(Math.sin((x * 0.4 - y * 0.2 + smoothNoise(x, y, 17) * 6) * 0.4));
      return Math.max(hexLattice(x, y, 14), bubbles(x, y, 14, 1.3) * 0.7, vein > 0.97 ? 0.5 : 0);
    }
    case 'crystal': {
      // Kristalleşmiş kanallar: köşeli parıltılar ve çapraz çizgiler.
      const shard = smoothNoise(x, y, 2) > 0.9 ? 1 : 0;
      const line = (x + y) % 9 === 0 || (x - y + 512) % 13 === 0 ? 0.35 : 0;
      return Math.max(shard, line);
    }
    case 'muscle': {
      // Yatay kas lifleri.
      const wave = smoothNoise(x, y, 18) * 4;
      const fiber = Math.abs(Math.sin((y + wave) * 1.05));
      return fiber > 0.88 ? 0.8 : fiber > 0.8 ? 0.3 : 0;
    }
    case 'nerve': {
      // Çapraz sinir iplikleri.
      const a = Math.abs(Math.sin((x + y + smoothNoise(x, y, 12) * 6) * 0.32));
      const b = Math.abs(Math.sin((x - y + smoothNoise(x + 33, y, 12) * 6) * 0.32));
      return Math.max(a > 0.95 ? 0.9 : 0, b > 0.95 ? 0.7 : 0);
    }
    case 'core': {
      // Çekirdekten yayılan halkalar.
      const distance = Math.hypot(x - w / 2, y - h / 2);
      const ring = Math.abs(Math.sin(distance * 0.35 + smoothNoise(x, y, 14) * 3));
      return ring > 0.93 ? 0.85 : smoothNoise(x, y, 3) > 0.88 ? 0.3 : 0;
    }
  }
}

/** Sıçratılmış kabarcık ızgarası: halka üzerinde 1, içinde 0.3. */
function bubbles(x: number, y: number, size: number, radius: number): number {
  const col = Math.floor(x / size);
  const row = Math.floor(y / size);
  let best = 0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const c = col + dx;
      const r = row + dy;
      const cx = c * size + size / 2 + (unit(c, r) - 0.5) * size * 0.6;
      const cy = r * size + size / 2 + (unit(c + 77, r + 31) - 0.5) * size * 0.6;
      const rr = radius * (0.7 + unit(c + 13, r + 9) * 0.7);
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < rr && distance > rr - 1.2) best = Math.max(best, 1);
      else if (distance <= rr - 1.2) best = Math.max(best, 0.3);
    }
  }
  return best;
}

/** Petek ızgarası: hücre duvarında 1, içinde 0.25. */
function hexLattice(x: number, y: number, size: number): number {
  const rowHeight = size * 0.87;
  const row = Math.round(y / rowHeight);
  const offset = (Math.abs(row) % 2) * size * 0.5;
  const col = Math.round((x - offset) / size);
  const cx = col * size + offset;
  const cy = row * rowHeight;
  const distance = Math.hypot(x - cx, y - cy);
  const wall = size * 0.5;
  if (distance > wall - 0.9 && distance < wall + 0.4) return 1;
  return distance < wall - 0.9 ? 0.25 : 0;
}

// -------------------------------------------------------------- yardımcılar

function writePixel(
  out: Uint8Array | Uint8ClampedArray,
  offset: number,
  rgb: Rgb,
  grain: number
): void {
  out[offset] = clampByte(rgb[0] + grain);
  out[offset + 1] = clampByte(rgb[1] + grain);
  out[offset + 2] = clampByte(rgb[2] + grain);
  out[offset + 3] = 255;
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  const t = amount < 0 ? 0 : amount > 1 ? 1 : amount;
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
}

/** Konuma bağlı, tekrarlanabilir küçük bir sayı. */
function hash(x: number, y: number): number {
  const value = Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1);
  return (value ^ (value >>> 15)) >>> 0;
}

/** hash'in 0..1 aralığına indirilmiş hâli. */
function unit(x: number, y: number): number {
  return hash(x, y) / 0xffffffff;
}

/** Değer gürültüsü: ızgara noktaları arasında yumuşak geçiş. */
function smoothNoise(x: number, y: number, scale: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const top = unit(x0, y0) * (1 - sx) + unit(x0 + 1, y0) * sx;
  const bottom = unit(x0, y0 + 1) * (1 - sx) + unit(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}
