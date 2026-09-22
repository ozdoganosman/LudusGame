/**
 * Gemi ve düşmanların çizim şekilleri — hücre biriminde, renderdan bağımsız.
 * Web (Canvas2D) ve mobil (Skia) aynı listeyi çizer, böylece iki platformda
 * aynı karakterler görünür.
 */
import { defaultLoadout } from '../engine/upgrades';
import type { Loadout } from '../engine/upgrades';
import type { Enemy, Shot } from '../engine/types';
import { palette, shade } from './palette';
import type { Monster } from './tissues';

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

/** Kapsül gövde (basil): verilen yöne uzatılmış yuvarlak uçlu dörtgen. */
function capsule(cx: number, cy: number, length: number, radius: number, angle: number): Point[] {
  const points: Point[] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI - Math.PI / 2;
    points.push({ x: length / 2 + Math.cos(t) * radius, y: Math.sin(t) * radius });
  }
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI + Math.PI / 2;
    points.push({ x: -length / 2 + Math.cos(t) * radius, y: Math.sin(t) * radius });
  }
  return rotate(
    points.map((p) => ({ x: cx + p.x, y: cy + p.y })),
    angle,
    cx,
    cy
  );
}

/** Köşeli kabuk (kristal): eşit olmayan yarıçaplı çokgen. */
function shard(cx: number, cy: number, radius: number, sides: number, rotation: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * TAU;
    const r = radius * (0.7 + ((i * 37) % 11) / 22);
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

function polygon(cx: number, cy: number, radius: number, sides: number, rotation: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * TAU;
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return points;
}

/** İnce, uca doğru daralan kol (denizanası kolu, hidra boynu). */
function limb(
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number,
  wobble: number
): Point[] {
  const steps = 5;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sway = Math.sin(wobble + t * 3) * length * 0.16;
    const px = cx + Math.cos(angle) * length * t - Math.sin(angle) * sway;
    const py = cy + Math.sin(angle) * length * t + Math.cos(angle) * sway;
    const half = width * (1 - t * 0.75);
    left.push({ x: px - Math.sin(angle) * half, y: py + Math.cos(angle) * half });
    right.push({ x: px + Math.sin(angle) * half, y: py - Math.cos(angle) * half });
  }
  return [...left, ...right.reverse()];
}

/** Diş sırası: gövdenin alt kenarına dizilmiş üçgenler. */
function teeth(cx: number, cy: number, width: number, height: number, count: number): Shape[] {
  const shapes: Shape[] = [];
  const step = width / count;
  for (let i = 0; i < count; i++) {
    const x = cx - width / 2 + step * (i + 0.5);
    shapes.push({
      kind: 'poly',
      points: [
        { x: x - step * 0.35, y: cy },
        { x: x + step * 0.35, y: cy },
        { x, y: cy + height },
      ],
      color: '#ffffff',
    });
  }
  return shapes;
}

/** Mikrop kümesi: iki küre, iri gözler, gülen ağız. */
function coccusShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 1.8, color, alpha: 0.16 },
    { kind: 'poly', points: blob(enemy.x - r * 0.3, enemy.y + r * 0.25, r * 0.6, enemy.spin), color: shade(color, 0.25) },
    { kind: 'poly', points: blob(enemy.x, enemy.y, r, enemy.spin), color },
    {
      kind: 'poly',
      points: blob(enemy.x, enemy.y - r * 0.28, r * 0.6, enemy.spin + 1),
      color: '#ffffff',
      alpha: 0.16,
    },
    ...eye(enemy.x - r * 0.34, enemy.y - r * 0.12, r * 0.34, look),
    ...eye(enemy.x + r * 0.34, enemy.y - r * 0.12, r * 0.34, look),
    { kind: 'poly', points: mouth(enemy.x, enemy.y + r * 0.42, r * 0.7, r * 0.3), color: shade(color, 0.6) },
  ];
}

