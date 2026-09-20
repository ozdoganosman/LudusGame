import {
  DEATH_FREEZE,
  FIELD_H,
  FIELD_W,
  LEVEL_CLEAR_FREEZE,
  MAX_DT,
  MAX_ENEMIES,
  PLAYER_SPEED,
  RESPAWN_INVULN,
  START_LIVES,
  TARGET_PERCENT,
  levelConfig,
} from './config';
import { Field, clearTrail, closeTrail } from './field';
import { createRng } from './rng';
import type { Rng } from './rng';
import { EMPTY, FILLED, TRAIL } from './types';
import type { DeathCause, Enemy, GameEvent, Input, Phase, Vec } from './types';

export type Player = {
  /** Hücre koordinatı, tam sayı. */
  x: number;
  y: number;
  /** Son hareket yönü; çizim ve görsel yön için. */
  dx: number;
  dy: number;
  drawing: boolean;
};

export type GameOptions = {
  width?: number;
  height?: number;
  seed?: number;
  lives?: number;
  targetPercent?: number;
};

const NO_INPUT: Input = { dx: 0, dy: 0 };

export class Game {
  readonly field: Field;
  readonly targetPercent: number;
  readonly player: Player = { x: 0, y: 0, dx: 0, dy: 0, drawing: false };

  trail: Vec[] = [];
  enemies: Enemy[] = [];
  level = 1;
  lives: number;
  score = 0;
  phase: Phase = 'ready';
  /** Kalan dokunulmazlık süresi (saniye). */
  invulnerable = 0;

  private readonly startLives: number;
  private rng: Rng;
  private seed: number;
  private freeze = 0;
  private stepAccumulator = 0;
  private spawnTimer = 0;
  private nextEnemyId = 1;
  private trailStart: Vec = { x: 0, y: 0 };
  private previousCell: Vec | null = null;
  /** Bu karede dalış tuşu basılı mı (movePlayer içinde girdiden okunur). */
  private wantsDive = false;
  private events: GameEvent[] = [];

  constructor(options: GameOptions = {}) {
    this.field = new Field(options.width ?? FIELD_W, options.height ?? FIELD_H);
    this.targetPercent = options.targetPercent ?? TARGET_PERCENT;
    this.startLives = options.lives ?? START_LIVES;
    this.lives = this.startLives;
    this.seed = options.seed ?? 0x9e3779b9;
    this.rng = createRng(this.seed);
  }

  get percent(): number {
    return this.field.percent();
  }

  /** Yeni oyun: puan, can ve seviye sıfırlanır. */
  start(): void {
    this.score = 0;
    this.lives = this.startLives;
    this.level = 1;
    this.rng = createRng(this.seed);
    this.startLevel(1);
  }

  /** Seviye kurulumu: alan temizlenir, oyuncu ve düşmanlar yerleştirilir. */
  startLevel(level: number): void {
    const config = levelConfig(level);
    this.level = level;
    this.field.reset();
    this.trail = [];
    this.previousCell = null;
    this.stepAccumulator = 0;
    this.invulnerable = RESPAWN_INVULN;
    this.freeze = 0;
    this.spawnTimer = config.spawnInterval;
    this.enemies = [];
    this.nextEnemyId = 1;

    this.player.x = Math.floor(this.field.w / 2);
    this.player.y = this.field.h - 1;
    this.player.dx = 0;
    this.player.dy = -1;
    this.player.drawing = false;
    this.trailStart = { x: this.player.x, y: this.player.y };

    this.enemies.push(this.createEnemy('boss', config.bossSpeed, {
      x: this.field.w / 2,
      y: this.field.h / 3,
    }));
    for (let i = 0; i < config.drifters; i++) {
      this.enemies.push(this.createEnemy('drifter', config.drifterSpeed));
    }
    for (let i = 0; i < config.hunters; i++) {
      this.enemies.push(this.createEnemy('hunter', config.hunterSpeed));
    }

    this.phase = 'playing';
  }

  /** Seviye tamamlandıktan sonra sıradaki seviyeye geçer. */
  nextLevel(): void {
    this.startLevel(this.level + 1);
  }

