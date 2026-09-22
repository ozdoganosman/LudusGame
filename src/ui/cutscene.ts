/**
 * Bölüm geçişi ara sahnesi. Bir tıbbi tarama ekranında insan silueti: gemi
 * temizlenen organdan sıradakine yol alır, hedef organ nabız gibi atar, adı
 * daktiloyla yazılır. Kısa ve atlanabilir.
 *
 * Renderdan bağımsız: sahne 100×160 birimlik bir tuvalde şekil ve yazı olarak
 * üretilir; web ve mobil bunu ekrana sığdırıp çizer.
 */
import { CAMPAIGN_LENGTH } from '../engine/campaign';
import { shipShapes } from './creatures';
import { transformShapes } from './shapes';
import type { Point, Shape } from './shapes';
import { missionFor, missionProgress } from './story';
import { tissueTheme } from './tissues';

export const SCENE_W = 100;
export const SCENE_H = 160;
/** Ara sahnenin süresi (saniye). */
export const CUTSCENE_LENGTH = 3.4;

export type SceneText = {
  /** Sahne birimi; yazı bu noktaya ortalanır. */
  x: number;
  y: number;
  text: string;
  /** Yazı boyu (sahne birimi). */
  size: number;
  color: string;
  alpha: number;
  bold: boolean;
};

export type CutsceneFrame = { shapes: Shape[]; texts: SceneText[]; done: boolean };

const BACKDROP = '#07040f';
const SKIN = '#1a1335';
const SKIN_EDGE = '#5a48a0';
const HEALED = '#3ff0c0';
const INFECTED = '#7a2038';
const TARGET = '#ff3d6e';

/** Organların vücut haritasındaki yerleri (bölüm sırasıyla). */
const ORGANS: Point[] = [
  { x: 79, y: 94 }, // kılcal damar — sağ parmak ucu
  { x: 50, y: 45 }, // soluk borusu
  { x: 42, y: 52 }, // akciğer
  { x: 56, y: 68 }, // mide astarı
  { x: 29, y: 64 }, // kan dolaşımı — kol atardamarı
  { x: 52.6, y: 39 }, // lenf düğümü — boyun
  { x: 41, y: 104 }, // kemik iliği — uyluk
  { x: 43, y: 69 }, // karaciğer
  { x: 59, y: 78 }, // böbrek
  { x: 54, y: 56 }, // kalp kapağı
  { x: 50, y: 82 }, // omurilik
  { x: 50, y: 34 }, // beyin sapı
];
const MUTATION_POINT: Point = { x: 50, y: 26 };
/** Hikâyenin başı: enjektör sağ elin yanında. */
const INJECTION: Point = { x: 89, y: 111 };

