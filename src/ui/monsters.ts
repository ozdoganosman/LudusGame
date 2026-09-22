/**
 * Düşmanların çizimi. Çizgi film üslubu: kalın koyu kontur, sol üstten ışık
 * alan hacimli degrade, parlama, gölge ve iri ifadeli gözler. Küçük boyutta
 * okunabilsin diye her ailenin silueti belirgin ve ayrıntı az ama iri.
 *
 * Görsel yarıçap çarpışma yarıçapından büyük: gemiye isabet "yarıçap + 0.7"
 * hücrede olduğu için çizim, öldürücü alanı dürüstçe gösterecek boyda.
 */
import type { Enemy } from '../engine/types';
import { speciesVisual } from './bestiary';
import { lighten, shade } from './palette';
import type { Gradient, Point, Shape } from './shapes';

const TAU = Math.PI * 2;
/** Kontur rengi: koyu mürdüm, her dokuda okunur. */
const INK = '#160a20';
/** Ana kontur ve ince kontur kalınlığı (hücre). */
const LINE = 0.26;
const FINE = 0.15;

type Mood = 'calm' | 'angry' | 'mad';

// ------------------------------------------------------------------- geometri

function rotate(points: Point[], angle: number, cx: number, cy: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  });
}

function ellipse(cx: number, cy: number, rx: number, ry: number, rotation = 0, segments = 18): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * TAU;
    points.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return rotation === 0 ? points : rotate(points, rotation, cx, cy);
}

function polygon(cx: number, cy: number, radius: number, sides: number, rotation: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * TAU;
    points.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
  }
  return points;
}

/** Nefes alan organik kontur. */
function blob(cx: number, cy: number, radius: number, time: number, wobble: number, lobes = 3, segments = 20): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * TAU;
    const r = radius * (1 + Math.sin(a * lobes + time * 2) * wobble);
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return points;
}

/** Dikenli taç: sivri uçlar ile iç çember arasında gidip gelen çokgen. */
function spikes(cx: number, cy: number, inner: number, count: number, length: number, rotation: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count * 2; i++) {
    const a = rotation + (i / (count * 2)) * TAU;
    const r = i % 2 === 0 ? inner + length : inner;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return points;
}

/** Yuvarlak uçlu kapsül, verilen yöne uzanır. */
function capsule(cx: number, cy: number, length: number, radius: number, angle: number): Point[] {
  const points: Point[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI - Math.PI / 2;
    points.push({ x: cx + length / 2 + Math.cos(t) * radius, y: cy + Math.sin(t) * radius });
  }
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI + Math.PI / 2;
    points.push({ x: cx - length / 2 + Math.cos(t) * radius, y: cy + Math.sin(t) * radius });
  }
  return rotate(points, angle, cx, cy);
}

/** Dalgalı kol yolu (kamçı, dokunaç, boyun). */
function wavy(x0: number, y0: number, angle: number, length: number, amplitude: number, phase: number, steps = 7): Point[] {
  const points: Point[] = [];
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sway = Math.sin(phase + t * 4) * amplitude * t;
    points.push({
      x: x0 + Math.cos(angle) * length * t + nx * sway,
      y: y0 + Math.sin(angle) * length * t + ny * sway,
    });
  }
  return points;
}