  /**
   * Oyunu bir kare ilerletir ve bu karede oluşan olayları döndürür.
   * @param dt saniye cinsinden geçen süre
   * @param input joystick yönü
   */
  update(dt: number, input: Input = NO_INPUT): GameEvent[] {
    this.events = [];
    const step = Math.min(Math.max(dt, 0), MAX_DT);

    if (this.phase === 'dying') {
      this.freeze -= step;
      if (this.freeze <= 0) this.respawn();
      return this.events;
    }

    if (this.phase !== 'playing') return this.events;

    if (this.freeze > 0) {
      this.freeze -= step;
      return this.events;
    }

    if (this.invulnerable > 0) this.invulnerable -= step;

    this.movePlayer(step, input);
    if (this.phase !== 'playing') return this.events;

    this.moveEnemies(step);
    if (this.phase !== 'playing') return this.events;

    this.handleSpawning(step);
    this.checkLevelClear();

    return this.events;
  }

  // ---------------------------------------------------------------- oyuncu

  private movePlayer(dt: number, input: Input): void {
    const dx = Math.sign(input.dx);
    const dy = Math.sign(input.dy);
    this.wantsDive = input.dive === true;
    if (dx === 0 && dy === 0) {
      this.stepAccumulator = 0;
      return;
    }

    this.player.dx = dx;
    this.player.dy = dy;
    // Çapraz harekette hız tek eksene göre normalize edilir.
    const speed = dx !== 0 && dy !== 0 ? PLAYER_SPEED / Math.SQRT2 : PLAYER_SPEED;
    this.stepAccumulator += dt * speed;

    let guard = 8;
    while (this.stepAccumulator >= 1 && guard-- > 0) {
      this.stepAccumulator -= 1;
      this.stepPlayer(dx, dy);
      if (this.phase !== 'playing') return;
    }
  }

  private stepPlayer(dx: number, dy: number): void {
    const { field, player } = this;
    const tx = player.x + dx;
    const ty = player.y + dy;
    if (!field.inBounds(tx, ty)) return;

    const target = field.get(tx, ty);

    if (!player.drawing) {
      if (target === FILLED) {
        // Gemi ele geçirilmiş alanın yalnızca kenarında yürür; bloğun içine giremez.
        if (!field.isEdge(tx, ty)) return;
        player.x = tx;
        player.y = ty;
        return;
      }
      // Boş alana ilk adım yalnızca dalış tuşu basılıyken atılır.
      if (!this.wantsDive) return;
      if (this.diagonalCorner(dx, dy) !== 'ok') return;
      this.trailStart = { x: player.x, y: player.y };
      player.drawing = true;
      this.previousCell = { x: player.x, y: player.y };
      this.events.push({ type: 'trail-start' });
      this.advanceTrail(tx, ty);
      return;
    }

    if (target === TRAIL) {
      // Geri dönüş sayılan tek hücre engellenir; dokunmatikte kazara ölüm olmasın.
      if (this.previousCell && this.previousCell.x === tx && this.previousCell.y === ty) return;
      this.die('self');
      return;
    }

    if (target === FILLED) {
      player.x = tx;
      player.y = ty;
      this.finishTrail();
      return;
    }

    const corner = this.diagonalCorner(dx, dy);
    if (corner === 'block') return;
    if (corner === 'die') {
      this.die('self');
      return;
    }

    this.advanceTrail(tx, ty);
  }

  /**
   * Hedef hücreye ilerler ve izi işaretler. İz tek hücre kalınlığındadır:
   * çapraz hücre zinciri 4 komşulukta zaten geçilmez bir duvar oluşturur,
   * bu yüzden köşeyi doldurmaya gerek yok.
   */
  private advanceTrail(tx: number, ty: number): void {
    const { field, player } = this;
    this.previousCell = { x: player.x, y: player.y };
    player.x = tx;
    player.y = ty;
    field.set(tx, ty, TRAIL);
    this.trail.push({ x: tx, y: ty });
  }

  /**
   * Çapraz adımda köşeden sızmayı engeller.
   * İki dik komşu da izse gemi kendi çizgisini keser (ölüm); ikisi de doluysa
   * duvarın köşesinden geçilemez (adım iptal). Sonuç: 'die' | 'block' | 'ok'.
   */
  private diagonalCorner(dx: number, dy: number): 'die' | 'block' | 'ok' {
    if (dx === 0 || dy === 0) return 'ok';
    const { field, player } = this;
    const sideX = field.inBounds(player.x + dx, player.y) ? field.get(player.x + dx, player.y) : FILLED;
    const sideY = field.inBounds(player.x, player.y + dy) ? field.get(player.x, player.y + dy) : FILLED;
    if (sideX === TRAIL && sideY === TRAIL) return 'die';
    if (sideX === FILLED && sideY === FILLED) return 'block';
    return 'ok';
  }

