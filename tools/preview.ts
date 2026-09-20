/**
 * Motoru başsız çalıştırır, betikli bir bot ile oynar ve kareleri tek bir
 * PNG'ye dizer. Amaç: cihaz olmadan oynanışı ve ele geçirme mantığını
 * gözle doğrulamak.  Kullanım: npm run preview
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Game } from '../src/engine/game';
import { EMPTY } from '../src/engine/types';
import type { Enemy, Input } from '../src/engine/types';
import { writeFieldPixels } from '../src/ui/gridImage';
import { hexToRgb, palette } from '../src/ui/palette';
import { encodePng } from './png';

const SCALE = 3;
const PAD = 8;
const COLUMNS = 3;
const SNAPSHOT_TIMES = [3, 15, 35, 65, 100, 150];

/** Oyuncuya en yakın düşmanın hücre cinsinden uzaklığı. */
function nearestEnemyDistance(game: Game): number {
  let nearest = Infinity;
  for (const enemy of game.enemies) {
    nearest = Math.min(nearest, Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y));
  }
  return nearest;
}

/** Saat yönünde 8 yön; kenar boyunca yürürken sırayla denenir. */
const DIRECTIONS: Input[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
];

/** Bu yöndeki komşu, geminin yürüyebileceği bir kenar hücresi mi? */
function walkable(game: Game, step: Input): boolean {
  return game.field.isEdge(game.player.x + step.dx, game.player.y + step.dy);
}

/** Geminin bulunduğu kenardan boş alana bakan ilk dik yön. */
function diveDirection(game: Game): Input | null {
  const { field, player } = game;
  const options: Input[] = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];
  for (const step of options) {
    const x = player.x + step.dx;
    const y = player.y + step.dy;
    if (field.inBounds(x, y) && field.get(x, y) === EMPTY) return step;
  }
  return null;
}

/** Bu yönde kaç hücre boş alan var (dalışın ne kadar derin olabileceği). */
function freeRun(game: Game, step: Input): number {
  const { field, player } = game;
  let run = 0;
  let x = player.x + step.dx;
  let y = player.y + step.dy;
  while (field.inBounds(x, y) && field.get(x, y) === EMPTY) {
    run++;
    x += step.dx;
    y += step.dy;
  }
  return run;
}

/**
 * Kenar hattında dolaşıp dikdörtgen dilimler kapatan bot.
 * Gemi ele geçirilmiş bloğun içine giremediği için yürüyüş, hattı takip eden
 * bir "duvar izleme" ile yapılır; bu aynı zamanda hattın dolaşılabilir
 * olduğunu da sınar. Düşman yaklaşınca dalış yarıda bırakılıp geri dönülür.
 */
function createBot() {
  let stage: 'walk' | 'dive' | 'across' | 'back' = 'walk';
  let walkDir: Input = { dx: -1, dy: 0 };
  let dive: Input = { dx: 0, dy: -1 };
  let across: Input = { dx: 1, dy: 0 };
  let stepsLeft = 0;
  let width = 8;
  let walked = 0;
  let plan = 0;

  /** Kenar boyunca bir adım: mümkünse aynı yönde, değilse en az saparak. */
  const followEdge = (game: Game): Input => {
    const current = DIRECTIONS.findIndex((d) => d.dx === walkDir.dx && d.dy === walkDir.dy);
    const order = [0, 1, -1, 2, -2, 3, -3, 4];
    for (const turn of order) {
      const candidate = DIRECTIONS[(current + turn + 8) % 8];
      if (walkable(game, candidate)) {
        walkDir = candidate;
        return candidate;
      }
    }
    return { dx: 0, dy: 0 };
  };

  return function nextInput(game: Game): Input {
    if (game.phase !== 'playing') return { dx: 0, dy: 0 };
    const { player } = game;

    if (!player.drawing && stage !== 'walk') {
      // İz kapandı: yeni tur.
      plan++;
      stage = 'walk';
      walked = 0;
      width = 6 + ((plan * 5) % 14);
    }

    if (player.drawing && nearestEnemyDistance(game) < 7) {
      // Kendi izine girmemek için önce yana çık, sonra geri dön.
      if (stage === 'dive') {
        stage = 'across';
        stepsLeft = 2;
        return across;
      }
      stage = 'back';
      return { dx: -dive.dx, dy: -dive.dy };
    }

    switch (stage) {
      case 'walk': {
        walked++;
        const depth = 10 + ((plan * 7) % 34);
        const candidate = diveDirection(game);
        const safe = nearestEnemyDistance(game) > 11;
        // Yeterince derin ve güvenli bir nokta bulunca dal.
        if (candidate && safe && freeRun(game, candidate) >= depth && walked > 4) {
          dive = candidate;
          across = { dx: -candidate.dy, dy: candidate.dx };
          if (plan % 2 === 0) across = { dx: -across.dx, dy: -across.dy };
          stage = 'dive';
          stepsLeft = depth;
          return dive;
        }
        return followEdge(game);
      }
      case 'dive': {
        stepsLeft--;
        if (stepsLeft > 0 && freeRun(game, dive) > 0) return dive;
        stage = 'across';
        stepsLeft = width;
        return across;
      }
      case 'across': {
        stepsLeft--;
        if (stepsLeft > 0 && freeRun(game, across) > 0) return across;
        stage = 'back';
        return { dx: -dive.dx, dy: -dive.dy };
      }
      case 'back':
        return { dx: -dive.dx, dy: -dive.dy };
    }
  };
}