/** Basil: çubuk gövde, kamçı kuyruk, tek göz. */
function bacillusShapes(enemy: Enemy, r: number, color: string, look: Point, heading: number): Shape[] {
  const tail = limb(
    enemy.x - Math.cos(heading) * r * 0.9,
    enemy.y - Math.sin(heading) * r * 0.9,
    heading + Math.PI,
    r * 1.5,
    r * 0.14,
    enemy.spin * 3
  );
  const head = { x: enemy.x + Math.cos(heading) * r * 0.45, y: enemy.y + Math.sin(heading) * r * 0.45 };

  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 1.7, color, alpha: 0.14 },
    { kind: 'poly', points: tail, color: shade(color, 0.35) },
    { kind: 'poly', points: capsule(enemy.x, enemy.y, r * 1.7, r * 0.62, heading), color },
    {
      kind: 'poly',
      points: capsule(enemy.x, enemy.y - r * 0.18, r * 1.2, r * 0.22, heading),
      color: '#ffffff',
      alpha: 0.18,
    },
    ...eye(head.x, head.y, r * 0.38, look),
  ];
}

/** Solucan: eklemli gövde, dişli baş. Gövde gittiği yönün arkasına dizilir. */
function wormShapes(enemy: Enemy, r: number, color: string, look: Point, heading: number): Shape[] {
  const shapes: Shape[] = [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 1.9, color, alpha: 0.14 },
  ];
  const segments = 5;
  for (let i = segments; i >= 1; i--) {
    const t = i / segments;
    const sway = Math.sin(enemy.spin * 2 - i * 0.9) * r * 0.45;
    const x = enemy.x - Math.cos(heading) * r * 1.05 * i - Math.sin(heading) * sway;
    const y = enemy.y - Math.sin(heading) * r * 1.05 * i + Math.cos(heading) * sway;
    shapes.push({
      kind: 'poly',
      points: blob(x, y, r * (0.75 - t * 0.28), enemy.spin + i, 0.16, 12),
      color: i % 2 === 0 ? shade(color, 0.3) : shade(color, 0.15),
    });
  }
  shapes.push(
    { kind: 'poly', points: blob(enemy.x, enemy.y, r * 0.85, enemy.spin, 0.1, 16), color },
    ...eye(enemy.x - r * 0.26, enemy.y - r * 0.18, r * 0.28, look),
    ...eye(enemy.x + r * 0.26, enemy.y - r * 0.18, r * 0.28, look),
    ...teeth(enemy.x, enemy.y + r * 0.42, r * 1.1, r * 0.34, 4)
  );
  return shapes;
}

/** Spor: dikenli kabuk, dikiş çizgisi, tek göz. */
function sporeShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 2, color, alpha: 0.15 },
    {
      kind: 'poly',
      points: spikes(enemy.x, enemy.y, r * 0.86, 10, r * 0.5, enemy.spin),
      color: shade(color, 0.3),
    },
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 0.86, color },
    {
      kind: 'poly',
      points: [
        { x: enemy.x - r * 0.8, y: enemy.y - r * 0.1 },
        { x: enemy.x + r * 0.8, y: enemy.y - r * 0.1 },
        { x: enemy.x + r * 0.8, y: enemy.y + r * 0.06 },
        { x: enemy.x - r * 0.8, y: enemy.y + r * 0.06 },
      ],
      color: shade(color, 0.5),
    },
    ...eye(enemy.x, enemy.y - r * 0.3, r * 0.34, look),
  ];
}

/** Denizanası: çan gövde, sallanan kollar. */
function jellyShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  const shapes: Shape[] = [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 2, color, alpha: 0.18 },
  ];
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 2 + (i - 1.5) * 0.36;
    shapes.push({
      kind: 'poly',
      points: limb(enemy.x, enemy.y + r * 0.3, angle, r * 1.6, r * 0.16, enemy.spin * 2 + i),
      color: shade(color, 0.3),
      alpha: 0.85,
    });
  }
  shapes.push(
    {
      kind: 'poly',
      points: [
        ...polygon(enemy.x, enemy.y - r * 0.1, r * 0.95, 14, Math.PI).filter((p) => p.y <= enemy.y + r * 0.2),
        { x: enemy.x + r * 0.95, y: enemy.y + r * 0.25 },
        { x: enemy.x - r * 0.95, y: enemy.y + r * 0.25 },
      ],
      color,
      alpha: 0.9,
    },
    {
      kind: 'circle',
      x: enemy.x - r * 0.25,
      y: enemy.y - r * 0.4,
      r: r * 0.3,
      color: '#ffffff',
      alpha: 0.25,
    },
    ...eye(enemy.x - r * 0.3, enemy.y - r * 0.1, r * 0.26, look),
    ...eye(enemy.x + r * 0.3, enemy.y - r * 0.1, r * 0.26, look)
  );
  return shapes;
}