function lookAt(from: Point, target?: Point): Point {
  if (!target) return { x: 0, y: 0.3 };
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

// ------------------------------------------------------------------ boyama

/** Sol üstten ışık alan hacim degradesi. */
function volume(cx: number, cy: number, r: number, color: string, light = 0.42, dark = 0.34): Gradient {
  return {
    cx,
    cy,
    r: r * 1.1,
    fx: cx - r * 0.38,
    fy: cy - r * 0.42,
    from: lighten(color, light),
    to: shade(color, dark),
  };
}

function orb(cx: number, cy: number, r: number, color: string, line = LINE): Shape {
  return { kind: 'circle', x: cx, y: cy, r, color, gradient: volume(cx, cy, r, color), stroke: INK, strokeWidth: line };
}

function solid(points: Point[], cx: number, cy: number, r: number, color: string, line = LINE): Shape {
  return { kind: 'poly', points, color, gradient: volume(cx, cy, r, color), stroke: INK, strokeWidth: line };
}

/** Parlama: sol üstte beyaz bir yay ve küçük bir nokta. */
function shine(cx: number, cy: number, r: number, strength = 0.75): Shape[] {
  return [
    { kind: 'poly', points: ellipse(cx - r * 0.36, cy - r * 0.44, r * 0.3, r * 0.16, -0.65, 12), color: '#ffffff', alpha: strength },
    { kind: 'circle', x: cx - r * 0.02, y: cy - r * 0.62, r: r * 0.08, color: '#ffffff', alpha: strength },
  ];
}

/** Zemine düşen yumuşak gölge: düşmanı dokudan ayırır. */
function shadow(cx: number, cy: number, r: number): Shape {
  return { kind: 'poly', points: ellipse(cx + r * 0.14, cy + r * 0.78, r * 0.95, r * 0.36, 0, 14), color: '#000000', alpha: 0.3 };
}

/** Konturlu kol: önce kalın koyu çizgi, üstüne renkli çekirdek. */
function tube(points: Point[], width: number, color: string): Shape[] {
  return [
    { kind: 'poly', points, open: true, color: INK, stroke: INK, strokeWidth: width + LINE * 1.7 },
    { kind: 'poly', points, open: true, color, stroke: color, strokeWidth: width },
  ];
}

/** Kapalı halka çizgisi (patron aurası, halka gövde). */
function loop(cx: number, cy: number, r: number, segments = 24): Point[] {
  const points = polygon(cx, cy, r, segments, 0);
  points.push(points[0]);
  return points;
}

/**
 * Çizgi film gözü: konturlu ak, (varsa) renkli iris, bakışa kayan bebek,
 * parlama. Kızgın gözün üstünde merkeze doğru eğilen kalın kaş olur.
 * side: -1 sol göz, 1 sağ göz, 0 tek göz.
 */
function eye(cx: number, cy: number, r: number, look: Point, mood: Mood, side: number, iris?: string): Shape[] {
  const px = cx + look.x * r * 0.34;
  const py = cy + look.y * r * 0.34;
  const shapes: Shape[] = [{ kind: 'circle', x: cx, y: cy, r, color: '#ffffff', stroke: INK, strokeWidth: FINE }];
  if (iris) shapes.push({ kind: 'circle', x: px, y: py, r: r * 0.64, color: iris, stroke: INK, strokeWidth: FINE * 0.6 });
  shapes.push(
    { kind: 'circle', x: px, y: py, r: r * (iris ? 0.34 : 0.52), color: INK },
    { kind: 'circle', x: px - r * 0.2, y: py - r * 0.24, r: r * 0.17, color: '#ffffff' }
  );

  if (mood !== 'calm') {
    const drop = mood === 'mad' ? 0.55 : 0.32;
    const width = r * 0.34;
    if (side === 0) {
      shapes.push({
        kind: 'poly',
        open: true,
        points: [
          { x: cx - r * 1.05, y: cy - r * 1.2 },
          { x: cx, y: cy - r * (1.2 - drop) },
          { x: cx + r * 1.05, y: cy - r * 1.2 },
        ],
        color: INK,
        stroke: INK,
        strokeWidth: width,
      });
    } else {
      // Kaşın iç ucu (burna yakın olan) aşağıda: öfkeli bakış.
      shapes.push({
        kind: 'poly',
        open: true,
        points: [
          { x: cx - side * r * 1.0, y: cy - r * 1.28 },
          { x: cx + side * r * 0.75, y: cy - r * (1.28 - drop) },
        ],
        color: INK,
        stroke: INK,
        strokeWidth: width,
      });
    }
  }
  return shapes;
}

/** Sırıtan ağız: koyu iç, üstte beyaz dişler. */
function grin(cx: number, cy: number, width: number, depth: number, teethCount: number): Shape[] {
  const mouth: Point[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    mouth.push({ x: cx - width / 2 + width * t, y: cy + Math.sin(Math.PI * t) * depth });
  }
  mouth.push({ x: cx + width / 2, y: cy });
  const shapes: Shape[] = [{ kind: 'poly', points: mouth, color: '#3a0714', stroke: INK, strokeWidth: FINE }];
  const step = width / teethCount;
  for (let i = 0; i < teethCount; i++) {
    const x = cx - width / 2 + step * (i + 0.5);
    shapes.push({
      kind: 'poly',
      points: [
        { x: x - step * 0.42, y: cy },
        { x: x + step * 0.42, y: cy },
        { x, y: cy + depth * 0.55 },
      ],
      color: '#ffffff',
      stroke: INK,
      strokeWidth: FINE * 0.5,
    });
  }
  return shapes;
}

/** Sakin gülümseme: koyu bir yay çizgisi. */
function smile(cx: number, cy: number, width: number): Shape {
  const points: Point[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    points.push({ x: cx - width / 2 + width * t, y: cy + Math.sin(Math.PI * t) * width * 0.28 });
  }
  return { kind: 'poly', points, open: true, color: INK, stroke: INK, strokeWidth: FINE };
}

// ------------------------------------------------------------------ aileler

type Draw = (e: Enemy, R: number, c: string, look: Point) => Shape[];

/** Salkım (stafilokok): konturlu kürelerden üzüm salkımı, ortada yüz. */
const cluster: Draw = (e, R, c, look) => {
  const shapes: Shape[] = [shadow(e.x, e.y, R)];
  for (let i = 0; i < 4; i++) {
    const a = e.spin * 0.25 + Math.PI / 4 + (i / 4) * TAU;
    const x = e.x + Math.cos(a) * R * 0.5;
    const y = e.y + Math.sin(a) * R * 0.5;
    shapes.push(orb(x, y, R * 0.46, shade(c, 0.08)), ...shine(x, y, R * 0.46, 0.55));
  }
  const core = R * 0.52;
  shapes.push(
    orb(e.x, e.y, core, c),
    ...shine(e.x, e.y, core),
    ...eye(e.x - core * 0.36, e.y - core * 0.12, core * 0.3, look, 'calm', -1),
    ...eye(e.x + core * 0.36, e.y - core * 0.12, core * 0.3, look, 'calm', 1),
    smile(e.x, e.y + core * 0.38, core * 0.6)
  );
  return shapes;
};

/** Çubuk basil: kapsül gövde, dalgalanan kamçılar, tek öfkeli göz. */
const rod: Draw = (e, R, c, look) => {
  const h = e.heading;
  const back = { x: e.x - Math.cos(h) * R * 1.0, y: e.y - Math.sin(h) * R * 1.0 };
  const shapes: Shape[] = [shadow(e.x, e.y, R)];
  for (const offset of [-0.4, 0, 0.4]) {
    shapes.push(...tube(wavy(back.x, back.y, h + Math.PI + offset, R * 1.3, R * 0.22, e.spin * 6 + offset * 3), R * 0.1, shade(c, 0.15)));
  }
  shapes.push(solid(capsule(e.x, e.y, R * 1.9, R * 0.56, h), e.x, e.y, R, c));
  for (const k of [-0.35, 0.15]) {
    shapes.push({
      kind: 'poly',
      points: ellipse(e.x + Math.cos(h) * R * k, e.y + Math.sin(h) * R * k, R * 0.18, R * 0.12, h, 10),
      color: shade(c, 0.4),
      alpha: 0.55,
    });
  }
  shapes.push(
    { kind: 'poly', points: capsule(e.x - Math.sin(h) * -R * 0.22, e.y + Math.cos(h) * -R * 0.22, R * 1.2, R * 0.1, h), color: '#ffffff', alpha: 0.5 },
    ...eye(e.x + Math.cos(h) * R * 0.62, e.y + Math.sin(h) * R * 0.62, R * 0.32, look, 'angry', 0)
  );
  return shapes;
};

/** Spiral: helezon gövde, dış uçta dişli baş. */
const coil: Draw = (e, R, c, look) => {
  const path: Point[] = [];
  const steps = 22;
  let head = { x: e.x, y: e.y };
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = e.spin * 0.7 + t * TAU * 1.2;
    const radius = R * (0.2 + 0.72 * t);
    head = { x: e.x + Math.cos(a) * radius, y: e.y + Math.sin(a) * radius };
    path.push(head);
  }
  const shapes: Shape[] = [
    shadow(e.x, e.y, R),
    ...tube(path, R * 0.36, c),
    { kind: 'poly', points: path, open: true, color: lighten(c, 0.45), stroke: lighten(c, 0.45), strokeWidth: R * 0.1, alpha: 0.7 },
  ];
  const size = R * 0.42;
  shapes.push(
    orb(head.x, head.y, size, c),
    ...eye(head.x - size * 0.38, head.y - size * 0.15, size * 0.34, look, 'angry', -1),
    ...eye(head.x + size * 0.38, head.y - size * 0.15, size * 0.34, look, 'angry', 1),
    ...grin(head.x, head.y + size * 0.3, size * 0.9, size * 0.4, 3)
  );
  return shapes;
};

