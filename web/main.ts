/**
 * Kuşat — web sürümü.
 * Oynanışın tamamı src/engine içindeki platformdan bağımsız motordan gelir;
 * bu dosya yalnızca Canvas2D çizimi, girdi ve DOM arayüzünden sorumludur.
 */
import { FIELD_H, FIELD_W, START_LIVES } from '../src/engine/config';
import { Game } from '../src/engine/game';
import { NEUTRAL, snapToEight } from '../src/engine/input';
import type { Input } from '../src/engine/types';
import { territoryOutline } from '../src/ui/contour';
import type { Point } from '../src/ui/contour';
import { enemyShapes, shipAngle, shipShapes } from '../src/ui/creatures';
import type { Shape } from '../src/ui/creatures';
import { GAME_TITLE, MISSION_BRIEF, STORY_LINES, missionFor } from '../src/ui/story';
import { writeBackgroundPixels } from '../src/ui/gridImage';
import { palette } from '../src/ui/palette';

type Mode = 'menu' | 'playing' | 'paused' | 'levelClear' | 'gameOver';

const HIGH_SCORE_KEY = 'nanogemi.highScore.v1';
const KNOB_RANGE = 54;
/** Tuvalin alan dışında bıraktığı pay (hücre): kenardaki gemi kırpılmasın. */
const MARGIN = 2;

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
  mission: element('mission'),
  score: element('score'),
  high: element('high'),
  percent: element('percent'),
  barFill: element('bar-fill'),
  lives: element('lives'),
  pause: element<HTMLButtonElement>('pause'),
  dive: element<HTMLButtonElement>('dive'),
  stickBase: element('stick-base'),
  stickKnob: element('stick-knob'),
  title: element('ov-title'),
  subtitle: element('ov-sub'),
  story: element('ov-story'),
  rows: element('ov-rows'),
  hint: element('ov-hint'),
  primary: element<HTMLButtonElement>('ov-primary'),
  secondary: element<HTMLButtonElement>('ov-secondary'),
};

const game = new Game({ seed: Date.now() >>> 0 });
let mode: Mode = 'menu';
let input: Input = NEUTRAL;
/** Dalış tuşu basılı mı: kenardan boş alana ancak bu açıkken çıkılır. */
let diving = false;
let highScore = loadHighScore();
let cell = 4;
let gridVersion = -1;
let hudTimer = 0;
/** Geminin baktığı yön; dururken son yön korunur. */
let facing = -Math.PI / 2;
let summary = { level: 1, percent: 0, score: 0, bonus: 0 };

// Zemin (boş alan + nokta dokusu) bir kez üretilir, her karede ölçeklenerek çizilir.
const backgroundCanvas = document.createElement('canvas');
backgroundCanvas.width = FIELD_W;
backgroundCanvas.height = FIELD_H;
const backgroundContext = require2d(backgroundCanvas);
const backgroundImage = backgroundContext.createImageData(FIELD_W, FIELD_H);
writeBackgroundPixels(game.field, backgroundImage.data);
backgroundContext.putImageData(backgroundImage, 0, 0);

/** Ele geçirilmiş alanın sınırı; yalnızca hücreler değişince yeniden hesaplanır. */
let outline: Point[][] = [];

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
  const columns = FIELD_W + MARGIN * 2;
  const rows = FIELD_H + MARGIN * 2;
  cell = Math.max(2, Math.floor(Math.min(available.width / columns, available.height / rows)));
  const width = cell * columns;
  const height = cell * rows;
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
    outline = territoryOutline(game.field);
    gridVersion = game.field.version;
  }

  const width = cell * FIELD_W;
  const height = cell * FIELD_H;
  context.clearRect(0, 0, cell * (FIELD_W + MARGIN * 2), cell * (FIELD_H + MARGIN * 2));

  context.save();
  context.translate(MARGIN * cell, MARGIN * cell);
  context.imageSmoothingEnabled = false;
  context.drawImage(backgroundCanvas, 0, 0, width, height);

  drawTerritory();
  drawTrail();
  drawCrew();
  context.restore();
}

