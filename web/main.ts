/**
 * Nanogemi — web sürümü.
 * Oynanışın tamamı src/engine içindeki platformdan bağımsız motordan gelir;
 * bu dosya yalnızca Canvas2D çizimi, girdi, kampanya akışı ve DOM arayüzünden
 * sorumludur.
 */
import { CAMPAIGN_LENGTH } from '../src/engine/campaign';
import { FIELD_H, FIELD_W } from '../src/engine/config';
import { Game } from '../src/engine/game';
import { NEUTRAL, snapToEight } from '../src/engine/input';
import { loadoutValue } from '../src/engine/upgrades';
import type { PartId } from '../src/engine/upgrades';
import type { Input } from '../src/engine/types';
import { territoryOutline } from '../src/ui/contour';
import type { Point } from '../src/ui/contour';
import { enemyShapes, shipAngle, shipShapes, shotShapes } from '../src/ui/creatures';
import type { Shape } from '../src/ui/creatures';
import { bestiaryLine } from '../src/ui/bestiary';
import { tissueTheme } from '../src/ui/tissues';
import type { TissueTheme } from '../src/ui/tissues';
import { partCards } from '../src/ui/parts';
import {
  PROFILE_KEY,
  addGold,
  buyPart,
  emptyProfile,
  parseProfile,
  recordScore,
  serializeProfile,
  unlockMission,
} from '../src/ui/profile';
import type { Profile } from '../src/ui/profile';
import {
  CAMPAIGN_END_LINES,
  GAME_TITLE,
  MISSION_BRIEF,
  SHIP_NAME,
  STORY_LINES,
  missionFor,
  missionLabel,
  missionProgress,
} from '../src/ui/story';
import {
  TEXTURE_SCALE,
  writeHealthyPixels,
  writeSickPixels,
} from '../src/ui/gridImage';
import { palette } from '../src/ui/palette';

type Mode = 'menu' | 'brief' | 'playing' | 'paused' | 'levelClear' | 'gameOver' | 'shop';

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
  gold: element('gold'),
  percent: element('percent'),
  barFill: element('bar-fill'),
  lives: element('lives'),
  shieldPips: element('shield'),
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
  tertiary: element<HTMLButtonElement>('ov-tertiary'),
  shop: element('shop'),
  shopGold: element('shop-gold'),
  shopValue: element('shop-value'),
  shopList: element('shop-list'),
  shopHint: element('shop-hint'),
  shopClose: element<HTMLButtonElement>('shop-close'),
  shipPreview: element<HTMLCanvasElement>('ship-preview'),
};

let profile = loadProfile();
const game = new Game({ seed: Date.now() >>> 0, loadout: profile.loadout });
/** Brifingi açık olan görev; oyun başladığında motora verilir. */
let mission = profile.unlocked;
/** Devam eden bir sefer var mı (görev tamamlandıktan sonra puan ve can taşınır)? */
let continuingRun = false;
let mode: Mode = 'menu';
/** Hangardan çıkınca dönülecek ekran. */
let shopReturn: Mode = 'menu';
let input: Input = NEUTRAL;
/** Dalış tuşu basılı mı: kenardan boş alana ancak bu açıkken çıkılır. */
let diving = false;
let cell = 4;
let gridVersion = -1;
let hudTimer = 0;
/** Geminin baktığı yön; dururken son yön korunur. */
let facing = -Math.PI / 2;
let summary = { level: 1, percent: 0, score: 0, bonus: 0, gold: 0 };

/**
 * Dokunun iki hâli hücre çözünürlüğünde bir kez üretilir, her karede
 * ölçeklenerek çizilir: hastalıklı zemin ve (ele geçirilen alana kırpılan)
 * iyileşmiş doku. Görev değişince yeniden üretilir.
 */
const sickLayer = tissueCanvas();
const healthyLayer = tissueCanvas();
let theme: TissueTheme = tissueTheme(game.level);
let themeLevel = -1;

function tissueCanvas(): HTMLCanvasElement {
  const layer = document.createElement('canvas');
  layer.width = FIELD_W * TEXTURE_SCALE;
  layer.height = FIELD_H * TEXTURE_SCALE;
  return layer;
}

