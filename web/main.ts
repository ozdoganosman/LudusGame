/**
 * Kuşat — web sürümü.
 * Oynanışın tamamı src/engine içindeki platformdan bağımsız motordan gelir;
 * bu dosya yalnızca Canvas2D çizimi, girdi ve DOM arayüzünden sorumludur.
 */
import { FIELD_H, FIELD_W, START_LIVES } from '../src/engine/config';
import { Game } from '../src/engine/game';
import { NEUTRAL, snapToEight } from '../src/engine/input';
import type { Enemy, Input } from '../src/engine/types';
import { writeFieldPixels } from '../src/ui/gridImage';
import { palette } from '../src/ui/palette';

type Mode = 'menu' | 'playing' | 'paused' | 'levelClear' | 'gameOver';

const HIGH_SCORE_KEY = 'kusat.highScore.v1';
const KNOB_RANGE = 54;

const element = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} bulunamadı`);
  return node as T;
};

// Renkler tek kaynaktan (src/ui/palette) CSS değişkenlerine aktarılır.
for (const [key, value] of Object.entries(palette)) {
  const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  document.documentElement.style.setProperty(`--${name}`, value);
}

/** Canvas2D bağlamını null olmayan tipte verir. */
const require2d = (target: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = target.getContext('2d');
  if (!ctx) throw new Error('Canvas2D desteklenmiyor');
  return ctx;
};

const canvas = element<HTMLCanvasElement>('field');
const context = require2d(canvas);

const stage = element('stage');
const overlay = element('overlay');
const ui = {
  level: element('level'),
  score: element('score'),
  high: element('high'),
  percent: element('percent'),
  barFill: element('bar-fill'),
  lives: element('lives'),
  pause: element<HTMLButtonElement>('pause'),
  stickBase: element('stick-base'),
  stickKnob: element('stick-knob'),
  title: element('ov-title'),
  subtitle: element('ov-sub'),
  rows: element('ov-rows'),
  hint: element('ov-hint'),
  primary: element<HTMLButtonElement>('ov-primary'),
  secondary: element<HTMLButtonElement>('ov-secondary'),
};

const game = new Game({ seed: Date.now() >>> 0 });
let mode: Mode = 'menu';
let input: Input = NEUTRAL;
let highScore = loadHighScore();
let cell = 4;
let gridVersion = -1;
let hudTimer = 0;
let summary = { level: 1, percent: 0, score: 0, bonus: 0 };

// Grid, hücre başına bir piksel olarak çizilip büyütülür: keskin piksel görünümü.
const gridCanvas = document.createElement('canvas');
gridCanvas.width = FIELD_W;
gridCanvas.height = FIELD_H;
const gridContext = require2d(gridCanvas);
const gridImage = gridContext.createImageData(FIELD_W, FIELD_H);

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(Math.round(score)));
  } catch {
    // Depolama kapalıysa oyun yine oynanabilir.
  }
}

// ------------------------------------------------------------------ yerleşim

function resize(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const available = stage.getBoundingClientRect();
  cell = Math.max(2, Math.floor(Math.min(available.width / FIELD_W, available.height / FIELD_H)));
  const width = cell * FIELD_W;
  const height = cell * FIELD_H;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = false;
  draw();
}

window.addEventListener('resize', resize);

// -------------------------------------------------------------------- çizim

function draw(): void {
  if (gridVersion !== game.field.version) {
    writeFieldPixels(game.field, gridImage.data);
    gridContext.putImageData(gridImage, 0, 0);
    gridVersion = game.field.version;
  }

  const width = cell * FIELD_W;
  const height = cell * FIELD_H;
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  context.drawImage(gridCanvas, 0, 0, width, height);

  for (const enemy of game.enemies) drawEnemy(enemy);
  drawPlayer();
}

function disc(x: number, y: number, radius: number, color: string, alpha = 1): void {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
}

function drawEnemy(enemy: Enemy): void {
  const x = enemy.x * cell;
  const y = enemy.y * cell;
  const radius = enemy.radius * cell;

  if (enemy.kind === 'boss') {
    disc(x, y, radius * 1.9, palette.boss, 0.18);
    context.save();
    context.translate(x, y);
    context.rotate(enemy.spin);
    context.fillStyle = palette.boss;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
    disc(x, y, radius * 0.45, palette.text);
    return;
  }

  const color = enemy.kind === 'hunter' ? palette.hunter : palette.drifter;
  disc(x, y, radius * 1.7, color, 0.18);
  if (enemy.kind === 'hunter') {
    context.save();
    context.translate(x, y);
    context.rotate(enemy.spin);
    context.fillStyle = color;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
  } else {
    disc(x, y, radius, color);
  }
}

function drawPlayer(): void {
  const x = (game.player.x + 0.5) * cell;
  const y = (game.player.y + 0.5) * cell;

  if (game.phase === 'dying') {
    disc(x, y, cell * 4, palette.danger, 0.5);
    return;
  }

  // Dokunulmazken gemi yanıp söner.
  const blink = game.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0;
  const alpha = blink ? 0.35 : 1;
  disc(x, y, cell * 2.6, palette.playerGlow, 0.22 * alpha);
  disc(x, y, cell * 1.5, palette.playerGlow, 0.5 * alpha);
  disc(x, y, cell * 0.9, palette.player, alpha);
}

// ---------------------------------------------------------------------- HUD

function refreshHud(): void {
  const target = game.targetPercent;
  const percent = game.percent;
  const reached = percent >= target;
  ui.level.textContent = String(game.level);
  ui.score.textContent = game.score.toLocaleString('tr-TR');
  ui.high.textContent = `REKOR ${highScore.toLocaleString('tr-TR')}`;
  ui.percent.textContent = `%${percent.toFixed(1)} / %${target}`;
  ui.percent.classList.toggle('reached', reached);
  ui.barFill.classList.toggle('reached', reached);
  ui.barFill.style.width = `${Math.min(100, (percent / target) * 100)}%`;

  const lives = Math.max(0, game.lives);
  if (ui.lives.childElementCount !== lives) {
    ui.lives.replaceChildren(
      ...Array.from({ length: lives }, () => document.createElement('span'))
    );
  }
}

type OverlayConfig = {
  title: string;
  subtitle?: string;
  rows?: { label: string; value: string }[];
  hint?: string;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
};

function showOverlay(config: OverlayConfig): void {
  ui.title.textContent = config.title;
  ui.subtitle.textContent = config.subtitle ?? '';
  ui.hint.textContent = config.hint ?? '';
  ui.rows.replaceChildren(
    ...(config.rows ?? []).flatMap((row) => {
      const term = document.createElement('dt');
      term.textContent = row.label;
      const value = document.createElement('dd');
      value.textContent = row.value;
      return [term, value];
    })
  );
  ui.primary.textContent = config.primary.label;
  ui.primary.onclick = config.primary.onPress;
  if (config.secondary) {
    ui.secondary.hidden = false;
    ui.secondary.textContent = config.secondary.label;
    ui.secondary.onclick = config.secondary.onPress;
  } else {
    ui.secondary.hidden = true;
    ui.secondary.onclick = null;
  }
  overlay.hidden = false;
}

function render(): void {
  switch (mode) {
    case 'menu':
      showOverlay({
        title: 'KUŞAT',
        subtitle:
          'Kenardan içeri dal, izini çerçeveye bağla ve alanı ele geçir. Patronun bulunduğu bölge dolmaz; ondan uzak dur.',
        hint: `Alanın %${game.targetPercent} kadarını kapatınca seviye geçilir. Dokunup sürükle (veya yön tuşları / WASD).`,
        primary: { label: 'OYUNA BAŞLA', onPress: startGame },
      });
      break;
    case 'paused':
      showOverlay({
        title: 'DURAKLADI',
        rows: [
          { label: 'Seviye', value: String(game.level) },
          { label: 'Puan', value: game.score.toLocaleString('tr-TR') },
          { label: 'Ele geçirilen', value: `%${game.percent.toFixed(1)}` },
        ],
        primary: { label: 'DEVAM ET', onPress: () => setMode('playing') },
        secondary: { label: 'YENİDEN BAŞLA', onPress: startGame },
      });
      break;
    case 'levelClear':
      showOverlay({
        title: `SEVİYE ${summary.level} TEMİZ`,
        subtitle: 'Alan senin. Sıradaki seviyede daha fazla ve daha hızlı düşman var.',
        rows: [
          { label: 'Ele geçirilen', value: `%${summary.percent.toFixed(1)}` },
          { label: 'Bonus', value: `+${summary.bonus.toLocaleString('tr-TR')}` },
          { label: 'Puan', value: summary.score.toLocaleString('tr-TR') },
        ],
        primary: { label: 'SIRADAKİ SEVİYE', onPress: nextLevel },
      });
      break;
    case 'gameOver':
      showOverlay({
        title: 'OYUN BİTTİ',
        subtitle: summary.score >= highScore && summary.score > 0 ? 'Yeni rekor!' : undefined,
        rows: [
          { label: 'Puan', value: summary.score.toLocaleString('tr-TR') },
          { label: 'Seviye', value: String(summary.level) },
          { label: 'Rekor', value: highScore.toLocaleString('tr-TR') },
        ],
        primary: { label: 'TEKRAR OYNA', onPress: startGame },
        secondary: { label: 'ANA MENÜ', onPress: () => setMode('menu') },
      });
      break;
    case 'playing':
      overlay.hidden = true;
      break;
  }
  refreshHud();
}

function setMode(next: Mode): void {
  mode = next;
  input = NEUTRAL;
  render();
}

function startGame(): void {
  game.start();
  gridVersion = -1;
  setMode('playing');
}

function nextLevel(): void {
  game.nextLevel();
  gridVersion = -1;
  setMode('playing');
}

// -------------------------------------------------------------------- girdi

const pressed = new Set<string>();
const KEY_VECTORS: Record<string, Input> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  KeyW: { dx: 0, dy: -1 },
  KeyS: { dx: 0, dy: 1 },
  KeyA: { dx: -1, dy: 0 },
  KeyD: { dx: 1, dy: 0 },
};

function inputFromKeys(): Input {
  let dx = 0;
  let dy = 0;
  for (const code of pressed) {
    const vector = KEY_VECTORS[code];
    if (!vector) continue;
    dx += vector.dx;
    dy += vector.dy;
  }
  return { dx: Math.sign(dx), dy: Math.sign(dy) };
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'Escape') {
    event.preventDefault();
    if (mode === 'playing') setMode('paused');
    else if (mode === 'paused') setMode('playing');
    return;
  }
  if (event.code === 'Enter' && mode !== 'playing') {
    event.preventDefault();
    ui.primary.click();
    return;
  }
  if (!(event.code in KEY_VECTORS)) return;
  event.preventDefault();
  pressed.add(event.code);
  input = inputFromKeys();
});

window.addEventListener('keyup', (event) => {
  if (!pressed.delete(event.code)) return;
  input = inputFromKeys();
});

let activePointer: { id: number; x: number; y: number } | null = null;

function startDrag(event: PointerEvent): void {
  if (mode !== 'playing') return;
  if (event.target instanceof Element && event.target.closest('button')) return;
  activePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  document.body.classList.add('dragging');
  moveKnob(event.clientX, event.clientY, event.clientX, event.clientY);
  input = NEUTRAL;
}

function moveKnob(originX: number, originY: number, x: number, y: number): void {
  const dx = x - originX;
  const dy = y - originY;
  const distance = Math.hypot(dx, dy);
  const scale = distance > KNOB_RANGE ? KNOB_RANGE / distance : 1;
  ui.stickBase.style.left = `${originX}px`;
  ui.stickBase.style.top = `${originY}px`;
  ui.stickKnob.style.left = `${originX + dx * scale}px`;
  ui.stickKnob.style.top = `${originY + dy * scale}px`;
}

window.addEventListener('pointerdown', startDrag);

window.addEventListener('pointermove', (event) => {
  if (!activePointer || event.pointerId !== activePointer.id) return;
  moveKnob(activePointer.x, activePointer.y, event.clientX, event.clientY);
  input = snapToEight(event.clientX - activePointer.x, event.clientY - activePointer.y);
});

function endDrag(event: PointerEvent): void {
  if (!activePointer || event.pointerId !== activePointer.id) return;
  activePointer = null;
  document.body.classList.remove('dragging');
  input = NEUTRAL;
}

window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

ui.pause.addEventListener('click', () => {
  if (mode === 'playing') setMode('paused');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'playing') setMode('paused');
});

// ------------------------------------------------------------------- döngü

let previous: number | null = null;

function tick(timestamp: number): void {
  const dt = previous === null ? 0 : (timestamp - previous) / 1000;
  previous = timestamp;

  if (mode === 'playing' && dt > 0) {
    for (const event of game.update(dt, input)) {
      if (event.type === 'level-clear') {
        summary = {
          level: event.level,
          percent: event.percent,
          score: game.score,
          bonus: event.bonus,
        };
        setMode('levelClear');
      }
      if (event.type === 'game-over') {
        summary = { level: event.level, percent: game.percent, score: event.score, bonus: 0 };
        if (event.score > highScore) {
          highScore = event.score;
          saveHighScore(highScore);
        }
        setMode('gameOver');
      }
    }

    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      refreshHud();
    }
  }

  draw();
  requestAnimationFrame(tick);
}

ui.lives.replaceChildren(
  ...Array.from({ length: START_LIVES }, () => document.createElement('span'))
);
resize();
render();
requestAnimationFrame(tick);