/** Solucan: kıvrılan kalın gövde, halka izleri, dişli baş. */
const worm: Draw = (e, R, c, look) => {
  const h = e.heading;
  const nx = -Math.sin(h);
  const ny = Math.cos(h);
  const path: Point[] = [];
  const segments = 9;
  for (let i = segments; i >= 0; i--) {
    const along = R * 0.3 * i;
    const sway = Math.sin(e.spin * 2.2 - i * 0.8) * R * 0.32 * (i / segments);
    path.push({ x: e.x - Math.cos(h) * along + nx * sway, y: e.y - Math.sin(h) * along + ny * sway });
  }
  const shapes: Shape[] = [shadow(e.x - Math.cos(h) * R * 0.8, e.y - Math.sin(h) * R * 0.8, R * 1.2), ...tube(path, R * 0.62, c)];
  // Gövde halkaları: gövdeye dik kısa koyu çizgiler.
  for (let i = 2; i < segments; i += 2) {
    const p = path[segments - i];
    shapes.push({
      kind: 'poly',
      open: true,
      points: [
        { x: p.x + nx * R * 0.28, y: p.y + ny * R * 0.28 },
        { x: p.x - nx * R * 0.28, y: p.y - ny * R * 0.28 },
      ],
      color: shade(c, 0.45),
      stroke: shade(c, 0.45),
      strokeWidth: FINE,
    });
  }
  const size = R * 0.6;
  shapes.push(
    orb(e.x, e.y, size, c),
    ...shine(e.x, e.y, size),
    ...eye(e.x - size * 0.36, e.y - size * 0.22, size * 0.3, look, 'angry', -1),
    ...eye(e.x + size * 0.36, e.y - size * 0.22, size * 0.3, look, 'angry', 1),
    ...grin(e.x, e.y + size * 0.3, size * 1.0, size * 0.45, 4)
  );
  return shapes;
};