/** Görevin dokusunu hazırlar; aynı görevde tekrar çalışmaz. */
function buildTissue(): void {
  if (themeLevel === game.level) return;
  themeLevel = game.level;
  theme = tissueTheme(game.level);

  const sick = require2d(sickLayer);
  const sickImage = sick.createImageData(sickLayer.width, sickLayer.height);
  writeSickPixels(game.field, sickImage.data, theme);
  sick.putImageData(sickImage, 0, 0);

  const healthy = require2d(healthyLayer);
  const healthyImage = healthy.createImageData(healthyLayer.width, healthyLayer.height);
  writeHealthyPixels(game.field, healthyImage.data, theme);
  healthy.putImageData(healthyImage, 0, 0);
}

/** Ele geçirilmiş alanın sınırı; yalnızca hücreler değişince yeniden hesaplanır. */
let outline: Point[][] = [];

// ------------------------------------------------------------------- profil

function loadProfile(): Profile {
  try {
    return parseProfile(localStorage.getItem(PROFILE_KEY));
  } catch {
    return emptyProfile();
  }
}

function saveProfile(): void {
  try {
    localStorage.setItem(PROFILE_KEY, serializeProfile(profile));
  } catch {
    // Depolama kapalıysa oyun yine oynanabilir; ilerleme saklanmaz.
  }
}

/** Kasadaki altın + o an seferde kazanılan. */
function purse(): number {
  return profile.gold + game.gold;
}

const tr = (value: number) => value.toLocaleString('tr-TR');

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
  buildTissue();
  if (gridVersion !== game.field.version) {
    outline = territoryOutline(game.field);
    gridVersion = game.field.version;
  }

  const width = cell * FIELD_W;
  const height = cell * FIELD_H;
  context.clearRect(0, 0, cell * (FIELD_W + MARGIN * 2), cell * (FIELD_H + MARGIN * 2));

  context.save();
  context.translate(MARGIN * cell, MARGIN * cell);
  // Doku katmanları yumuşatılarak çizilir: organik görünüm piksel basamağı istemiyor.
  context.imageSmoothingEnabled = true;
  context.drawImage(sickLayer, 0, 0, width, height);

  drawTerritory(width, height);
  drawTrail();
  drawCrew();
  context.restore();
}

/**
 * İyileşmiş doku: sınır çokgeninin içine dokunun sağlıklı görüntüsü kırpılarak
 * çizilir, üstüne ince bir kenar ışığı gelir.
 */
function drawTerritory(width: number, height: number): void {
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

  context.save();
  // Çift-tek kuralı: patronun sıkıştığı boşluk delik olarak kalır.
  context.clip('evenodd');
  context.fillStyle = theme.healthy;
  context.fillRect(0, 0, width, height);
  context.drawImage(healthyLayer, 0, 0, width, height);
  context.restore();

  context.lineJoin = 'round';
  context.lineWidth = Math.max(1, cell * 0.5);
  context.strokeStyle = theme.healthyEdge;
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

/** Şekil listesini (hücre biriminde) verilen bağlama çizer. */
function drawShapes(target: CanvasRenderingContext2D, shapes: Shape[], scale: number): void {
  for (const shape of shapes) {
    target.globalAlpha = shape.alpha ?? 1;
    target.fillStyle = shape.color;
    target.beginPath();
    if (shape.kind === 'circle') {
      target.arc(shape.x * scale, shape.y * scale, shape.r * scale, 0, Math.PI * 2);
    } else {
      shape.points.forEach((point, index) => {
        const x = point.x * scale;
        const y = point.y * scale;
        if (index === 0) target.moveTo(x, y);
        else target.lineTo(x, y);
      });
      target.closePath();
    }
    target.fill();
  }
  target.globalAlpha = 1;
}

function drawCrew(): void {
  const look = { x: game.player.x + 0.5, y: game.player.y + 0.5 };
  for (const enemy of game.enemies) drawShapes(context, enemyShapes(enemy, look), cell);
  for (const shot of game.shots) drawShapes(context, shotShapes(shot), cell);

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
    context,
    shipShapes({
      x: look.x,
      y: look.y,
      angle: facing,
      time: performance.now() / 1000,
      beaming: game.player.drawing,
      loadout: profile.loadout,
      shield: game.shield,
    }),
    cell
  );
  context.globalAlpha = 1;
}

