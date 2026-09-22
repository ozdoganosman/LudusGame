/**
 * Gemi ve düşmanların çizim şekilleri — hücre biriminde, renderdan bağımsız.
 * Web (Canvas2D) ve mobil (Skia) aynı listeyi çizer, böylece iki platformda
 * aynı karakterler görünür.
 */
import { defaultLoadout } from '../engine/upgrades';
import type { Loadout } from '../engine/upgrades';
import type { Enemy, Shot } from '../engine/types';
import { germColors, palette, shade } from './palette';

export type Point = { x: number; y: number };

export type Shape =
  | { kind: 'circle'; x: number; y: number; r: number; color: string; alpha?: number }
  | { kind: 'poly'; points: Point[]; color: string; alpha?: number };

const TAU = Math.PI * 2;

/** Organik, hafifçe nefes alan gövde konturu. */
function blob(cx: number, cy: number, radius: number, time: number, wobble = 0.12, segments = 18): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * TAU;
    const r = radius * (1 + Math.sin(angle * 3 + time * 2) * wobble);
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

/** Dikenli korona (virüs ve patojen için). */
function spikes(cx: number, cy: number, radius: number, count: number, length: number, rotation: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count * 2; i++) {
    const angle = rotation + (i / (count * 2)) * TAU;
    const r = i % 2 === 0 ? radius + length : radius * 0.92;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

/** Dolu yay: gülümseme ya da ağız. */
function mouth(cx: number, cy: number, width: number, depth: number): Point[] {
  const points: Point[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: cx - width / 2 + width * t, y: cy + Math.sin(Math.PI * t) * depth });
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    points.push({ x: cx - width / 2 + width * t, y: cy + Math.sin(Math.PI * t) * depth * 0.25 });
  }
  return points;
}

function rotate(points: Point[], angle: number, cx: number, cy: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  });
}

/** Göz: ak, bebek (bakış yönüne kayar) ve parlama. */
function eye(cx: number, cy: number, r: number, look: Point): Shape[] {
  const shift = r * 0.32;
  return [
    { kind: 'circle', x: cx, y: cy, r, color: '#ffffff' },
    { kind: 'circle', x: cx + look.x * shift, y: cy + look.y * shift, r: r * 0.52, color: '#140c22' },
    { kind: 'circle', x: cx - r * 0.3, y: cy - r * 0.34, r: r * 0.2, color: '#ffffff', alpha: 0.85 },
  ];
}

/** Bakış yönü: birim vektör (hedef yoksa aşağı bakar). */
function lookAt(from: Point, target?: Point): Point {
  if (!target) return { x: 0, y: 0.2 };
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

/** Mikrop: yumuşak, renkli, iri gözlü tek hücreli. */
function germShapes(enemy: Enemy, target?: Point): Shape[] {
  const color = germColors[enemy.id % germColors.length];
  const r = enemy.radius;
  const look = lookAt({ x: enemy.x, y: enemy.y }, target);
  const wobbleTime = enemy.spin;

  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 1.85, color, alpha: 0.16 },
    { kind: 'poly', points: blob(enemy.x, enemy.y, r, wobbleTime), color },
    {
      kind: 'poly',
      points: blob(enemy.x, enemy.y - r * 0.28, r * 0.62, wobbleTime + 1),
      color: '#ffffff',
      alpha: 0.14,
    },
    ...eye(enemy.x - r * 0.34, enemy.y - r * 0.12, r * 0.34, look),
    ...eye(enemy.x + r * 0.34, enemy.y - r * 0.12, r * 0.34, look),
    { kind: 'poly', points: mouth(enemy.x, enemy.y + r * 0.42, r * 0.7, r * 0.3), color: shade(color, 0.6) },
  ];
}