  private finishTrail(): void {
    const result = closeTrail(this.field, this.trail, this.enemies);
    const points = result.cells * (8 + 2 * this.level) + result.trapped.length * 400 * this.level;
    this.score += points;

    if (result.trapped.length > 0) {
      const killed = new Set(result.trapped);
      this.enemies = this.enemies.filter((enemy) => !killed.has(enemy.id));
    }

    this.trail = [];
    this.previousCell = null;
    this.player.drawing = false;
    // Kapatılan bölge gemiyi içeride bıraktıysa en yakın kenara çek.
    this.moveToNearestEdge();
    this.events.push({
      type: 'capture',
      cells: result.cells,
      trapped: result.trapped.length,
      points,
      percent: this.field.percent(),
    });
  }

  // --------------------------------------------------------------- düşmanlar

  private moveEnemies(dt: number): void {
    let maxSpeed = 1;
    for (const enemy of this.enemies) {
      maxSpeed = Math.max(maxSpeed, Math.hypot(enemy.vx, enemy.vy));
    }
    // Alt adım boyu yarım hücreyi geçmesin; hızlı düşman duvardan sızmasın.
    const substeps = Math.max(1, Math.ceil((maxSpeed * dt) / 0.5));
    const step = dt / substeps;

    for (let i = 0; i < substeps; i++) {
      for (const enemy of this.enemies) {
        this.steerEnemy(enemy, step);
        this.moveEnemy(enemy, step);
        enemy.spin += step * (enemy.kind === 'boss' ? 2.2 : 3.4);
      }
      if (this.checkEnemyCollisions()) return;
    }
  }

  private steerEnemy(enemy: Enemy, dt: number): void {
    if (enemy.kind === 'drifter') return;

    const speed = Math.hypot(enemy.vx, enemy.vy) || 1;
    let angle = Math.atan2(enemy.vy, enemy.vx);

    if (enemy.kind === 'hunter') {
      const want = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      angle += clampAngle(want - angle, 1.5 * dt);
    } else {
      // Patron serbest dolaşır, ara sıra rotasını kırar.
      angle += (this.rng.next() - 0.5) * 1.2 * dt;
    }

    enemy.vx = Math.cos(angle) * speed;
    enemy.vy = Math.sin(angle) * speed;
  }

  private moveEnemy(enemy: Enemy, dt: number): void {
    const { field } = this;
    const nx = enemy.x + enemy.vx * dt;
    const cellY = Math.floor(enemy.y);
    const nextX = Math.floor(nx);
    if (!field.inBounds(nextX, cellY) || field.get(nextX, cellY) === FILLED) {
      enemy.vx = -enemy.vx;
    } else {
      enemy.x = nx;
    }

    const ny = enemy.y + enemy.vy * dt;
    const cellX = Math.floor(enemy.x);
    const nextY = Math.floor(ny);
    if (!field.inBounds(cellX, nextY) || field.get(cellX, nextY) === FILLED) {
      enemy.vy = -enemy.vy;
    } else {
      enemy.y = ny;
    }

    // Güvenlik ağı: sıkışan düşman alanın içine çekilir.
    enemy.x = clamp(enemy.x, 1, field.w - 1);
    enemy.y = clamp(enemy.y, 1, field.h - 1);
  }

  /** Düşman-iz ve düşman-oyuncu çarpışmaları; ölüm olduysa true döner. */
  private checkEnemyCollisions(): boolean {
    const { field, player } = this;
    // Ele geçirilmiş alan güvenli bölgedir: düşmanlar dolu hücrelerden sekerek
    // geri döndüğü için oyuncuya duvarın arkasından değmeleri de sayılmaz.
    const playerExposed = field.get(player.x, player.y) !== FILLED;

    for (const enemy of this.enemies) {
      const ex = Math.floor(enemy.x);
      const ey = Math.floor(enemy.y);
      if (field.inBounds(ex, ey) && field.get(ex, ey) === TRAIL) {
        this.die('trail-cut');
        return true;
      }
      if (!playerExposed || this.invulnerable > 0) continue;
      const reach = enemy.radius + 0.7;
      if (
        Math.abs(enemy.x - (player.x + 0.5)) < reach &&
        Math.abs(enemy.y - (player.y + 0.5)) < reach
      ) {
        this.die('enemy');
        return true;
      }
    }
    return false;
  }