// ---------------------------------------------------------------------- HUD

function refreshHud(): void {
  const target = game.targetPercent;
  const percent = game.percent;
  const reached = percent >= target;
  ui.mission.textContent = missionLabel(game.level);
  ui.score.textContent = tr(game.score);
  ui.high.textContent = `REKOR ${tr(profile.highScore)}`;
  ui.gold.textContent = tr(purse());
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

  // Kalkan göstergesi: dolu kutucuklar emilecek darbeleri gösterir.
  const charges = game.shipStats.shieldCharges;
  if (ui.shieldPips.childElementCount !== charges) {
    ui.shieldPips.replaceChildren(
      ...Array.from({ length: charges }, () => document.createElement('span'))
    );
  }
  Array.from(ui.shieldPips.children).forEach((pip, index) => {
    pip.classList.toggle('full', index < game.shield);
  });
}

// ------------------------------------------------------------------ paneller

type OverlayConfig = {
  title: string;
  subtitle?: string;
  /** Seyir defteri kutusundaki satırlar (hikâye). */
  story?: string[];
  rows?: { label: string; value: string }[];
  hint?: string;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
  tertiary?: { label: string; onPress: () => void };
};

function setButton(
  button: HTMLButtonElement,
  action?: { label: string; onPress: () => void }
): void {
  if (!action) {
    button.hidden = true;
    button.onclick = null;
    return;
  }
  button.hidden = false;
  button.textContent = action.label;
  button.onclick = action.onPress;
}

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
  setButton(ui.secondary, config.secondary);
  setButton(ui.tertiary, config.tertiary);
  overlay.hidden = false;
  ui.shop.hidden = true;
}

const hangarAction = () => ({ label: 'HANGAR', onPress: openShop });