/** Dikenli yıldız: sivri uçlu gövde, tek dev göz. */
const star: Draw = (e, R, c, look) => {
  const points = spikes(e.x, e.y, R * 0.52, 6, R * 0.58, e.spin * 0.6);
  return [
    shadow(e.x, e.y, R),
    solid(points, e.x, e.y, R, c),
    ...shine(e.x, e.y, R * 0.6),
    ...eye(e.x, e.y + R * 0.04, R * 0.3, look, 'angry', 0),
  ];
};

/** Halka: ortası boş kalın halka, üstünde boncuklar ve iki küçük göz. */
const ring: Draw = (e, R, c, look) => {
  const path = loop(e.x, e.y, R * 0.66, 28);
  const shapes: Shape[] = [
    { kind: 'poly', points: loop(e.x + R * 0.12, e.y + R * 0.18, R * 0.66, 20), open: true, color: '#000000', stroke: '#000000', strokeWidth: R * 0.4, alpha: 0.28 },
    ...tube(path, R * 0.44, c),
  ];
  // Işık alan üst sol yay.
  const arc: Point[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.55;
    arc.push({ x: e.x + Math.cos(a) * R * 0.66, y: e.y + Math.sin(a) * R * 0.66 });
  }
  shapes.push({ kind: 'poly', points: arc, open: true, color: '#ffffff', stroke: '#ffffff', strokeWidth: R * 0.1, alpha: 0.6 });
  for (let i = 0; i < 4; i++) {
    const a = e.spin * 0.5 + Math.PI * 0.25 + (i / 4) * TAU;
    shapes.push(orb(e.x + Math.cos(a) * R * 0.66, e.y + Math.sin(a) * R * 0.66, R * 0.13, shade(c, 0.3), FINE));
  }
  shapes.push(
    ...eye(e.x - R * 0.2, e.y - R * 0.66, R * 0.2, look, 'calm', -1),
    ...eye(e.x + R * 0.2, e.y - R * 0.66, R * 0.2, look, 'calm', 1)
  );
  return shapes;
};

