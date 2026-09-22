import { EMPTY, FILLED, TRAIL } from './types';
import type { Cell, Enemy, Vec } from './types';

/**
 * Oyun alanı. En dış hücre halkası oyuna ele geçirilmiş olarak başlar ve
 * yüzde hesabına katılmaz; oyuncu bu çerçeve üzerinde güvenle gezinir.
 */
export class Field {
  readonly w: number;
  readonly h: number;
  readonly cells: Uint8Array;
  /** Yüzdeye sayılan hücre sayısı: çerçeve hariç tüm iç alan. */
  readonly interiorTotal: number;
  /** Her hücre değişiminde artar; render katmanı grid'i sadece değiştiğinde yeniden çizer. */
  version = 0;
  private filledInterior = 0;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = new Uint8Array(w * h);
    this.interiorTotal = (w - 2) * (h - 2);
    this.reset();
  }

  reset(): void {
    this.cells.fill(EMPTY);
    for (let x = 0; x < this.w; x++) {
      this.cells[this.idx(x, 0)] = FILLED;
      this.cells[this.idx(x, this.h - 1)] = FILLED;
    }
    for (let y = 0; y < this.h; y++) {
      this.cells[this.idx(0, y)] = FILLED;
      this.cells[this.idx(this.w - 1, y)] = FILLED;
    }
    this.filledInterior = 0;
    this.version++;
  }

  idx(x: number, y: number): number {
    return y * this.w + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Çerçeve hücreleri iç alana dahil değildir. */
  isInterior(x: number, y: number): boolean {
    return x > 0 && y > 0 && x < this.w - 1 && y < this.h - 1;
  }

  get(x: number, y: number): Cell {
    return this.cells[this.idx(x, y)] as Cell;
  }

  set(x: number, y: number, value: Cell): void {
    const i = this.idx(x, y);
    const previous = this.cells[i];
    if (previous === value) return;
    this.cells[i] = value;
    this.version++;
    if (this.isInterior(x, y)) {
      if (previous === FILLED) this.filledInterior--;
      if (value === FILLED) this.filledInterior++;
    }
  }

  get captured(): number {
    return this.filledInterior;
  }

  /**
   * Dolu hücre boş alana (veya ize) komşu mu? Gemi yalnızca bu kenar
   * hücrelerinde yürür; ele geçirilmiş bloğun içine giremez.
   *
   * Çapraz komşular da sayılır: iç köşedeki hücre boşluğa yalnızca çaprazdan
   * değer. Onu kenar saymazsak gemi köşeye varamadan durur ve 90° dönüp duvar
   * boyunca ilerleyemez; kapatmanın bittiği çerçeve hücresi de kenar sayılmaz
   * ve gemi beklenmedik bir hücreye çekilir.
   */
  isEdge(x: number, y: number): boolean {
    if (!this.inBounds(x, y) || this.cells[this.idx(x, y)] !== FILLED) return false;
    const { w, h, cells } = this;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if ((dx === 0 && dy === 0) || nx < 0 || nx >= w) continue;
        if (cells[ny * w + nx] !== FILLED) return true;
      }
    }
    return false;
  }

  /** Ele geçirilen iç alanın yüzdesi (0-100). */
  percent(): number {
    return (this.filledInterior / this.interiorTotal) * 100;
  }

  /** Sayaçları grid içeriğinden yeniden hesaplar; testler ve hata ayıklama için. */
  recount(): number {
    let n = 0;
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        if (this.cells[this.idx(x, y)] === FILLED) n++;
      }
    }
    this.filledInterior = n;
    return n;
  }
}

export type CaptureResult = {
  /** Yeni ele geçirilen hücre sayısı (iz dahil). */
  cells: number;
  /** Kapatılan bölgelerde kalıp yok edilen düşmanların id'leri. */
  trapped: number[];
};

type Regions = {
  /** Her hücre için bölge etiketi; boş olmayan hücrelerde -1. */
  labels: Int32Array;
  /** Bölge etiketine göre hücre indeksleri. */
  cells: number[][];
};