/** Kristal virüs: köşeli kabuk, yansıma, yarık göz. */
function crystalShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 1.9, color, alpha: 0.16 },
    { kind: 'poly', points: shard(enemy.x, enemy.y, r * 1.15, 7, enemy.spin * 0.4), color: shade(color, 0.45) },
    { kind: 'poly', points: shard(enemy.x, enemy.y, r * 0.85, 6, -enemy.spin * 0.3), color },
    {
      kind: 'poly',
      points: [
        { x: enemy.x - r * 0.3, y: enemy.y - r * 0.6 },
        { x: enemy.x + r * 0.15, y: enemy.y - r * 0.2 },
        { x: enemy.x - r * 0.1, y: enemy.y + r * 0.1 },
        { x: enemy.x - r * 0.5, y: enemy.y - r * 0.2 },
      ],
      color: '#ffffff',
      alpha: 0.28,
    },
    ...eye(enemy.x, enemy.y + r * 0.1, r * 0.3, look),
  ];
}

/** Faj: altıgen baş, boyun ve bacaklar. */
function phageShapes(enemy: Enemy, r: number, color: string, look: Point, heading: number): Shape[] {
  const shapes: Shape[] = [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 1.9, color, alpha: 0.16 },
  ];
  for (let i = 0; i < 3; i++) {
    const angle = heading + Math.PI + (i - 1) * 0.5;
    shapes.push({
      kind: 'poly',
      points: limb(enemy.x, enemy.y, angle, r * 1.3, r * 0.13, enemy.spin + i * 2),
      color: shade(color, 0.4),
    });
  }
  shapes.push(
    {
      kind: 'poly',
      points: capsule(enemy.x, enemy.y, r * 0.5, r * 0.3, heading),
      color: shade(color, 0.25),
    },
    {
      kind: 'poly',
      points: polygon(
        enemy.x + Math.cos(heading) * r * 0.35,
        enemy.y + Math.sin(heading) * r * 0.35,
        r * 0.8,
        6,
        heading
      ),
      color,
    },
    ...eye(
      enemy.x + Math.cos(heading) * r * 0.35,
      enemy.y + Math.sin(heading) * r * 0.35,
      r * 0.36,
      look
    )
  );
  return shapes;
}

/** Amip: düzensiz gövde, yalancı ayaklar, çekirdek. */
function amoebaShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 1.9, color, alpha: 0.15 },
    { kind: 'poly', points: blob(enemy.x, enemy.y, r * 1.05, enemy.spin, 0.3, 14), color, alpha: 0.85 },
    { kind: 'poly', points: blob(enemy.x, enemy.y, r * 0.7, enemy.spin + 2, 0.22, 12), color: shade(color, 0.2) },
    {
      kind: 'circle',
      x: enemy.x + r * 0.2,
      y: enemy.y + r * 0.25,
      r: r * 0.26,
      color: shade(color, 0.55),
    },
    ...eye(enemy.x - r * 0.3, enemy.y - r * 0.22, r * 0.3, look),
    ...eye(enemy.x + r * 0.32, enemy.y - r * 0.3, r * 0.24, look),
  ];
}

/** Patron: nabız gibi atan gövde, dişli ağız, öfkeli kaşlar. */
function mawShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  const pulse = 1 + Math.sin(enemy.spin * 1.6) * 0.07;
  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 2.1 * pulse, color, alpha: 0.2 },
    {
      kind: 'poly',
      points: spikes(enemy.x, enemy.y, r * 0.92, 12, r * 0.4 * pulse, -enemy.spin * 0.6),
      color: shade(color, 0.35),
    },
    { kind: 'poly', points: blob(enemy.x, enemy.y, r * 0.95, enemy.spin, 0.07, 22), color },
    {
      kind: 'poly',
      points: blob(enemy.x, enemy.y - r * 0.3, r * 0.5, enemy.spin + 2, 0.08),
      color: '#ffffff',
      alpha: 0.12,
    },
    ...eye(enemy.x - r * 0.36, enemy.y - r * 0.12, r * 0.3, look),
    ...eye(enemy.x + r * 0.36, enemy.y - r * 0.12, r * 0.3, look),
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
    { kind: 'poly', points: mouth(enemy.x, enemy.y + r * 0.4, r * 0.85, r * 0.34), color: '#2a0713' },
    ...teeth(enemy.x, enemy.y + r * 0.42, r * 0.7, r * 0.28, 3),
  ];
}