/** Mızrak: gittiği yöne bakan ok ucu, tek göz. */
const dart: Draw = (e, R, c, look) => {
  const h = e.heading;
  const body = rotate(
    [
      { x: e.x + R * 1.2, y: e.y },
      { x: e.x - R * 0.85, y: e.y - R * 0.9 },
      { x: e.x - R * 0.35, y: e.y },
      { x: e.x - R * 0.85, y: e.y + R * 0.9 },
    ],
    h,
    e.x,
    e.y
  );
  const facet = rotate(
    [
      { x: e.x + R * 1.0, y: e.y - R * 0.06 },
      { x: e.x - R * 0.7, y: e.y - R * 0.74 },
      { x: e.x - R * 0.28, y: e.y - R * 0.08 },
    ],
    h,
    e.x,
    e.y
  );
  const eyeAt = rotate([{ x: e.x + R * 0.2, y: e.y }], h, e.x, e.y)[0];
  return [
    shadow(e.x, e.y, R),
    solid(body, e.x, e.y, R, c),
    { kind: 'poly', points: facet, color: '#ffffff', alpha: 0.28 },
    ...eye(eyeAt.x, eyeAt.y, R * 0.28, look, 'mad', 0),
  ];
};

/** Çarpı: dönen dört kavisli bıçak, ortada göz. */
const cross: Draw = (e, R, c, look) => {
  const shapes: Shape[] = [shadow(e.x, e.y, R)];
  for (let i = 0; i < 4; i++) {
    const a = e.spin * 1.1 + (i / 4) * TAU;
    const at = (angle: number, r: number) => ({ x: e.x + Math.cos(angle) * r, y: e.y + Math.sin(angle) * r });
    const blade = [at(a - 0.42, R * 0.3), at(a + 0.05, R * 0.95), at(a + 0.32, R * 1.25), at(a + 0.52, R * 0.72), at(a + 0.5, R * 0.3)];
    shapes.push(solid(blade, e.x, e.y, R, c));
  }
  shapes.push(orb(e.x, e.y, R * 0.42, shade(c, 0.2)), ...eye(e.x, e.y, R * 0.25, look, 'angry', 0));
  return shapes;
};

/** Denizanası: saydam çan, fırfırlı etek, dalgalanan kollar. */
const jelly: Draw = (e, R, c, look) => {
  const shapes: Shape[] = [shadow(e.x, e.y + R * 0.4, R)];
  for (let i = 0; i < 5; i++) {
    const x = e.x + (i - 2) * R * 0.28;
    shapes.push(...tube(wavy(x, e.y + R * 0.15, Math.PI / 2, R * 1.45, R * 0.2, e.spin * 3 + i * 1.3), R * 0.12, shade(c, 0.1)));
  }
  const bell: Point[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI;
    bell.push({ x: e.x + Math.cos(a) * R * 0.95, y: e.y + R * 0.2 + Math.sin(a) * R * 1.0 });
  }
  // Fırfırlı alt kenar.
  for (let i = 6; i >= 0; i--) {
    const t = i / 6;
    bell.push({ x: e.x - R * 0.95 + R * 1.9 * t, y: e.y + R * 0.2 + (i % 2 === 0 ? R * 0.18 : 0) });
  }
  shapes.push(
    { kind: 'poly', points: bell, color: c, gradient: volume(e.x, e.y - R * 0.2, R, c, 0.5, 0.2), stroke: INK, strokeWidth: LINE, alpha: 0.92 },
    { kind: 'poly', points: ellipse(e.x, e.y - R * 0.12, R * 0.42, R * 0.3, 0, 12), color: shade(c, 0.25), alpha: 0.45 },
    ...shine(e.x, e.y - R * 0.2, R),
    ...eye(e.x - R * 0.34, e.y - R * 0.02, R * 0.21, look, 'calm', -1),
    ...eye(e.x + R * 0.34, e.y - R * 0.02, R * 0.21, look, 'calm', 1)
  );
  return shapes;
};

