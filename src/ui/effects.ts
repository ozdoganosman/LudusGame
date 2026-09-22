/**
 * Oyun içi efektler: hapsolan ya da vurulan düşmanın yok oluşu. Renderdan
 * bağımsız — şekil listesi ve yazı etiketleri üretir; web ve mobil aynısını
 * çizer. Zaman oyun döngüsünden gelir (update), rastgelelik yok: parçacıklar
 * efekt kimliğinden türetilir.
 */
import type { Enemy } from '../engine/types';
import { speciesVisual } from './bestiary';
import { VISUAL_SCALE, enemyShapes } from './monsters';
import { lighten } from './palette';
import { transformShapes } from './shapes';
import type { Point, Shape } from './shapes';

const TAU = Math.PI * 2;
const INK = '#160a20';

/** Efekt süreleri (saniye). */
export const TRAP_LIFE = 1.15;
export const SHOT_LIFE = 0.7;

export type EffectLabel = {
  /** Hücre koordinatı (yazının merkezi). */
  x: number;
  y: number;
  text: string;
  /** Alt satır: "ZİNCİR ×3" gibi. */
  sub?: string;
  alpha: number;
  /** Açılış "zıplaması" için ölçek. */
  scale: number;
  color: string;
  /** Büyük yazı mı (hapsolma) küçük mü (vurulma). */
  big: boolean;
};

type Effect = {
  id: number;
  kind: 'trap' | 'shot';
  enemy: Enemy;
  color: string;
  age: number;
  life: number;
  text: string;
  sub?: string;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;
/** Yazı boyu (hücre): çizim tarafı da bu oranları kullanır. */
export const LABEL_SIZE = { big: 2.7, small: 2 };

/** Prim yazısının kapladığı yaklaşık kutu (hücre); alt satır dahil. */
export function labelBox(label: EffectLabel) {
  const size = (label.big ? LABEL_SIZE.big : LABEL_SIZE.small) * label.scale;
  const half = Math.max(label.text.length * size * 0.3, (label.sub?.length ?? 0) * size * 0.17);
  return {
    left: label.x - half,
    right: label.x + half,
    top: label.y - size * 0.5,
    bottom: label.y + (label.sub ? size * 1.15 : size * 0.5),
  };
}

/** Efekt ve parçacık kimliğinden 0..1 arası tekrarlanabilir sayı. */
function jitter(id: number, i: number): number {
  const value = Math.imul(id + 1, 0x27d4eb2d) ^ Math.imul(i + 7, 0x165667b1);
  return ((value ^ (value >>> 15)) >>> 0) / 0xffffffff;
}

function loop(cx: number, cy: number, r: number, segments = 28): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return points;
}

export class Effects {
  private items: Effect[] = [];
  private nextId = 1;

  /** Kapanan alanda kalan düşman: büyük patlama ve zincirli prim yazısı. */
  trapped(enemy: Enemy, points: number, chain: number): void {
    this.items.push({
      id: this.nextId++,
      kind: 'trap',
      enemy: { ...enemy },
      color: speciesVisual(enemy.species).color,
      age: -Math.max(0, chain - 1) * 0.08, // zincir sırayla patlasın
      life: TRAP_LIFE,
      text: `+${points.toLocaleString('tr-TR')}`,
      sub: chain > 1 ? `ZİNCİR ×${chain}` : undefined,
    });
  }

  /** Işın topuyla düşürülen düşman: küçük patlama. */
  shotDown(enemy: Enemy, points: number): void {
    this.items.push({
      id: this.nextId++,
      kind: 'shot',
      enemy: { ...enemy },
      color: speciesVisual(enemy.species).color,
      age: 0,
      life: SHOT_LIFE,
      text: `+${points.toLocaleString('tr-TR')}`,
    });
  }

  update(dt: number): void {
    if (this.items.length === 0) return;
    for (const item of this.items) item.age += dt;
    this.items = this.items.filter((item) => item.age < item.life);
  }

  clear(): void {
    this.items = [];
  }

  /** Oynayan efekt var mı? */
  get active(): boolean {
    return this.items.length > 0;
  }

  shapes(): Shape[] {
    const shapes: Shape[] = [];
    for (const item of this.items) {
      if (item.age < 0) {
        // Sırası gelmedi: düşman hâlâ yerinde, titriyor.
        const shake = Math.sin(item.age * 90) * 0.15;
        shapes.push(...enemyShapes({ ...item.enemy, x: item.enemy.x + shake }));
        continue;
      }
      shapes.push(...this.burst(item));
    }
    return shapes;
  }