/** Boş hücreleri 4 komşuluk üzerinden bağlı bölgelere ayırır. */
export function findEmptyRegions(field: Field): Regions {
  const { w, h } = field;
  const labels = new Int32Array(w * h).fill(-1);
  const queue = new Int32Array(w * h);
  const cells: number[][] = [];

  for (let seed = 0; seed < field.cells.length; seed++) {
    if (field.cells[seed] !== EMPTY || labels[seed] !== -1) continue;
    const label = cells.length;
    const collected: number[] = [];
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    labels[seed] = label;

    while (head < tail) {
      const index = queue[head++];
      collected.push(index);
      const cx = index % w;
      const cy = (index - cx) / w;
      // Sadece 4 komşuluk: çapraz köşeler bağlanmaz, böylece iz sızdırmaz.
      if (cx > 0) {
        const n = index - 1;
        if (field.cells[n] === EMPTY && labels[n] === -1) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
      if (cx < w - 1) {
        const n = index + 1;
        if (field.cells[n] === EMPTY && labels[n] === -1) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
      if (cy > 0) {
        const n = index - w;
        if (field.cells[n] === EMPTY && labels[n] === -1) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
      if (cy < h - 1) {
        const n = index + w;
        if (field.cells[n] === EMPTY && labels[n] === -1) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
    }

    cells.push(collected);
  }

  return { labels, cells };
}

/**
 * İzi kapatır: iz hücreleri ele geçirilir, ardından patronun bulunmadığı
 * her boş bölge doldurulur. Doldurulan bölgede kalan sıradan düşmanlar yok olur.
 * Alanda patron yoksa en büyük bölge korunur, yoksa tek çizgiyle oyun biterdi.
 */
export function closeTrail(
  field: Field,
  trail: readonly Vec[],
  enemies: readonly Enemy[]
): CaptureResult {
  let cells = 0;
  for (const cell of trail) {
    if (field.get(cell.x, cell.y) !== FILLED) {
      field.set(cell.x, cell.y, FILLED);
      cells++;
    }
  }

  cells += fillDiagonalSteps(field, trail, enemies);

  const regions = findEmptyRegions(field);
  const protectedRegions = new Set<number>();
  let hasBoss = false;

  for (const enemy of enemies) {
    if (enemy.kind !== 'boss') continue;
    hasBoss = true;
    const label = regionOf(field, regions.labels, enemy);
    if (label >= 0) protectedRegions.add(label);
  }

  if (!hasBoss && regions.cells.length > 0) {
    let largest = 0;
    for (let label = 1; label < regions.cells.length; label++) {
      if (regions.cells[label].length > regions.cells[largest].length) largest = label;
    }
    protectedRegions.add(largest);
  }

  const claimed = new Set<number>();
  for (let label = 0; label < regions.cells.length; label++) {
    if (protectedRegions.has(label)) continue;
    claimed.add(label);
    for (const index of regions.cells[label]) {
      const x = index % field.w;
      const y = (index - x) / field.w;
      field.set(x, y, FILLED);
      cells++;
    }
  }

  const trapped: number[] = [];
  if (claimed.size > 0) {
    for (const enemy of enemies) {
      if (enemy.kind === 'boss') continue;
      const label = regionOf(field, regions.labels, enemy);
      if (label >= 0 && claimed.has(label)) trapped.push(enemy.id);
    }
  }

  return { cells, trapped };
}

/**
 * Çapraz adımların merdiven dişlerini doldurur.
 * İki iz hücresi köşe köşe değiyorsa aralarındaki iki köşe hücresi de ele
 * geçirilir; böylece çapraz kesim tırtıklı kalmaz. Üzerinde düşman duran hücre
 * atlanır — patron ele geçirilmiş alanın içinde kalmasın diye.
 * Bölge etiketlemesi bundan sonra yapıldığı için, diş doldurmanın ayırdığı
 * patronsuz cepler de aynı turda dolar.
 */
function fillDiagonalSteps(field: Field, trail: readonly Vec[], enemies: readonly Enemy[]): number {
  const occupied = new Set<number>();
  for (const enemy of enemies) {
    const x = Math.floor(enemy.x);
    const y = Math.floor(enemy.y);
    if (field.inBounds(x, y)) occupied.add(field.idx(x, y));
  }

  let filled = 0;
  for (let i = 1; i < trail.length; i++) {
    const previous = trail[i - 1];
    const current = trail[i];
    if (Math.abs(previous.x - current.x) !== 1 || Math.abs(previous.y - current.y) !== 1) continue;

    for (const corner of [
      { x: current.x, y: previous.y },
      { x: previous.x, y: current.y },
    ]) {
      if (!field.inBounds(corner.x, corner.y)) continue;
      if (field.get(corner.x, corner.y) !== EMPTY) continue;
      if (occupied.has(field.idx(corner.x, corner.y))) continue;
      field.set(corner.x, corner.y, FILLED);
      filled++;
    }
  }
  return filled;
}

/** Düşmanın bulunduğu bölgenin etiketi; hücre boş değilse komşulara bakar. */
function regionOf(field: Field, labels: Int32Array, enemy: Enemy): number {
  const ex = Math.floor(enemy.x);
  const ey = Math.floor(enemy.y);
  if (!field.inBounds(ex, ey)) return -1;
  const direct = labels[field.idx(ex, ey)];
  if (direct >= 0) return direct;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = ex + dx;
      const y = ey + dy;
      if (!field.inBounds(x, y)) continue;
      const label = labels[field.idx(x, y)];
      if (label >= 0) return label;
    }
  }
  return -1;
}

/** İz hücrelerini boşa döndürür (ölümde izin silinmesi). */
export function clearTrail(field: Field, trail: readonly Vec[]): void {
  for (const cell of trail) {
    if (field.get(cell.x, cell.y) === TRAIL) field.set(cell.x, cell.y, EMPTY);
  }
}