/** Kristal: köşeli mücevher gövde, yüz çizgileri, parıltı, çekik gözler. */
const crystal: Draw = (e, R, c, look) => {
  const points: Point[] = [];
  for (let i = 0; i < 7; i++) {
    const a = e.spin * 0.25 + (i / 7) * TAU;
    const r = R * (0.78 + ((i * 37) % 9) / 26);
    points.push({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r });
  }
  const shapes: Shape[] = [
    shadow(e.x, e.y, R),
    { kind: 'poly', points, color: c, gradient: volume(e.x, e.y, R, c, 0.6, 0.3), stroke: INK, strokeWidth: LINE },
  ];
  for (const k of [0, 2, 4]) {
    shapes.push({
      kind: 'poly',
      open: true,
      points: [{ x: e.x + R * 0.05, y: e.y - R * 0.05 }, points[k]],
      color: lighten(c, 0.55),
      stroke: lighten(c, 0.55),
      strokeWidth: FINE,
      alpha: 0.75,
    });
  }
  const gx = e.x - R * 0.42;
  const gy = e.y - R * 0.45;
  shapes.push(
    { kind: 'poly', points: spikes(gx, gy, R * 0.06, 4, R * 0.16, 0.3), color: '#ffffff', alpha: 0.9 },
    ...eye(e.x - R * 0.26, e.y + R * 0.08, R * 0.19, look, 'mad', -1),
    ...eye(e.x + R * 0.26, e.y + R * 0.08, R * 0.19, look, 'mad', 1)
  );
  return shapes;
};

/** Faj: altıgen baş, kılıf, eklemli ince bacaklar, tek göz. */
const phage: Draw = (e, R, c, look) => {
  const h = e.heading;
  const at = (along: number, side = 0) => ({
    x: e.x + Math.cos(h) * along - Math.sin(h) * side,
    y: e.y + Math.sin(h) * along + Math.cos(h) * side,
  });
  const base = at(-R * 0.7);
  const shapes: Shape[] = [shadow(e.x, e.y, R)];
  // Altı eklemli bacak: kılıfın dibinden yana açılır, dizden geriye kırılır.
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const k = (i % 3) - 1;
    const kick = Math.sin(e.spin * 5 + i) * R * 0.08;
    const knee = at(-R * 0.7 + k * R * 0.28, side * R * 0.62);
    const foot = at(-R * 1.15 + k * R * 0.35 + kick, side * R * 0.88);
    shapes.push(...tube([base, knee, foot], R * 0.08, shade(c, 0.2)));
  }
  const headAt = at(R * 0.3);
  const head = polygon(headAt.x, headAt.y, R * 0.66, 6, h);
  shapes.push(
    solid(capsule(at(-R * 0.3).x, at(-R * 0.3).y, R * 0.8, R * 0.16, h), e.x, e.y, R * 0.5, shade(c, 0.15), FINE),
    solid(head, headAt.x, headAt.y, R * 0.66, c)
  );
  for (const k of [0, 2, 4]) {
    shapes.push({
      kind: 'poly',
      open: true,
      points: [headAt, head[k]],
      color: lighten(c, 0.4),
      stroke: lighten(c, 0.4),
      strokeWidth: FINE * 0.8,
      alpha: 0.7,
    });
  }
  shapes.push(...eye(headAt.x, headAt.y, R * 0.3, look, 'angry', 0));
  return shapes;
};

/** Amip: yalancı ayaklı blob, görünen çekirdek. */
const amoeba: Draw = (e, R, c, look) => [
  shadow(e.x, e.y, R),
  { kind: 'poly', points: blob(e.x, e.y, R * 0.9, e.spin, 0.24, 3), color: c, gradient: volume(e.x, e.y, R, c, 0.45, 0.25), stroke: INK, strokeWidth: LINE, alpha: 0.93 },
  orb(e.x + R * 0.28, e.y + R * 0.22, R * 0.26, shade(c, 0.35), FINE),
  ...shine(e.x, e.y, R * 0.85),
  ...eye(e.x - R * 0.26, e.y - R * 0.2, R * 0.23, look, 'calm', -1),
  ...eye(e.x + R * 0.2, e.y - R * 0.28, R * 0.19, look, 'calm', 1),
];

/** Patron aurası: yavaşça atan ince halka. */
function aura(e: Enemy, R: number, c: string): Shape {
  const pulse = 1.1 + Math.sin(e.spin * 1.5) * 0.06;
  return { kind: 'poly', points: loop(e.x, e.y, R * pulse, 32), open: true, color: c, stroke: c, strokeWidth: R * 0.08, alpha: 0.45 };
}