/** Ele geçirilmiş alan: köşeleri pahlanmış sınır çokgeni, üstünde ince bir kenar ışığı. */
function drawTerritory(): void {
  if (outline.length === 0) return;

  context.beginPath();
  for (const loop of outline) {
    loop.forEach((point, index) => {
      const x = point.x * cell;
      const y = point.y * cell;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  }

  context.fillStyle = palette.filled;
  // Çift-tek kuralı: patronun sıkıştığı boşluk delik olarak kalır.
  context.fill('evenodd');
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1, cell * 0.5);
  context.strokeStyle = palette.filledEdge;
  context.stroke();
}

/** İz: hücre merkezlerinden geçen yuvarlak uçlu bir çizgi. */
function drawTrail(): void {
  const trail = game.trail;
  if (trail.length === 0) return;

  context.beginPath();
  trail.forEach((point, index) => {
    const x = (point.x + 0.5) * cell;
    const y = (point.y + 0.5) * cell;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.lineCap = 'round';
  context.lineJoin = 'round';
  // Işın: geniş soluk hâle + parlak çekirdek.
  context.globalAlpha = 0.28;
  context.lineWidth = cell * 2.2;
  context.strokeStyle = palette.trail;
  context.stroke();
  context.globalAlpha = 1;
  context.lineWidth = cell * 0.9;
  context.stroke();
}

/** Şekil listesini (hücre biriminde) tuvale çizer. */
function drawShapes(shapes: Shape[]): void {
  for (const shape of shapes) {
    context.globalAlpha = shape.alpha ?? 1;
    context.fillStyle = shape.color;
    context.beginPath();
    if (shape.kind === 'circle') {
      context.arc(shape.x * cell, shape.y * cell, shape.r * cell, 0, Math.PI * 2);
    } else {
      shape.points.forEach((point, index) => {
        const x = point.x * cell;
        const y = point.y * cell;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
    }
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawCrew(): void {
  const look = { x: game.player.x + 0.5, y: game.player.y + 0.5 };
  for (const enemy of game.enemies) drawShapes(enemyShapes(enemy, look));

  if (game.phase === 'dying') {
    // Gemi vuruldu: kısa bir patlama parıltısı.
    context.globalAlpha = 0.55;
    context.fillStyle = palette.danger;
    context.beginPath();
    context.arc(look.x * cell, look.y * cell, cell * 4, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    return;
  }

  // Dokunulmazken gemi yanıp söner.
  const blink = game.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0;
  context.globalAlpha = blink ? 0.4 : 1;
  drawShapes(
    shipShapes({
      x: look.x,
      y: look.y,
      angle: facing,
      time: performance.now() / 1000,
      beaming: game.player.drawing,
    })
  );
  context.globalAlpha = 1;
}

// ---------------------------------------------------------------------- HUD

function refreshHud(): void {
  const target = game.targetPercent;
  const percent = game.percent;
  const reached = percent >= target;
  const mission = missionFor(game.level);
  ui.mission.textContent = mission.wave > 1 ? `${mission.name} · ${mission.wave}. DALGA` : mission.name;
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
  /** Seyir defteri kutusundaki satırlar (açılış hikâyesi). */
  story?: string[];
  rows?: { label: string; value: string }[];
  hint?: string;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
};

function showOverlay(config: OverlayConfig): void {
  ui.title.textContent = config.title;
  ui.subtitle.textContent = config.subtitle ?? '';
  ui.hint.textContent = config.hint ?? '';
  ui.story.replaceChildren(
    ...(config.story ?? []).map((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    })
  );
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
        title: GAME_TITLE.toLocaleUpperCase('tr-TR'),
        subtitle: 'Küçültülmüş bir geminin kaptanısın.',
        story: STORY_LINES,
        hint: `${MISSION_BRIEF} Alanın %${game.targetPercent} kadarını temizleyince görev tamamlanır.`,
        primary: { label: 'GÖREVE BAŞLA', onPress: startGame },
      });
      break;
    case 'paused':
      showOverlay({
        title: 'BEKLEMEDE',
        subtitle: missionFor(game.level).name,
        rows: [
          { label: 'Temizlenen', value: `%${game.percent.toFixed(1)}` },
          { label: 'Puan', value: game.score.toLocaleString('tr-TR') },
          { label: 'Kalan gemi', value: String(game.lives) },
        ],
        hint: 'Yön için ekrana dokunup sürükle (yön tuşları / WASD). Işın için sağdaki tuş ya da boşluk. ESC duraklatır.',
        primary: { label: 'DEVAM ET', onPress: () => setMode('playing') },
        secondary: { label: 'YENİDEN BAŞLA', onPress: startGame },
      });
      break;
    case 'levelClear': {
      const next = missionFor(summary.level + 1);
      showOverlay({
        title: 'DOKU TEMİZ',
        subtitle: `Sıradaki görev: ${next.name}. ${next.hint}`,
        rows: [
          { label: 'Temizlenen', value: `%${summary.percent.toFixed(1)}` },
          { label: 'Görev primi', value: `+${summary.bonus.toLocaleString('tr-TR')}` },
          { label: 'Puan', value: summary.score.toLocaleString('tr-TR') },
        ],
        primary: { label: 'SONRAKİ GÖREV', onPress: nextLevel },
      });
      break;
    }
    case 'gameOver':
      showOverlay({
        title: 'FİLO TÜKENDİ',
        subtitle:
          summary.score >= highScore && summary.score > 0
            ? 'Yeni rekor! Hasta bir süre daha dayanacak.'
            : 'Patojen dokuyu ele geçirdi.',
        rows: [
          { label: 'Puan', value: summary.score.toLocaleString('tr-TR') },
          { label: 'Ulaşılan görev', value: missionFor(summary.level).name },
          { label: 'Rekor', value: highScore.toLocaleString('tr-TR') },
        ],
        primary: { label: 'YENİDEN GÖREVE', onPress: startGame },
        secondary: { label: 'ANA EKRAN', onPress: () => setMode('menu') },
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
  setDiving(false);
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
  // Boşluk: çiz (basılı tutulur). ESC: duraklat / devam et.
  if (event.code === 'Space') {
    event.preventDefault();
    if (mode === 'playing') setDiving(true);
    return;
  }
  if (event.code === 'Escape') {
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
  if (event.code === 'Space') setDiving(false);
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

function setDiving(active: boolean): void {
  diving = active;
  ui.dive.classList.toggle('held', active);
}

ui.dive.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  ui.dive.setPointerCapture(event.pointerId);
  setDiving(true);
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
  ui.dive.addEventListener(type, () => setDiving(false));
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'playing') setMode('paused');
});

// ------------------------------------------------------------------- döngü

let previous: number | null = null;

function tick(timestamp: number): void {
  const dt = previous === null ? 0 : (timestamp - previous) / 1000;
  previous = timestamp;

  facing = shipAngle(game.player.dx, game.player.dy, facing);

  if (mode === 'playing' && dt > 0) {
    for (const event of game.update(dt, { dx: input.dx, dy: input.dy, dive: diving })) {
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
