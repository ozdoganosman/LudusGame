/**
 * Gemi ve düşmanların çizim şekilleri — hücre biriminde, renderdan bağımsız.
 * Web (Canvas2D) ve mobil (Skia) aynı listeyi çizer, böylece iki platformda
 * aynı karakterler görünür.
 */
import { defaultLoadout } from '../engine/upgrades';
import type { Loadout } from '../engine/upgrades';
import type { Shot } from '../engine/types';
import { palette, shade } from './palette';

import type { Point, Shape } from './shapes';

export type { Point, Shape } from './shapes';


function rotate(points: Point[], angle: number, cx: number, cy: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  });
}

export { enemyShapes } from './monsters';

export type ShipOptions = {
  /** Hücre koordinatı (gemi merkezi). */
  x: number;
  y: number;
  /** Baktığı yön, radyan. */
  angle: number;
  /** Motor alevinin titreşimi için artan zaman. */
  time: number;
  /** Işın (çizim) açık mı: burun feneri parlar. */
  beaming: boolean;
  /** Satın alınmış parçalar; gemide görünür. */
  loadout?: Loadout;
  /** O an dolu kalkan sayısı; kabarcık bununla çizilir. */
  shield?: number;
};

/**
 * Nanogemi. Gövde sabittir; kanat, motor, kuyruk, kompozit kaplama, ışın topu
 * ve kalkan satın alınan seviyeye göre büyür — oyuncu yükseltmeyi gemide görür.
 */