/** Patron: dişli dev ağız, dikenli taç, sarı irisli öfkeli gözler. */
const maw: Draw = (e, R, c, look) => {
  const shapes: Shape[] = [
    shadow(e.x, e.y, R),
    aura(e, R, c),
    solid(spikes(e.x, e.y, R * 0.8, 11, R * 0.3, -e.spin * 0.4), e.x, e.y, R, shade(c, 0.2)),
    orb(e.x, e.y, R * 0.82, c),
    ...shine(e.x, e.y, R * 0.82),
    ...eye(e.x - R * 0.3, e.y - R * 0.26, R * 0.2, look, 'mad', -1, '#ffd24a'),
    ...eye(e.x + R * 0.3, e.y - R * 0.26, R * 0.2, look, 'mad', 1, '#ffd24a'),
    ...grin(e.x, e.y + R * 0.1, R * 1.05, R * 0.46, 6),
  ];
  return shapes;
};

/** Patron: kan çanağı dev göz, kirpik tacı, periyodik kırpma. */
const eyeBoss: Draw = (e, R, c, look) => {
  const ball = R * 0.86;
  // Arada bir, kısacık göz kırpar (döngünün ~%5'i).
  const blink = Math.max(0, Math.sin(e.spin * 0.9)) ** 60;
  const shapes: Shape[] = [
    shadow(e.x, e.y, R),
    aura(e, R, c),
    solid(spikes(e.x, e.y, R * 0.86, 14, R * 0.32, e.spin * 0.35), e.x, e.y, R, shade(c, 0.1)),
    {
      kind: 'circle',
      x: e.x,
      y: e.y,
      r: ball,
      color: '#fff3f6',
      gradient: { cx: e.x, cy: e.y, r: ball * 1.1, fx: e.x - ball * 0.3, fy: e.y - ball * 0.35, from: '#ffffff', to: '#f0b8c8' },
      stroke: INK,
      strokeWidth: LINE,
    },
  ];
  for (let i = 0; i < 5; i++) {
    const a = 0.4 + i * 1.25;
    shapes.push({
      kind: 'poly',
      open: true,
      points: wavy(e.x + Math.cos(a) * ball * 0.95, e.y + Math.sin(a) * ball * 0.95, a + Math.PI, ball * 0.42, ball * 0.08, i),
      color: '#d0304a',
      stroke: '#d0304a',
      strokeWidth: FINE * 0.8,
      alpha: 0.7,
    });
  }
  const ix = e.x + look.x * ball * 0.3;
  const iy = e.y + look.y * ball * 0.3;
  shapes.push(
    { kind: 'circle', x: ix, y: iy, r: ball * 0.46, color: c, gradient: volume(ix, iy, ball * 0.46, c, 0.35, 0.4), stroke: INK, strokeWidth: FINE },
    { kind: 'circle', x: ix, y: iy, r: ball * 0.22, color: INK },
    { kind: 'circle', x: ix - ball * 0.12, y: iy - ball * 0.14, r: ball * 0.09, color: '#ffffff' }
  );
  if (blink > 0.02) {
    // Göz kapağı yukarıdan iner.
    const lid: Point[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      lid.push({ x: e.x + Math.cos(a) * ball, y: e.y + Math.sin(a) * ball });
    }
    const edge = e.y - ball + ball * 2 * blink;
    for (let i = 12; i >= 0; i--) {
      const t = i / 12;
      lid.push({ x: e.x - ball + ball * 2 * t, y: edge - Math.sin(Math.PI * t) * ball * 0.2 * (1 - blink) });
    }
    shapes.push(solid(lid, e.x, e.y - ball * 0.5, ball, c));
  }
  return shapes;
};

