import type { Field } from '../engine/field';
import { FILLED } from '../engine/types';

export type Point = { x: number; y: number };

type Edge = { to: Point; dir: Point };

const keyOf = (x: number, y: number) => y * 4096 + x;

/**
 * Ele geçirilmiş alanın sınırını kapalı çokgenler olarak çıkarır.
 * Koordinatlar hücre birimindedir: (0,0) alanın sol üst köşesi, bir birim
 * bir hücre. Dış hatlar saat yönünde, delikler ters yönde dolaşılır; bu
 * yüzden çift-tek (even-odd) doldurma kuralıyla delikler boş kalır.
 */
export function traceOutline(field: Field): Point[][] {
  const starts = new Map<number, Edge[]>();
  const filled = (x: number, y: number) =>
    field.inBounds(x, y) && field.get(x, y) === FILLED;

  const add = (fx: number, fy: number, tx: number, ty: number) => {
    const k = keyOf(fx, fy);
    const edge: Edge = { to: { x: tx, y: ty }, dir: { x: Math.sign(tx - fx), y: Math.sign(ty - fy) } };
    const list = starts.get(k);
    if (list) list.push(edge);
    else starts.set(k, [edge]);
  };

  for (let y = 0; y < field.h; y++) {
    for (let x = 0; x < field.w; x++) {
      if (!filled(x, y)) continue;
      // Dolu hücrenin komşusu boşsa o kenar sınırdır; yön dolu tarafı sağda bırakır.
      if (!filled(x, y - 1)) add(x, y, x + 1, y);
      if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!filled(x - 1, y)) add(x, y + 1, x, y);
    }
  }

  const loops: Point[][] = [];

  for (const [startKey, startEdges] of starts) {
    while (startEdges.length > 0) {
      const first = startEdges.shift();
      if (!first) break;
      const startX = startKey % 4096;
      const startY = (startKey - startX) / 4096;
      const loop: Point[] = [{ x: startX, y: startY }];

      let current = first.to;
      let direction = first.dir;
      let guard = field.w * field.h * 4;

      while ((current.x !== startX || current.y !== startY) && guard-- > 0) {
        loop.push(current);
        const options = starts.get(keyOf(current.x, current.y));
        if (!options || options.length === 0) break;
        const index = pickTurn(options, direction);
        const next = options.splice(index, 1)[0];
        direction = next.dir;
        current = next.to;
      }

      if (loop.length >= 4) loops.push(simplify(loop));
    }
  }

  return loops;
}

/**
 * Bir köşede birden fazla kenar başlıyorsa (iki dolu hücre köşe köşe değiyorsa)
 * en sağa dönen seçilir; böylece halkalar birbirine karışmaz.
 */
function pickTurn(options: Edge[], incoming: Point): number {
  const order = [
    { x: -incoming.y, y: incoming.x }, // sağa dön
    incoming, // düz
    { x: incoming.y, y: -incoming.x }, // sola dön
  ];
  for (const wanted of order) {
    const index = options.findIndex((edge) => edge.dir.x === wanted.x && edge.dir.y === wanted.y);
    if (index >= 0) return index;
  }
  return 0;
}

/** Aynı doğrultudaki ardışık noktaları teke indirir. */
function simplify(loop: Point[]): Point[] {
  const out: Point[] = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const previous = loop[(i - 1 + n) % n];
    const current = loop[i];
    const next = loop[(i + 1) % n];
    const straight =
      (current.x - previous.x) * (next.y - current.y) ===
      (current.y - previous.y) * (next.x - current.x);
    if (!straight) out.push(current);
  }
  return out.length >= 3 ? out : loop;
}

/**
 * Merdiven köşelerini pahlar: tek hücrelik kenarların köşesi yarıdan kesilince
 * ardışık basamaklar tek bir 45° doğruya dönüşür. Uzun kenarların birleştiği
 * köşeler (alan çerçevesi gibi) keskin kalır.
 */
export function chamfer(loop: Point[], max = 0.5): Point[] {
  const n = loop.length;
  if (n < 3) return loop;
  const out: Point[] = [];
  /** Aynı noktayı iki kez eklemez; pahlanan komşu köşeler ortak nokta üretebilir. */
  const push = (point: Point) => {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - point.x) < 1e-9 && Math.abs(last.y - point.y) < 1e-9) return;
    out.push(point);
  };

  for (let i = 0; i < n; i++) {
    const previous = loop[(i - 1 + n) % n];
    const current = loop[i];
    const next = loop[(i + 1) % n];
    const lengthPrevious = Math.hypot(current.x - previous.x, current.y - previous.y);
    const lengthNext = Math.hypot(next.x - current.x, next.y - current.y);

    if (Math.min(lengthPrevious, lengthNext) > 1 || lengthPrevious === 0 || lengthNext === 0) {
      push(current);
      continue;
    }

    const cut = Math.min(max, lengthPrevious / 2, lengthNext / 2);
    push(lerp(current, previous, cut / lengthPrevious));
    push(lerp(current, next, cut / lengthNext));
  }

  // Halkanın başı ve sonu da çakışabilir.
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) {
    out.pop();
  }

  return out;
}

function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/** Çizime hazır, köşeleri yumuşatılmış sınır çokgenleri. */
export function territoryOutline(field: Field): Point[][] {
  return traceOutline(field).map((loop) => chamfer(loop));
}