/** Bölümün haritadaki noktası; kampanya sonrası dalgalar beyinde. */
export function organPoint(index: number): Point {
  if (index > CAMPAIGN_LENGTH) return MUTATION_POINT;
  return ORGANS[Math.max(1, Math.floor(index)) - 1];
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Siluetin sağ yarısı (boyundan kasığa, saat yönünde); sol yarı aynası.
 * Tek kapalı çokgen: omuz, kol ve bacak çizgileri birbirini kesmez.
 */
const RIGHT_HALF: Point[] = [
  { x: 53.2, y: 33 },
  { x: 53.6, y: 39.5 },
  { x: 58, y: 41.4 },
  { x: 63.5, y: 42.4 },
  { x: 67.4, y: 44.4 },
  { x: 69.4, y: 48 },
  { x: 70.8, y: 56 },
  { x: 73.2, y: 66 },
  { x: 76.2, y: 78 },
  { x: 78.2, y: 87.5 },
  { x: 80.4, y: 90.5 },
  { x: 81.2, y: 94.5 },
  { x: 79.8, y: 97.6 },
  { x: 77.6, y: 97 },
  { x: 76.4, y: 93.5 },
  { x: 74.8, y: 89 },
  { x: 71.6, y: 78.5 },
  { x: 68.4, y: 67 },
  { x: 66.2, y: 57 },
  { x: 65.2, y: 62 },
  { x: 63.6, y: 72 },
  { x: 64.6, y: 80 },
  { x: 65.2, y: 88 },
  { x: 64.6, y: 101 },
  { x: 63.6, y: 114 },
  { x: 63.2, y: 126 },
  { x: 63.6, y: 136 },
  { x: 66.4, y: 139 },
  { x: 66.2, y: 141.2 },
  { x: 58.4, y: 141.2 },
  { x: 58, y: 136 },
  { x: 57.4, y: 124 },
  { x: 55.8, y: 110 },
  { x: 53, y: 97 },
  { x: 50, y: 93 },
];

function silhouette(): Point[] {
  const left = RIGHT_HALF.slice(0, -1)
    .reverse()
    .map((point) => ({ x: SCENE_W - point.x, y: point.y }));
  return [...RIGHT_HALF, ...left];
}

function ring(cx: number, cy: number, r: number, color: string, width: number, alpha: number): Shape {
  const points: Point[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return { kind: 'poly', points, open: true, color, stroke: color, strokeWidth: width, alpha };
}

/** Sabit arka plan ve vücut silueti. */
function body(): Shape[] {
  const shapes: Shape[] = [
    // Tarayıcı ışığı: kenarında zemin rengine söner, sahnenin sınırı görünmez.
    {
      kind: 'circle',
      x: 50,
      y: 78,
      r: 82,
      color: BACKDROP,
      gradient: { cx: 50, cy: 78, r: 82, from: '#221550', to: BACKDROP },
    },
  ];
  // Tarayıcı ızgarası.
  for (let y = 10; y < SCENE_H; y += 10) {
    shapes.push({
      kind: 'poly',
      open: true,
      points: [
        { x: 4, y },
        { x: SCENE_W - 4, y },
      ],
      color: '#3a2d6e',
      stroke: '#3a2d6e',
      strokeWidth: 0.25,
      alpha: 0.45,
    });
  }
  const outline = silhouette();
  shapes.push(
    // Dış ışıma, siluet, iç parıltı.
    {
      kind: 'poly',
      points: outline,
      open: true,
      color: SKIN_EDGE,
      stroke: SKIN_EDGE,
      strokeWidth: 2.4,
      alpha: 0.18,
    },
    {
      kind: 'poly',
      points: outline,
      color: SKIN,
      gradient: { cx: 50, cy: 62, r: 70, from: '#2a1d58', to: SKIN },
      stroke: SKIN_EDGE,
      strokeWidth: 0.7,
    },
    {
      kind: 'circle',
      x: 50,
      y: 28.5,
      r: 7.6,
      color: SKIN,
      gradient: { cx: 50, cy: 28.5, r: 7.6, fx: 47.5, fy: 25.5, from: '#2e2160', to: SKIN },
      stroke: SKIN_EDGE,
      strokeWidth: 0.7,
    }
  );
  // Ana damar ağı: vücudun içinde olduğumuzu hissettirir.
  const vessel = (points: Point[]): Shape => ({
    kind: 'poly',
    points,
    open: true,
    color: '#8a2438',
    stroke: '#8a2438',
    strokeWidth: 0.7,
    alpha: 0.55,
  });
  shapes.push(
    vessel([{ x: 54, y: 56 }, { x: 50, y: 66 }, { x: 50, y: 88 }, { x: 44.5, y: 104 }, { x: 40.5, y: 122 }, { x: 39.5, y: 136 }]),
    vessel([{ x: 50, y: 88 }, { x: 55.5, y: 104 }, { x: 59.5, y: 122 }, { x: 60.5, y: 136 }]),
    vessel([{ x: 54, y: 56 }, { x: 65, y: 47 }, { x: 68.5, y: 57 }, { x: 70.7, y: 67 }, { x: 76.5, y: 90 }]),
    vessel([{ x: 54, y: 56 }, { x: 35, y: 47 }, { x: 31.5, y: 57 }, { x: 29.3, y: 67 }, { x: 23.5, y: 90 }]),
    vessel([{ x: 54, y: 56 }, { x: 51.5, y: 44 }, { x: 50, y: 32 }])
  );
  return shapes;
}

/** İkinci dereceden Bezier üzerinde nokta. */
function bezier(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/**
 * Ara sahnenin bir karesi.
 * @param from temizlenen bölüm (null: hikâyenin başı, enjektörden çıkış)
 * @param to gidilen bölüm
 * @param t sahne başından geçen süre (saniye)
 */
export function cutsceneFrame(from: number | null, to: number, t: number): CutsceneFrame {
  const shapes: Shape[] = [];
  const texts: SceneText[] = [];
  const fadeIn = clamp01(t / 0.4);
  const fadeOut = 1 - clamp01((t - (CUTSCENE_LENGTH - 0.4)) / 0.4);
  const alpha = Math.min(fadeIn, fadeOut);

  shapes.push(...body());

  // Tarama çizgisi: yukarıdan aşağı süzülür.
  const scanY = 20 + ((t * 45) % 125);
  shapes.push({
    kind: 'poly',
    open: true,
    points: [
      { x: 6, y: scanY },
      { x: SCENE_W - 6, y: scanY },
    ],
    color: HEALED,
    stroke: HEALED,
    strokeWidth: 0.5,
    alpha: 0.35,
  });

  // Kalp monitörü: başlığın altında kayan EKG çizgisi.
  const ecg: Point[] = [];
  for (let x = 16; x <= SCENE_W - 16; x += 0.5) {
    const d = ((((x - t * 30) % 26) + 26) % 26) - 13;
    const pulse = (center: number, width: number) => Math.exp(-((d - center) ** 2) / width);
    // R dalgası yukarı, S aşağı, T dalgası yayvan.
    ecg.push({ x, y: 16.5 - 3.4 * pulse(0.4, 0.08) + 1.4 * pulse(1.1, 0.06) - 0.8 * pulse(3.6, 0.6) });
  }
  shapes.push({ kind: 'poly', points: ecg, open: true, color: HEALED, stroke: HEALED, strokeWidth: 0.4, alpha: 0.7 });

  // Organ işaretleri: temizlenenler nane, hedef kırmızı nabız, kalanlar koyu.
  const target = organPoint(to);
  for (let index = 1; index <= CAMPAIGN_LENGTH; index++) {
    const point = organPoint(index);
    if (index === to) continue;
    const healed = index < to;
    shapes.push({
      kind: 'circle',
      x: point.x,
      y: point.y,
      r: healed ? 1.5 : 1.2,
      color: healed ? HEALED : INFECTED,
      stroke: '#07040f',
      strokeWidth: 0.35,
      alpha: healed ? 0.95 : 0.8,
    });
  }
  const beat = 0.5 + Math.sin(t * 7) * 0.5;
  const theme = tissueTheme(to);
  shapes.push(
    ring(target.x, target.y, 3 + beat * 1.2, TARGET, 0.5, 0.6),
    { kind: 'circle', x: target.x, y: target.y, r: 1.9, color: TARGET, stroke: '#07040f', strokeWidth: 0.35 }
  );
  // Varışta hedefte iyileşme halkaları.
  const arrival = clamp01((t - 2.2) / 0.9);
  if (arrival > 0) {
    for (let k = 0; k < 2; k++) {
      const p = clamp01(arrival - k * 0.3);
      if (p <= 0) continue;
      shapes.push(ring(target.x, target.y, 2 + p * 14, theme.healthyEdge, 0.8 * (1 - p) + 0.1, 1 - p));
    }
  }

  // Yol: başlangıçtan hedefe kavisli rota, gemi ilerledikçe kesikli iz bırakır.
  const start = from === null ? INJECTION : organPoint(from);
  const mid = { x: (start.x + target.x) / 2, y: (start.y + target.y) / 2 };
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const control = { x: mid.x - (dy / length) * 16, y: mid.y + (dx / length) * 16 };
  const travel = easeInOut(clamp01((t - 0.35) / 1.9));

  if (from === null) {
    // Enjektör: iğne, sıvı dolu gövde ve piston; ilaç gemiyle birlikte boşalır.
    const fill = 6.6 * (1 - travel);
    const line = (a: Point, b: Point, color: string, width: number): Shape => ({
      kind: 'poly',
      open: true,
      points: [a, b],
      color,
      stroke: color,
      strokeWidth: width,
    });
    shapes.push(
      line({ x: 89.4, y: 111.4 }, { x: 86.4, y: 108.6 }, '#e8eef8', 0.35),
      {
        kind: 'poly',
        points: [
          { x: 89, y: 112.6 },
          { x: 90.6, y: 111 },
          { x: 97.6, y: 118 },
          { x: 96, y: 119.6 },
        ],
        color: '#cfd8ea',
        alpha: 0.55,
        stroke: '#e8eef8',
        strokeWidth: 0.3,
      },
      {
        kind: 'poly',
        points: [
          { x: 89.4, y: 112.2 },
          { x: 90.2, y: 111.4 },
          { x: 90.2 + fill, y: 111.4 + fill },
          { x: 89.4 + fill, y: 112.2 + fill },
        ],
        color: HEALED,
        alpha: 0.85,
      },
      line({ x: 96.8, y: 118.8 }, { x: 99, y: 121 }, '#cfd8ea', 0.6),
      line({ x: 97.6, y: 122.4 }, { x: 100.4, y: 119.6 }, '#cfd8ea', 0.7)
    );
  }

  const dashes = 26;
  for (let i = 0; i < dashes; i++) {
    const a = i / dashes;
    const b = (i + 0.55) / dashes;
    if (a >= travel) break;
    shapes.push({
      kind: 'poly',
      open: true,
      points: [bezier(start, control, target, a), bezier(start, control, target, Math.min(b, travel))],
      color: HEALED,
      stroke: HEALED,
      strokeWidth: 0.6,
      alpha: 0.85,
    });
  }

  const at = bezier(start, control, target, travel);
  const ahead = bezier(start, control, target, Math.min(1, travel + 0.02));
  const angle = travel < 1 ? Math.atan2(ahead.y - at.y, ahead.x - at.x) : -Math.PI / 2;
  const ship = shipShapes({ x: at.x, y: at.y, angle, time: t, beaming: false });
  shapes.push(...transformShapes(ship, at.x, at.y, 1.7, 1));

  // Yazılar.
  const mission = missionFor(to);
  const typed = Math.floor(mission.name.length * clamp01((t - 1.0) / 1.2));
  texts.push(
    { x: 50, y: 10, text: from === null ? 'ENJEKSİYON' : 'SONRAKİ HEDEF', size: 4, color: '#a294cc', alpha, bold: true },
    { x: 50, y: 146, text: mission.name.slice(0, typed), size: 8, color: '#ffffff', alpha, bold: true },
    {
      x: 50,
      y: 154,
      text: `${missionProgress(to)} · ${mission.title}`,
      size: 4,
      color: '#c9bdf0',
      alpha: alpha * clamp01((t - 1.6) / 0.5),
      bold: false,
    }
  );

  // Genel solma: şekillerin saydamlığıyla birlikte.
  const faded = alpha >= 1 ? shapes : shapes.map((shape) => ({ ...shape, alpha: (shape.alpha ?? 1) * alpha }));
  return { shapes: faded, texts, done: t >= CUTSCENE_LENGTH };
}