type Snapshot = { pixels: Uint8Array; width: number; height: number; caption: string };

function renderSnapshot(game: Game): Snapshot {
  const { field } = game;
  const cellPixels = new Uint8Array(field.w * field.h * 4);
  writeFieldPixels(field, cellPixels);

  const width = field.w * SCALE;
  const height = field.h * SCALE;
  const pixels = new Uint8Array(width * height * 4);

  // Hücre tamponunu ölçekleyerek büyüt (nearest neighbour, keskin piksel görünümü).
  for (let y = 0; y < height; y++) {
    const srcY = Math.floor(y / SCALE);
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor(x / SCALE);
      const src = (srcY * field.w + srcX) * 4;
      const dst = (y * width + x) * 4;
      pixels[dst] = cellPixels[src];
      pixels[dst + 1] = cellPixels[src + 1];
      pixels[dst + 2] = cellPixels[src + 2];
      pixels[dst + 3] = 255;
    }
  }

  for (const enemy of game.enemies) {
    fillCircle(pixels, width, height, enemy.x * SCALE, enemy.y * SCALE, enemy.radius * SCALE, enemyColor(enemy));
  }
  fillCircle(
    pixels,
    width,
    height,
    (game.player.x + 0.5) * SCALE,
    (game.player.y + 0.5) * SCALE,
    1.8 * SCALE,
    hexToRgb(palette.player)
  );

  return {
    pixels,
    width,
    height,
    caption: `%${game.percent.toFixed(1)} puan ${game.score} can ${game.lives}`,
  };
}

function enemyColor(enemy: Enemy) {
  if (enemy.kind === 'boss') return hexToRgb(palette.boss);
  if (enemy.kind === 'hunter') return hexToRgb(palette.hunter);
  return hexToRgb(palette.drifter);
}

function fillCircle(
  pixels: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  rgb: readonly number[]
): void {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue;
      const offset = (y * width + x) * 4;
      pixels[offset] = rgb[0];
      pixels[offset + 1] = rgb[1];
      pixels[offset + 2] = rgb[2];
      pixels[offset + 3] = 255;
    }
  }
}

function composite(snapshots: Snapshot[]): { pixels: Uint8Array; width: number; height: number } {
  const rows = Math.ceil(snapshots.length / COLUMNS);
  const tileW = snapshots[0].width;
  const tileH = snapshots[0].height;
  const width = COLUMNS * tileW + (COLUMNS + 1) * PAD;
  const height = rows * tileH + (rows + 1) * PAD;
  const pixels = new Uint8Array(width * height * 4);
  const background = hexToRgb(palette.background);

  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = background[0];
    pixels[i * 4 + 1] = background[1];
    pixels[i * 4 + 2] = background[2];
    pixels[i * 4 + 3] = 255;
  }

  snapshots.forEach((snapshot, index) => {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const originX = PAD + column * (tileW + PAD);
    const originY = PAD + row * (tileH + PAD);
    for (let y = 0; y < snapshot.height; y++) {
      for (let x = 0; x < snapshot.width; x++) {
        const src = (y * snapshot.width + x) * 4;
        const dst = ((originY + y) * width + originX + x) * 4;
        pixels[dst] = snapshot.pixels[src];
        pixels[dst + 1] = snapshot.pixels[src + 1];
        pixels[dst + 2] = snapshot.pixels[src + 2];
        pixels[dst + 3] = 255;
      }
    }
  });

  return { pixels, width, height };
}

function main() {
  const game = new Game({ seed: 1337 });
  game.start();
  const bot = createBot();
  const snapshots: Snapshot[] = [];
  const dt = 1 / 60;
  let time = 0;
  let pending = [...SNAPSHOT_TIMES];

  while (pending.length > 0 && time < 240) {
    // Bot dalış tuşunu basılı tutuyor; tuşun kendisi motor testlerinde sınanıyor.
    const events = game.update(dt, { ...bot(game), dive: true });
    for (const event of events) {
      if (event.type === 'level-clear') {
        console.log(`  seviye ${event.level} tamamlandı: %${event.percent.toFixed(1)}, bonus ${event.bonus}`);
        game.nextLevel();
      }
      if (event.type === 'game-over') {
        console.log(`  oyun bitti: puan ${event.score}`);
        game.start();
      }
    }
    time += dt;
    if (pending.length > 0 && time >= pending[0]) {
      pending = pending.slice(1);
      const snapshot = renderSnapshot(game);
      console.log(`kare ${time.toFixed(1)}s -> ${snapshot.caption}`);
      snapshots.push(snapshot);
    }
  }

  const sheet = composite(snapshots);
  const output = resolve(process.argv[2] ?? 'preview.png');
  writeFileSync(output, encodePng(sheet.width, sheet.height, sheet.pixels));
  console.log(`\n${snapshots.length} kare yazıldı: ${output} (${sheet.width}x${sheet.height})`);
}

main();