/** Virüs: dikenli korona, tek iri göz, çatık kaş. */
function virusShapes(enemy: Enemy, target?: Point): Shape[] {
  const color = palette.hunter;
  const r = enemy.radius;
  const look = lookAt({ x: enemy.x, y: enemy.y }, target);

  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 2, color, alpha: 0.16 },
    {
      kind: 'poly',
      points: spikes(enemy.x, enemy.y, r * 0.82, 9, r * 0.5, enemy.spin),
      color: shade(color, 0.25),
    },
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 0.86, color },
    ...eye(enemy.x, enemy.y + r * 0.05, r * 0.46, look),
    {
      kind: 'poly',
      points: [
        { x: enemy.x - r * 0.55, y: enemy.y - r * 0.62 },
        { x: enemy.x + r * 0.55, y: enemy.y - r * 0.3 },
        { x: enemy.x + r * 0.55, y: enemy.y - r * 0.05 },
        { x: enemy.x - r * 0.55, y: enemy.y - r * 0.35 },
      ],
      color: shade(color, 0.55),
    },
  ];
}

/** Patojen: büyük, öfkeli, dişli. Bulunduğu bölge temizlenemez. */
function pathogenShapes(enemy: Enemy, target?: Point): Shape[] {
  const color = palette.boss;
  const r = enemy.radius;
  const look = lookAt({ x: enemy.x, y: enemy.y }, target);
  const pulse = 1 + Math.sin(enemy.spin * 1.6) * 0.06;

  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 2.1 * pulse, color, alpha: 0.18 },
    {
      kind: 'poly',
      points: spikes(enemy.x, enemy.y, r * 0.9, 11, r * 0.42 * pulse, -enemy.spin * 0.6),
      color: shade(color, 0.3),
    },
    { kind: 'poly', points: blob(enemy.x, enemy.y, r * 0.95, enemy.spin, 0.07, 22), color },
    {
      kind: 'poly',
      points: blob(enemy.x, enemy.y - r * 0.3, r * 0.5, enemy.spin + 2, 0.08),
      color: '#ffffff',
      alpha: 0.12,
    },
    ...eye(enemy.x - r * 0.36, enemy.y - r * 0.1, r * 0.3, look),
    ...eye(enemy.x + r * 0.36, enemy.y - r * 0.1, r * 0.3, look),
    {
      kind: 'poly',
      points: [
        { x: enemy.x - r * 0.62, y: enemy.y - r * 0.55 },
        { x: enemy.x - r * 0.12, y: enemy.y - r * 0.3 },
        { x: enemy.x - r * 0.12, y: enemy.y - r * 0.12 },
        { x: enemy.x - r * 0.62, y: enemy.y - r * 0.34 },
      ],
      color: shade(color, 0.55),
    },
    {
      kind: 'poly',
      points: [
        { x: enemy.x + r * 0.62, y: enemy.y - r * 0.55 },
        { x: enemy.x + r * 0.12, y: enemy.y - r * 0.3 },
        { x: enemy.x + r * 0.12, y: enemy.y - r * 0.12 },
        { x: enemy.x + r * 0.62, y: enemy.y - r * 0.34 },
      ],
      color: shade(color, 0.55),
    },
    { kind: 'poly', points: mouth(enemy.x, enemy.y + r * 0.4, r * 0.8, r * 0.34), color: '#2a0713' },
    {
      kind: 'poly',
      points: [
        { x: enemy.x - r * 0.24, y: enemy.y + r * 0.42 },
        { x: enemy.x - r * 0.08, y: enemy.y + r * 0.42 },
        { x: enemy.x - r * 0.16, y: enemy.y + r * 0.66 },
      ],
      color: '#ffffff',
    },
    {
      kind: 'poly',
      points: [
        { x: enemy.x + r * 0.08, y: enemy.y + r * 0.42 },
        { x: enemy.x + r * 0.24, y: enemy.y + r * 0.42 },
        { x: enemy.x + r * 0.16, y: enemy.y + r * 0.66 },
      ],
      color: '#ffffff',
    },
  ];
}

/** Düşman türüne göre şekiller; target verilirse gözler oraya bakar. */
export function enemyShapes(enemy: Enemy, target?: Point): Shape[] {
  if (enemy.kind === 'boss') return pathogenShapes(enemy, target);
  if (enemy.kind === 'hunter') return virusShapes(enemy, target);
  return germShapes(enemy, target);
}

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