function render(): void {
  switch (mode) {
    case 'menu': {
      const fresh = profile.unlocked === 1 && !profile.seenIntro;
      showOverlay({
        title: GAME_TITLE.toLocaleUpperCase('tr-TR'),
        subtitle: `${SHIP_NAME} · küçültülmüş bir geminin kaptanısın.`,
        story: STORY_LINES,
        rows: [
          { label: 'Altın', value: tr(profile.gold) },
          { label: 'İlerleme', value: missionProgress(profile.unlocked) },
          { label: 'Rekor', value: tr(profile.highScore) },
        ],
        hint: MISSION_BRIEF,
        primary: {
          label: fresh ? 'GÖREVE BAŞLA' : 'GÖREVE DEVAM',
          onPress: () => openBrief(profile.unlocked, false),
        },
        secondary: hangarAction(),
        tertiary: fresh
          ? undefined
          : { label: '1. BÖLÜMDEN OYNA', onPress: () => openBrief(1, false) },
      });
      break;
    }
    case 'brief': {
      const next = missionFor(mission);
      showOverlay({
        title: next.name,
        subtitle: `${missionProgress(mission)} · ${next.title}`,
        story: next.story,
        rows: [
          { label: 'Temizlenecek alan', value: `%${next.target}` },
          { label: 'Görev primi', value: `${tr(next.reward)} altın` },
          { label: 'Altın', value: tr(purse()) },
        ],
        hint: `${next.hint} Bu dokuda: ${bestiaryLine(mission)}.`,
        primary: { label: 'DALIŞA GEÇ', onPress: launch },
        secondary: hangarAction(),
        tertiary: { label: 'ANA EKRAN', onPress: () => setMode('menu') },
      });
      break;
    }
    case 'paused':
      showOverlay({
        title: 'BEKLEMEDE',
        subtitle: missionLabel(game.level),
        rows: [
          { label: 'Temizlenen', value: `%${game.percent.toFixed(1)}` },
          { label: 'Puan', value: tr(game.score) },
          { label: 'Kalan gemi', value: String(game.lives) },
          { label: 'Altın', value: tr(purse()) },
        ],
        hint: 'Yön için ekrana dokunup sürükle (yön tuşları / WASD). Işın için sağdaki tuş ya da boşluk. ESC duraklatır.',
        primary: { label: 'DEVAM ET', onPress: () => setMode('playing') },
        secondary: hangarAction(),
        tertiary: { label: 'ANA EKRAN', onPress: () => setMode('menu') },
      });
      break;
    case 'levelClear': {
      const cleared = missionFor(summary.level);
      const finale = cleared.finale;
      showOverlay({
        title: finale ? 'ÇEKİRDEK DAĞILDI' : 'DOKU TEMİZ',
        subtitle: finale
          ? 'Ana hikâye tamamlandı.'
          : `Sıradaki görev: ${missionFor(summary.level + 1).name}`,
        story: finale ? CAMPAIGN_END_LINES : undefined,
        rows: [
          { label: 'Temizlenen', value: `%${summary.percent.toFixed(1)}` },
          { label: 'Görev primi', value: `+${tr(summary.bonus)} puan` },
          { label: 'Kazanılan altın', value: `+${tr(summary.gold)}` },
          { label: 'Kasa', value: tr(profile.gold) },
        ],
        hint: 'Altınla hangarda kanat, motor, kuyruk, kompozit gövde, ışın topu ve kalkan alabilirsin.',
        primary: {
          label: 'SONRAKİ GÖREV',
          onPress: () => openBrief(summary.level + 1, true),
        },
        secondary: hangarAction(),
        tertiary: { label: 'ANA EKRAN', onPress: () => setMode('menu') },
      });
      break;
    }
    case 'gameOver':
      showOverlay({
        title: 'FİLO TÜKENDİ',
        subtitle:
          summary.score >= profile.highScore && summary.score > 0
            ? 'Yeni rekor! Hasta bir süre daha dayanacak.'
            : 'Patojen dokuyu ele geçirdi.',
        rows: [
          { label: 'Puan', value: tr(summary.score) },
          { label: 'Kalınan görev', value: missionFor(summary.level).name },
          { label: 'Kazanılan altın', value: `+${tr(summary.gold)}` },
          { label: 'Kasa', value: tr(profile.gold) },
        ],
        hint: 'Kazandığın altın kasada kalır; gemiyi güçlendirip aynı göreve dönebilirsin.',
        primary: { label: 'GÖREVE DÖN', onPress: () => openBrief(summary.level, false) },
        secondary: hangarAction(),
        tertiary: { label: 'ANA EKRAN', onPress: () => setMode('menu') },
      });
      break;
    case 'shop':
      overlay.hidden = true;
      ui.shop.hidden = false;
      renderShop();
      break;
    case 'playing':
      overlay.hidden = true;
      ui.shop.hidden = true;
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

/** Görev brifingi; continueRun true ise puan ve can taşınır. */
function openBrief(index: number, continueRun: boolean): void {
  mission = index;
  continuingRun = continueRun;
  if (!profile.seenIntro) {
    profile = { ...profile, seenIntro: true };
    saveProfile();
  }
  setMode('brief');
}

function launch(): void {
  game.setLoadout(profile.loadout);
  if (continuingRun && mission === game.level + 1) game.nextLevel();
  else game.start(mission);
  continuingRun = false;
  gridVersion = -1;
  themeLevel = -1;
  setMode('playing');
}

// ------------------------------------------------------------------- hangar

function openShop(): void {
  if (mode !== 'shop') shopReturn = mode;
  setMode('shop');
}

function closeShop(): void {
  setMode(shopReturn === 'shop' ? 'menu' : shopReturn);
}

function renderShop(): void {
  const gold = purse();
  ui.shopGold.textContent = tr(gold);
  ui.shopValue.textContent = tr(loadoutValue(profile.loadout));
  ui.shopHint.textContent =
    shopReturn === 'paused'
      ? 'Görev sürüyor: hız ve silah hemen, ek gemi ve kalkan sıradaki görevde geçerli.'
      : 'Altın; kapatılan alan, düşürülen düşman ve görev primlerinden gelir.';

  ui.shopList.replaceChildren(
    ...partCards(profile.loadout, gold).map((card) => {
      const row = document.createElement('div');
      row.className = card.maxed ? 'part maxed' : 'part';

      const name = document.createElement('h2');
      name.textContent = card.name;

      const pips = document.createElement('div');
      pips.className = 'pips';
      for (let i = 0; i < 4; i++) {
        const pip = document.createElement('i');
        if (i < card.level) pip.className = 'on';
        pips.append(pip);
      }

      const effect = document.createElement('p');
      effect.className = 'effect';
      effect.textContent = `${card.blurb} Şimdi: ${card.value}.`;
      if (card.next) {
        const arrow = document.createElement('b');
        arrow.textContent = ` Yükseltince: ${card.next}.`;
        effect.append(arrow);
      }

      const button = document.createElement('button');
      button.type = 'button';
      if (card.maxed) {
        button.textContent = 'TAM DONANIM';
        button.disabled = true;
      } else {
        button.append(document.createTextNode('YÜKSELT'));
        const price = document.createElement('span');
        price.className = 'coin';
        price.textContent = tr(card.cost ?? 0);
        button.append(price);
        button.disabled = !card.affordable;
        button.onclick = () => purchase(card.id);
      }

      row.append(name, pips, effect, button);
      return row;
    })
  );
}

function purchase(id: PartId): void {
  // Seferde kazanılan altın önce kasaya girer; alım tek bir cüzdandan yapılır.
  const earned = game.takeGold();
  if (earned > 0) profile = addGold(profile, earned);

  const result = buyPart(profile, id);
  profile = result.profile;
  // Kasaya aktarılan altın da, alım da hemen kaydedilir.
  if (earned > 0 || result.bought) saveProfile();
  if (result.bought) game.setLoadout(profile.loadout);

  renderShop();
  refreshHud();
}

/** Hangardaki gemi önizlemesi: satın alınan parçalarla, burnu sağa dönük. */
function drawShipPreview(): void {
  if (ui.shop.hidden) return;
  const view = require2d(ui.shipPreview);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = ui.shipPreview.clientWidth || 240;
  const height = Math.round(width * 0.55);
  if (ui.shipPreview.width !== Math.round(width * ratio)) {
    ui.shipPreview.width = Math.round(width * ratio);
    ui.shipPreview.height = Math.round(height * ratio);
  }
  view.setTransform(ratio, 0, 0, ratio, 0, 0);
  view.clearRect(0, 0, width, height);

  const scale = Math.min(width / 8, height / 5.4);
  view.save();
  view.translate(width / 2 - 4 * scale, height / 2 - 2.7 * scale);
  drawShapes(
    view,
    shipShapes({
      x: 4,
      y: 2.7,
      angle: 0,
      time: performance.now() / 1000,
      beaming: false,
      loadout: profile.loadout,
      shield: game.shipStats.shieldCharges,
    }),
    scale
  );
  view.restore();
}

ui.shopClose.addEventListener('click', closeShop);

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
    else if (mode === 'shop') closeShop();
    return;
  }
  if (event.code === 'Enter' && mode !== 'playing') {
    event.preventDefault();
    if (mode === 'shop') closeShop();
    else ui.primary.click();
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
        // Sefer altını kasaya girer, sıradaki bölüm açılır.
        const earned = game.takeGold();
        profile = addGold(profile, earned);
        profile = recordScore(profile, game.score);
        // Kampanya sonrası ilerleme 13'te (1. mutasyon dalgası) durur: dönen
        // oyuncu dalgalara baştan girer, imkânsız bir dalgaya düşmez.
        profile = unlockMission(profile, Math.min(event.level + 1, CAMPAIGN_LENGTH + 1));
        saveProfile();
        summary = {
          level: event.level,
          percent: event.percent,
          score: game.score,
          bonus: event.bonus,
          gold: earned,
        };
        setMode('levelClear');
      }
      if (event.type === 'game-over') {
        const earned = game.takeGold();
        profile = addGold(profile, earned);
        profile = recordScore(profile, event.score);
        saveProfile();
        summary = {
          level: event.level,
          percent: game.percent,
          score: event.score,
          bonus: 0,
          gold: earned,
        };
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
  drawShipPreview();
  requestAnimationFrame(tick);
}

resize();
render();
requestAnimationFrame(tick);