  private handleSpawning(dt: number): void {
    const config = levelConfig(this.level);
    if (config.spawnInterval <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = config.spawnInterval;
    if (this.enemies.length >= MAX_ENEMIES) return;
    this.enemies.push(this.createEnemy('drifter', config.drifterSpeed));
  }

  private createEnemy(kind: Enemy['kind'], speed: number, at?: Vec): Enemy {
    const position = at ?? this.findSpawnPoint();
    const angle = this.rng.range(0, Math.PI * 2);
    return {
      id: this.nextEnemyId++,
      kind,
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: kind === 'boss' ? 2.1 : 1.3,
      spin: this.rng.range(0, Math.PI * 2),
    };
  }

  /** Oyuncudan uzak, boş bir doğma noktası arar. */
  private findSpawnPoint(): Vec {
    const { field, player } = this;
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = this.rng.int(2, field.w - 2);
      const y = this.rng.int(2, field.h - 2);
      if (field.get(x, y) !== EMPTY) continue;
      if (Math.hypot(x - player.x, y - player.y) < 12) continue;
      return { x: x + 0.5, y: y + 0.5 };
    }
    // Rastgele deneme tutmazsa alandaki ilk boş hücreye düş.
    for (let y = 1; y < field.h - 1; y++) {
      for (let x = 1; x < field.w - 1; x++) {
        if (field.get(x, y) === EMPTY) return { x: x + 0.5, y: y + 0.5 };
      }
    }
    return { x: field.w / 2, y: field.h / 2 };
  }

  // ------------------------------------------------------------ ölüm / bitiş

  private die(cause: DeathCause): void {
    clearTrail(this.field, this.trail);
    this.trail = [];
    this.previousCell = null;
    this.player.drawing = false;
    this.stepAccumulator = 0;
    this.lives -= 1;

    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = 'gameOver';
      this.events.push({ type: 'death', cause, livesLeft: 0 });
      this.events.push({ type: 'game-over', score: this.score, level: this.level });
      return;
    }

    this.phase = 'dying';
    this.freeze = DEATH_FREEZE;
    this.events.push({ type: 'death', cause, livesLeft: this.lives });
  }

  private respawn(): void {
    const spot = this.field.isEdge(this.trailStart.x, this.trailStart.y)
      ? this.trailStart
      : this.findEdgeSpot();
    this.player.x = spot.x;
    this.player.y = spot.y;
    this.player.dx = 0;
    this.player.dy = -1;
    this.invulnerable = RESPAWN_INVULN;
    this.phase = 'playing';
    this.events.push({ type: 'respawn' });
  }

  /** İzin başladığı yer kenar olmaktan çıktıysa en yakın kenar hücresini bulur. */
  private findEdgeSpot(): Vec {
    const { field } = this;
    let best: Vec = { x: Math.floor(field.w / 2), y: field.h - 1 };
    let bestDistance = Infinity;
    for (let y = 0; y < field.h; y++) {
      for (let x = 0; x < field.w; x++) {
        if (!field.isEdge(x, y)) continue;
        const distance = Math.hypot(x - this.trailStart.x, y - this.trailStart.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return best;
  }

  /**
   * Gemi ele geçirilmiş bloğun içinde kaldıysa (kapatma sonrası olabilir)
   * en yakın kenar hücresine taşır. Kenar kalmadıysa seviye zaten bitmiştir.
   */
  private moveToNearestEdge(): void {
    const { field, player } = this;
    if (field.isEdge(player.x, player.y)) return;

    let best: Vec | null = null;
    let bestDistance = Infinity;
    for (let y = 0; y < field.h; y++) {
      for (let x = 0; x < field.w; x++) {
        if (!field.isEdge(x, y)) continue;
        const distance = (x - player.x) ** 2 + (y - player.y) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }

    if (best) {
      player.x = best.x;
      player.y = best.y;
    }
  }

  private checkLevelClear(): void {
    if (this.field.percent() < this.targetPercent) return;
    const percent = this.field.percent();
    const bonus = Math.round(percent) * 20 * this.level + 1000;
    this.score += bonus;
    this.phase = 'levelClear';
    this.freeze = LEVEL_CLEAR_FREEZE;
    this.events.push({ type: 'level-clear', level: this.level, percent, bonus });
  }
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Açı farkını [-limit, limit] aralığına sıkıştırır (en kısa dönüş yönü). */
function clampAngle(diff: number, limit: number): number {
  let d = diff;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return clamp(d, -limit, limit);
}