/** Patron: dev göz, çevresinde dönen korona. */
function eyeBossShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  const pulse = 1 + Math.sin(enemy.spin * 1.4) * 0.06;
  return [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 2.2 * pulse, color, alpha: 0.2 },
    {
      kind: 'poly',
      points: spikes(enemy.x, enemy.y, r * 1, 14, r * 0.55 * pulse, enemy.spin * 0.5),
      color: shade(color, 0.3),
    },
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 0.98, color },
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 0.78, color: '#ffffff' },
    {
      kind: 'circle',
      x: enemy.x + look.x * r * 0.3,
      y: enemy.y + look.y * r * 0.3,
      r: r * 0.46,
      color: shade(color, 0.2),
    },
    {
      kind: 'circle',
      x: enemy.x + look.x * r * 0.34,
      y: enemy.y + look.y * r * 0.34,
      r: r * 0.24,
      color: '#140c22',
    },
    {
      kind: 'circle',
      x: enemy.x - r * 0.3,
      y: enemy.y - r * 0.34,
      r: r * 0.16,
      color: '#ffffff',
      alpha: 0.9,
    },
  ];
}

/** Patron: üç başlı gövde; başlar gemiye döner. */
function hydraShapes(enemy: Enemy, r: number, color: string, look: Point): Shape[] {
  const shapes: Shape[] = [
    { kind: 'circle', x: enemy.x, y: enemy.y, r: r * 2.2, color, alpha: 0.2 },
  ];
  const base = Math.atan2(look.y, look.x);
  for (let i = 0; i < 3; i++) {
    const angle = base + (i - 1) * 0.85 + Math.sin(enemy.spin + i) * 0.12;
    const length = r * 1.35;
    shapes.push({
      kind: 'poly',
      points: limb(enemy.x, enemy.y, angle, length, r * 0.28, enemy.spin * 2 + i),
      color: shade(color, 0.35),
    });
    const hx = enemy.x + Math.cos(angle) * length;
    const hy = enemy.y + Math.sin(angle) * length;
    shapes.push(
      { kind: 'poly', points: blob(hx, hy, r * 0.44, enemy.spin + i, 0.12, 12), color },
      ...eye(hx, hy, r * 0.2, look)
    );
  }
  shapes.push(
    { kind: 'poly', points: blob(enemy.x, enemy.y, r * 0.9, enemy.spin, 0.1, 20), color },
    {
      kind: 'poly',
      points: blob(enemy.x, enemy.y - r * 0.25, r * 0.45, enemy.spin + 3, 0.1),
      color: '#ffffff',
      alpha: 0.12,
    },
    ...teeth(enemy.x, enemy.y + r * 0.3, r * 0.9, r * 0.3, 4)
  );
  return shapes;
}

/** O bölümün canavarı: aile ve renk tema dosyasından gelir. */
export function enemyShapes(enemy: Enemy, target: Point | undefined, monster: Monster): Shape[] {
  const r = enemy.radius;
  const look = lookAt({ x: enemy.x, y: enemy.y }, target);
  const heading = Math.atan2(enemy.vy, enemy.vx);
  const color = monster.color;

  switch (monster.family) {
    case 'coccus':
      return coccusShapes(enemy, r, color, look);
    case 'bacillus':
      return bacillusShapes(enemy, r, color, look, heading);
    case 'worm':
      return wormShapes(enemy, r, color, look, heading);
    case 'spore':
      return sporeShapes(enemy, r, color, look);
    case 'jelly':
      return jellyShapes(enemy, r, color, look);
    case 'crystal':
      return crystalShapes(enemy, r, color, look);
    case 'phage':
      return phageShapes(enemy, r, color, look, heading);
    case 'amoeba':
      return amoebaShapes(enemy, r, color, look);
    case 'maw':
      return mawShapes(enemy, r, color, look);
    case 'eye':
      return eyeBossShapes(enemy, r, color, look);
    case 'hydra':
      return hydraShapes(enemy, r, color, look);
  }
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
