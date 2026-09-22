/**
 * Renderdan bağımsız şekil listesi: gemi, düşmanlar, efektler ve ara sahne
 * bununla çizilir. Web (Canvas2D) ve mobil (Skia) aynı listeyi yorumlar, böylece
 * iki platformda aynı görüntü çıkar. Koordinatlar hücre birimindedir.
 */

export type Point = { x: number; y: number };

/**
 * Odaklı radyal degrade: ışık (fx, fy) noktasından gelir, (cx, cy) merkezli
 * r yarıçaplı dairenin kenarında `to` rengine ulaşır. Gövdelere hacim verir.
 */
export type Gradient = {
  cx: number;
  cy: number;
  r: number;
  fx?: number;
  fy?: number;
  from: string;
  to: string;
};

type Paint = {
  /** Dolgu rengi (degrade varsa yedek renk; açık çizgide çizgi rengi). */
  color: string;
  alpha?: number;
  gradient?: Gradient;
  /** Kontur rengi; verilmezse kontur çizilmez. */
  stroke?: string;
  /** Kontur kalınlığı (hücre). */
  strokeWidth?: number;
};

export type Shape =
  | ({ kind: 'circle'; x: number; y: number; r: number } & Paint)
  /** open: kapanmayan çizgi (kamçı, kirpik, dokunaç); yalnızca çizilir, doldurulmaz. */
  | ({ kind: 'poly'; points: Point[]; open?: boolean } & Paint);

/** Konturun ekranda bundan ince çizilmemesi için alt sınır (CSS pikseli). */
export const MIN_STROKE_PX = 1;

/**
 * Şekilleri bir merkez etrafında ölçekler ve saydamlaştırır. Patlama ve
 * erime animasyonları düşmanın kendi çizimini bununla büyütüp söndürür.
 */
export function transformShapes(
  shapes: Shape[],
  cx: number,
  cy: number,
  scale: number,
  alpha: number
): Shape[] {
  const mapX = (x: number) => cx + (x - cx) * scale;
  const mapY = (y: number) => cy + (y - cy) * scale;

  return shapes.map((shape) => {
    const gradient = shape.gradient
      ? {
          ...shape.gradient,
          cx: mapX(shape.gradient.cx),
          cy: mapY(shape.gradient.cy),
          r: shape.gradient.r * scale,
          fx: shape.gradient.fx === undefined ? undefined : mapX(shape.gradient.fx),
          fy: shape.gradient.fy === undefined ? undefined : mapY(shape.gradient.fy),
        }
      : undefined;
    const common = {
      alpha: (shape.alpha ?? 1) * alpha,
      gradient,
      strokeWidth: shape.strokeWidth === undefined ? undefined : shape.strokeWidth * scale,
    };
    if (shape.kind === 'circle') {
      return { ...shape, ...common, x: mapX(shape.x), y: mapY(shape.y), r: shape.r * scale };
    }
    return {
      ...shape,
      ...common,
      points: shape.points.map((p) => ({ x: mapX(p.x), y: mapY(p.y) })),
    };
  });
}