/** Patron: üç başlı; boyunlar kıvrılır, başlar gemiye döner. */
const hydra: Draw = (e, R, c, look) => {
  const shapes: Shape[] = [shadow(e.x, e.y, R), aura(e, R, c)];
  const base = Math.atan2(look.y, look.x);
  const heads: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const a = base + (i - 1) * 1.05 + Math.sin(e.spin * 1.3 + i * 2) * 0.15;
    const neck = wavy(e.x, e.y, a, R * 1.0, R * 0.16, e.spin * 2 + i, 6);
    heads.push(neck[neck.length - 1]);
    shapes.push(...tube(neck, R * 0.26, shade(c, 0.12)));
  }
  // Gövde küçük ve pullu: gözü başlara çeksin.
  shapes.push(orb(e.x, e.y, R * 0.5, shade(c, 0.1)));
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.7;
    shapes.push({
      kind: 'poly',
      open: true,
      points: [
        { x: e.x + Math.cos(a - 0.3) * R * 0.3, y: e.y + Math.sin(a - 0.3) * R * 0.3 },
        { x: e.x + Math.cos(a) * R * 0.18, y: e.y + Math.sin(a) * R * 0.18 },
        { x: e.x + Math.cos(a + 0.3) * R * 0.3, y: e.y + Math.sin(a + 0.3) * R * 0.3 },
      ],
      color: shade(c, 0.45),
      stroke: shade(c, 0.45),
      strokeWidth: FINE,
    });
  }
  for (const head of heads) {
    const size = R * 0.42;
    shapes.push(
      orb(head.x, head.y, size, c),
      ...shine(head.x, head.y, size, 0.6),
      ...eye(head.x, head.y - size * 0.2, size * 0.36, look, 'mad', 0, '#ffd24a'),
      ...grin(head.x, head.y + size * 0.22, size * 1.05, size * 0.46, 3)
    );
  }
  return shapes;
};

/** Patron: dikenli taç/mayın, kedi gözü gibi parlayan çekirdek. */
const crown: Draw = (e, R, c) => {
  const shapes: Shape[] = [shadow(e.x, e.y, R), aura(e, R, c)];
  for (let i = 0; i < 6; i++) {
    const a = e.spin * 0.4 + (i / 6) * TAU;
    const tip = { x: e.x + Math.cos(a) * R * 1.22, y: e.y + Math.sin(a) * R * 1.22 };
    const left = { x: e.x + Math.cos(a - 0.36) * R * 0.6, y: e.y + Math.sin(a - 0.36) * R * 0.6 };
    const right = { x: e.x + Math.cos(a + 0.36) * R * 0.6, y: e.y + Math.sin(a + 0.36) * R * 0.6 };
    shapes.push(solid([tip, left, right], e.x, e.y, R, shade(c, 0.15)));
  }
  const glow = 0.85 + Math.sin(e.spin * 2) * 0.15;
  shapes.push(
    solid(polygon(e.x, e.y, R * 0.7, 8, e.spin * 0.4 + Math.PI / 8), e.x, e.y, R * 0.7, c),
    { kind: 'circle', x: e.x, y: e.y, r: R * 0.42, color: shade(c, 0.5), stroke: INK, strokeWidth: FINE },
    {
      kind: 'circle',
      x: e.x,
      y: e.y,
      r: R * 0.3 * glow,
      color: '#ffe066',
      gradient: { cx: e.x, cy: e.y, r: R * 0.3, from: '#ffffff', to: '#ffb03d' },
      stroke: INK,
      strokeWidth: FINE * 0.7,
    },
    { kind: 'poly', points: ellipse(e.x, e.y, R * 0.07, R * 0.24, 0, 12), color: INK }
  );
  return shapes;
};

const FAMILIES: Record<string, Draw> = {
  cluster,
  rod,
  coil,
  worm,
  star,
  ring,
  dart,
  cross,
  jelly,
  crystal,
  phage,
  amoeba,
  maw,
  eye: eyeBoss,
  hydra,
  crown,
};

/** Normal türlerin ve patronların görsel/çarpışma yarıçapı oranı. */
export const VISUAL_SCALE = { minion: 1.45, boss: 1.25 } as const;

/** Düşmanın o bölümdeki çizimi: tür kimliğinden siluet, renk ve ifade gelir. */
export function enemyShapes(enemy: Enemy, target?: Point): Shape[] {
  const monster = speciesVisual(enemy.species);
  const R = enemy.radius * (enemy.kind === 'boss' ? VISUAL_SCALE.boss : VISUAL_SCALE.minion);
  const look = lookAt({ x: enemy.x, y: enemy.y }, target);
  return FAMILIES[monster.family](enemy, R, monster.color, look);
}