  labels(): EffectLabel[] {
    const labels: EffectLabel[] = [];
    for (const item of this.items) {
      if (item.age < 0) continue;
      const p = item.age / item.life;
      const pop = p < 0.12 ? 0.55 + (p / 0.12) * 0.65 : p < 0.26 ? 1.2 - ((p - 0.12) / 0.14) * 0.2 : 1;
      labels.push({
        x: item.enemy.x,
        y: item.enemy.y - 1.2 - easeOut(p) * (item.kind === 'trap' ? 3.2 : 2),
        text: item.text,
        sub: item.sub,
        alpha: p < 0.7 ? 1 : Math.max(0, (1 - p) / 0.3),
        scale: pop,
        color: item.kind === 'trap' ? '#ffd75e' : '#ffffff',
        big: item.kind === 'trap',
      });
    }
    // Yan yana patlayanların yazıları üst üste binmesin: sonraki, öncekinin üstüne kayar.
    for (let i = 1; i < labels.length; i++) {
      const a = labels[i];
      for (let j = 0; j < i; j++) {
        const boxA = labelBox(a);
        const boxB = labelBox(labels[j]);
        const apart =
          boxA.right < boxB.left ||
          boxB.right < boxA.left ||
          boxA.bottom < boxB.top ||
          boxB.bottom < boxA.top;
        if (!apart) a.y -= boxA.bottom - boxB.top + 0.2;
      }
    }
    return labels;
  }

  private burst(item: Effect): Shape[] {
    const { enemy, color } = item;
    const p = Math.min(1, item.age / item.life);
    const big = item.kind === 'trap';
    const R = enemy.radius * (enemy.kind === 'boss' ? VISUAL_SCALE.boss : VISUAL_SCALE.minion);
    const shapes: Shape[] = [];

    // Eriyen siluet: düşman şişip dönerek söner.
    const ghostTime = big ? 0.42 : 0.3;
    if (p < ghostTime) {
      const q = p / ghostTime;
      const ghost = enemyShapes({ ...enemy, spin: enemy.spin + q * 6 });
      shapes.push(...transformShapes(ghost, enemy.x, enemy.y, 1 + easeOut(q) * 0.6, 1 - q));
    }

    // Beyaz flaş.
    if (p < 0.22) {
      shapes.push({
        kind: 'circle',
        x: enemy.x,
        y: enemy.y,
        r: R * (0.9 + p * 4),
        color: '#ffffff',
        alpha: (1 - p / 0.22) * 0.85,
      });
    }

    // Genişleyen şok halkası.
    const ringRadius = R * (0.7 + easeOut(p) * (big ? 2.8 : 1.8));
    shapes.push({
      kind: 'poly',
      points: loop(enemy.x, enemy.y, ringRadius),
      open: true,
      color: lighten(color, 0.3),
      stroke: lighten(color, 0.3),
      strokeWidth: (big ? 0.55 : 0.35) * (1 - p) + 0.05,
      alpha: 1 - p,
    });

    // Dağılan damlacıklar (türün renginde) ve kıvılcımlar.
    const count = big ? 14 : 9;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU + jitter(item.id, i) * 0.5;
      const reach = R * (big ? 2.4 : 1.6) * (0.6 + jitter(item.id, i + 40) * 0.6);
      const d = easeOut(p) * reach;
      const x = enemy.x + Math.cos(angle) * d;
      const y = enemy.y + Math.sin(angle) * d + p * p * R * 0.8; // hafif düşüş
      const size = R * (big ? 0.26 : 0.2) * (1 - p) * (0.7 + jitter(item.id, i + 80) * 0.6);
      if (size <= 0.02) continue;
      if (i % 3 === 0) {
        shapes.push({ kind: 'circle', x, y, r: size * 0.7, color: '#ffffff', alpha: 1 - p });
      } else {
        shapes.push({
          kind: 'circle',
          x,
          y,
          r: size,
          color,
          gradient: { cx: x, cy: y, r: size, fx: x - size * 0.3, fy: y - size * 0.3, from: lighten(color, 0.5), to: color },
          stroke: INK,
          strokeWidth: 0.12,
          alpha: Math.min(1, (1 - p) * 1.4),
        });
      }
    }
    return shapes;
  }
}