export function shipShapes({
  x,
  y,
  angle,
  time,
  beaming,
  loadout = defaultLoadout(),
  shield = 0,
}: ShipOptions): Shape[] {
  const r = 1.5;
  const { wing, engine, tail, composite, weapon } = loadout;
  /** Gemi uzayındaki noktaları (burun +x) dünya açısına döndürür. */
  const turn = (points: Point[]) => rotate(points, angle, x, y);
  const point = (px: number, py: number) => turn([{ x: px, y: py }])[0];

  const shapes: Shape[] = [
    { kind: 'circle', x, y, r: r * 2.4, color: palette.playerGlow, alpha: 0.16 },
  ];

  // --- kuyruk: gövdenin arkasındaki dümenler; seviyeyle uzar
  const tailLength = r * (0.34 + 0.2 * tail);
  const finColor = shade(palette.playerGlow, 0.5 - tail * 0.07);
  const fin = (side: number): Point[] => [
    { x: x - r * 0.82, y: y + side * r * 0.18 },
    { x: x - r * 1.02, y: y + side * (r * 0.2 + tailLength) },
    { x: x - r * 1.24, y: y + side * (r * 0.16 + tailLength) },
    { x: x - r * 1.05, y: y + side * r * 0.14 },
  ];
  shapes.push({ kind: 'poly', points: turn(fin(-1)), color: finColor });
  shapes.push({ kind: 'poly', points: turn(fin(1)), color: finColor });

  // --- motor: alev gövdenin arkasından çıkar, seviyeyle uzar
  const flicker = Math.sin(time * 18) * 0.06;
  const flame = r * (0.3 + engine * 0.07 + flicker);
  const exhaust = point(x - r * (1.12 + engine * 0.05), y);
  shapes.push({
    kind: 'circle',
    x: exhaust.x,
    y: exhaust.y,
    r: flame * 1.7,
    color: palette.accent,
    alpha: 0.3,
  });
  shapes.push({ kind: 'circle', x: exhaust.x, y: exhaust.y, r: flame, color: palette.accent, alpha: 0.9 });
  shapes.push({ kind: 'circle', x: exhaust.x, y: exhaust.y, r: flame * 0.45, color: '#ffffff', alpha: 0.7 });
  if (engine >= 2) {
    // Üst kademelerde yan lüleler de yanar.
    for (const side of [-1, 1]) {
      const nozzle = point(x - r * 0.95, y + side * r * 0.4);
      shapes.push({
        kind: 'circle',
        x: nozzle.x,
        y: nozzle.y,
        r: flame * 0.5,
        color: palette.accent,
        alpha: 0.65,
      });
    }
  }

  // --- kanat: gövde ortasından geriye süpürülmüş; seviyeyle açılır
  const span = r * (0.52 + 0.26 * wing);
  const wingColor = shade(palette.player, 0.46 - wing * 0.06);
  const wingShape = (side: number): Point[] => [
    { x: x + r * 0.45, y: y + side * r * 0.2 },
    { x: x - r * 0.1, y: y + side * span },
    { x: x - r * 0.52, y: y + side * span },
    { x: x - r * 0.62, y: y + side * r * 0.3 },
  ];
  const wingEdge = (side: number): Point[] => [
    { x: x + r * 0.45, y: y + side * r * 0.2 },
    { x: x - r * 0.1, y: y + side * span },
    { x: x - r * 0.22, y: y + side * span },
    { x: x + r * 0.36, y: y + side * r * 0.2 },
  ];
  for (const side of [-1, 1]) {
    shapes.push({ kind: 'poly', points: turn(wingShape(side)), color: wingColor });
    shapes.push({ kind: 'poly', points: turn(wingEdge(side)), color: palette.playerGlow, alpha: 0.7 });
  }

  // --- ışın topu: burna takılan namlu(lar)
  if (weapon > 0) {
    const reach = r * (1.5 + weapon * 0.07);
    const barrel = (side: number): Point[] => [
      { x: x + r * 0.5, y: y + side * r * 0.26 },
      { x: x + reach, y: y + side * r * 0.14 },
      { x: x + reach, y: y + side * r * 0.03 },
      { x: x + r * 0.5, y: y + side * r * 0.05 },
    ];
    const barrelColor = shade(palette.accent, 0.3);
    shapes.push({ kind: 'poly', points: turn(barrel(-1)), color: barrelColor });
    if (weapon >= 3) shapes.push({ kind: 'poly', points: turn(barrel(1)), color: barrelColor });
    const muzzle = point(x + reach + 0.1, y - (weapon >= 3 ? 0 : r * 0.08));
    shapes.push({ kind: 'circle', x: muzzle.x, y: muzzle.y, r: r * 0.1, color: palette.accent });
  }

  // --- gövde; kompozit kaplama gövdeyi kalınlaştırır
  const hullWidth = 1 + composite * 0.05;
  const hull: Point[] = [
    { x: x + r * 1.35, y },
    { x: x + r * 0.35, y: y - r * 0.58 * hullWidth },
    { x: x - r * 0.75, y: y - r * 0.5 * hullWidth },
    { x: x - r * 0.98, y },
    { x: x - r * 0.75, y: y + r * 0.5 * hullWidth },
    { x: x + r * 0.35, y: y + r * 0.58 * hullWidth },
  ];
  shapes.push({ kind: 'poly', points: turn(hull), color: palette.player });
  shapes.push({
    kind: 'poly',
    points: turn([
      { x: x + r * 1.35, y },
      { x: x + r * 0.35, y: y - r * 0.58 * hullWidth },
      { x: x + r * 0.1, y: y - r * 0.18 },
    ]),
    color: shade(palette.player, 0.18),
  });

  if (composite > 0) {
    // Zırh plakası ve perçinler: kaç kademe alındığı tek bakışta görünsün.
    shapes.push({
      kind: 'poly',
      points: turn([
        { x: x + r * 0.42, y: y - r * 0.3 },
        { x: x - r * 0.66, y: y - r * 0.34 },
        { x: x - r * 0.66, y: y + r * 0.34 },
        { x: x + r * 0.42, y: y + r * 0.3 },
      ]),
      color: shade(palette.player, 0.32),
    });
    for (let i = 0; i < composite; i++) {
      const rivet = point(x - r * 0.5 + i * r * 0.28, y - r * 0.2);
      shapes.push({ kind: 'circle', x: rivet.x, y: rivet.y, r: r * 0.06, color: palette.accent });
    }
  }

  // --- kokpit ve burun feneri
  const cockpit = point(x + r * 0.1, y);
  const nose = point(x + r * 1.15, y);
  shapes.push(
    { kind: 'circle', x: cockpit.x, y: cockpit.y, r: r * 0.42, color: palette.playerGlow },
    { kind: 'circle', x: cockpit.x, y: cockpit.y, r: r * 0.24, color: '#ffffff', alpha: 0.8 },
    {
      kind: 'circle',
      x: nose.x,
      y: nose.y,
      r: beaming ? r * 0.46 : r * 0.24,
      color: beaming ? palette.trail : palette.accent,
      alpha: beaming ? 0.95 : 0.6,
    }
  );

  // --- kalkan: dolu her darbe için biraz daha belirgin bir kabarcık
  if (shield > 0) {
    shapes.push({
      kind: 'circle',
      x,
      y,
      r: r * (1.85 + shield * 0.1),
      color: palette.filledEdge,
      alpha: 0.1 + shield * 0.04,
    });
  }

  return shapes;
}

/** Işın topunun mermisi: parlak çekirdek ve soluk hâle. */
export function shotShapes(shot: Shot): Shape[] {
  return [
    { kind: 'circle', x: shot.x, y: shot.y, r: 0.9, color: palette.trail, alpha: 0.28 },
    { kind: 'circle', x: shot.x, y: shot.y, r: 0.4, color: '#ffffff', alpha: 0.95 },
  ];
}

/** Hareket yönünden geminin baktığı açı; duruyorsa son açı korunur. */
export function shipAngle(dx: number, dy: number, previous: number): number {
  if (dx === 0 && dy === 0) return previous;
  return Math.atan2(dy, dx);
}
