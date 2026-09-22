import { KILL_GOLD, captureGold, missionPlan, trapReward } from './campaign';
import type { MissionPlan } from './campaign';
import {
  FIELD_H,
  FIELD_W,
  LEVEL_CLEAR_FREEZE,
  MAX_DT,
  MAX_ENEMIES,
  RESPAWN_INVULN,
  START_LIVES,
} from './config';
import { Field, clearTrail, closeTrail } from './field';
import { createRng } from './rng';
import type { Rng } from './rng';
import { speciesOf } from './species';
import type { SpeciesId } from './species';
import { defaultLoadout, normalizeLoadout, shipStats } from './upgrades';
import type { Loadout, ShipStats } from './upgrades';
import { EMPTY, FILLED, TRAIL } from './types';
import type { DeathCause, Enemy, GameEvent, Input, Phase, Shot, Vec } from './types';

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
  /** Verilirse kampanyanın hedef yüzdesini ezer (testler ve serbest oyun için). */
  targetPercent?: number;
  /** Satın alınmış gemi parçaları; verilmezse fabrika çıkışı. */
  loadout?: Partial<Loadout>;
};

/** Tek karede havada olabilecek en fazla mermi. */
const MAX_SHOTS = 12;

/** Bölünen türlerin çoğalma aralığı (saniye). */
const SPLIT_INTERVAL = 7;

/** Bölünerek bundan küçük olan tür artık bölünmez. */
const MIN_SPLIT_RADIUS = 1.05;

const NO_INPUT: Input = { dx: 0, dy: 0 };

export class Game {
  readonly field: Field;
  /** Bu görevi tamamlamak için gereken temizlik yüzdesi. */
  targetPercent: number;
  readonly player: Player = { x: 0, y: 0, dx: 0, dy: 0, drawing: false };

  trail: Vec[] = [];
  enemies: Enemy[] = [];
  /** Silah yükseltmesinin havadaki mermileri. */
  shots: Shot[] = [];
  /** Oynanan görev numarası (1'den başlar). */
  level = 1;
  lives: number;
  score = 0;
  /** Bu seferde kazanılan altın; arayüz görev sonunda kasaya aktarır. */
  gold = 0;
  /** Kalkanın o an emebileceği darbe sayısı. */
  shield = 0;
  phase: Phase = 'ready';
  /** Kalan dokunulmazlık süresi (saniye). */
  invulnerable = 0;

  private mission: MissionPlan = missionPlan(1);
  private loadout: Loadout;
  private stats: ShipStats;
  private readonly baseLives: number;
  private readonly targetOverride?: number;
  private shieldTimer = 0;
  private shotTimer = 0;
  private nextShotId = 1;
  private rng: Rng;
  private seed: number;
  private freeze = 0;
  private stepAccumulator = 0;
  private spawnTimer = 0;
  private nextEnemyId = 1;
  private trailStart: Vec = { x: 0, y: 0 };
  /** Bu karede dalış tuşu basılı mı (movePlayer içinde girdiden okunur). */
  private wantsDive = false;
  private events: GameEvent[] = [];

  constructor(options: GameOptions = {}) {
    this.field = new Field(options.width ?? FIELD_W, options.height ?? FIELD_H);
    this.loadout = options.loadout ? normalizeLoadout(options.loadout) : defaultLoadout();
    this.stats = shipStats(this.loadout);
    this.targetOverride = options.targetPercent;
    this.targetPercent = options.targetPercent ?? missionPlan(1).target;
    this.baseLives = options.lives ?? START_LIVES;
    this.lives = this.maxLives;
    this.seed = options.seed ?? 0x9e3779b9;
    this.rng = createRng(this.seed);
  }

  get percent(): number {
    return this.field.percent();
  }

  /** Kompozit gövdeyle artan başlangıç can sayısı. */
  get maxLives(): number {
    return this.baseLives + this.stats.extraLives;
  }

  /** O an oynanan görevin planı (hedef, kadro, prim). */
  get plan(): MissionPlan {
    return this.mission;
  }

  /** Geminin yükseltmelerden gelen oynanış değerleri. */
  get shipStats(): ShipStats {
    return this.stats;
  }

  /**
   * Satın alınan parçaları uygular. Görevler arasında çağrılır; can sayısı
   * bir sonraki görevde yenilenir.
   */
  setLoadout(loadout: Partial<Loadout>): void {
    this.loadout = normalizeLoadout(loadout);
    this.stats = shipStats(this.loadout);
  }

  /** Kazanılan altını arayüze devreder ve sayacı sıfırlar. */
  takeGold(): number {
    const earned = this.gold;
    this.gold = 0;
    return earned;
  }

  /**
   * Yeni sefer: puan, can ve altın sıfırlanır.
   * @param mission kaçıncı görevden başlanacağı (kampanyada kalınan yer)
   */
  start(mission = 1): void {
    this.score = 0;
    this.gold = 0;
    this.lives = this.maxLives;
    this.rng = createRng(this.seed);
    this.startMission(mission);
  }

  /** Görev kurulumu: alan temizlenir, oyuncu ve düşmanlar yerleştirilir. */
  startMission(index: number): void {
    const plan = missionPlan(index);
    this.mission = plan;
    this.level = plan.index;
    this.targetPercent = this.targetOverride ?? plan.target;
    this.shots = [];
    this.shield = this.stats.shieldCharges;
    this.shieldTimer = this.stats.shieldRecharge;
    this.shotTimer = this.stats.shotInterval;
    this.field.reset();
    this.trail = [];
    this.stepAccumulator = 0;
    this.invulnerable = RESPAWN_INVULN;
    this.freeze = 0;
    this.spawnTimer = plan.difficulty.spawnInterval;
    this.enemies = [];
    this.nextEnemyId = 1;

    this.player.x = Math.floor(this.field.w / 2);
    this.player.y = this.field.h - 1;
    this.player.dx = 0;
    this.player.dy = -1;
    this.player.drawing = false;
    this.trailStart = { x: this.player.x, y: this.player.y };

    // Kadro bölüme özel: her tür kendi davranışı, hızı ve boyutuyla gelir.
    for (const entry of plan.roster) {
      const boss = speciesOf(entry.species).kind === 'boss';
      for (let i = 0; i < entry.count; i++) {
        this.enemies.push(
          this.createEnemy(
            entry.species,
            boss ? { x: this.field.w / 2, y: this.field.h / 3 } : undefined
          )
        );
      }
    }

    this.phase = 'playing';
  }

  /** Eski ad; görev kurulumuna yönlendirir. */
  startLevel(level: number): void {
    this.startMission(level);
  }

  /** Görev tamamlandıktan sonra sıradaki göreve geçer. */
  nextLevel(): void {
    this.startMission(this.level + 1);
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
    this.rechargeShield(step);

    this.movePlayer(step, input);
    if (this.phase !== 'playing') return this.events;

    this.moveEnemies(step);
    if (this.phase !== 'playing') return this.events;

    this.updateShots(step);
    if (this.phase !== 'playing') return this.events;

    this.handleSplits();

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
    const base = this.speedFor(dx, dy);
    const speed = dx !== 0 && dy !== 0 ? base / Math.SQRT2 : base;
    this.stepAccumulator += dt * speed;

    let guard = 8;
    while (this.stepAccumulator >= 1 && guard-- > 0) {
      this.stepAccumulator -= 1;
      this.stepPlayer(dx, dy);
      if (this.phase !== 'playing') return;
    }
  }

  /**
   * Bu karenin hızı: kenarda kanat, dokuda motor, izi geri sararken kuyruk
   * belirler. Yükseltmeler yoksa üçü de fabrika hızıdır.
   */
  private speedFor(dx: number, dy: number): number {
    const { player, stats } = this;
    if (!player.drawing) return stats.edgeSpeed;
    const behind = this.cellBehind();
    const retracing = behind.x === player.x + dx && behind.y === player.y + dy;
    return retracing ? stats.diveSpeed * stats.retraceBoost : stats.diveSpeed;
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
      this.events.push({ type: 'trail-start' });
      this.advanceTrail(tx, ty);
      return;
    }

    // Arkandaki hücreye dönmek izi geri sarar: üstünde durduğun hücre silinir.
    const behind = this.cellBehind();
    if (behind.x === tx && behind.y === ty) {
      this.retrace(tx, ty);
      return;
    }

    if (target === TRAIL) {
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
    player.x = tx;
    player.y = ty;
    field.set(tx, ty, TRAIL);
    this.trail.push({ x: tx, y: ty });
  }

  /** İz üzerinde geminin bir gerisindeki hücre; iz tek hücreyse başlangıç noktası. */
  private cellBehind(): Vec {
    return this.trail.length >= 2 ? this.trail[this.trail.length - 2] : this.trailStart;
  }

  /**
   * İzi bir hücre geri sarar: geminin üstünde durduğu hücre boşa döner ve gemi
   * arkadaki hücreye çekilir. İz tükenirse çizim iptal olur — kapatma yok.
   */
  private retrace(tx: number, ty: number): void {
    const { field, player } = this;
    const leaving = this.trail.pop();
    if (leaving) field.set(leaving.x, leaving.y, EMPTY);

    player.x = tx;
    player.y = ty;

    if (this.trail.length === 0) {
      player.drawing = false;
    }
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
    const points = result.cells * (8 + 2 * this.level);
    const gold = captureGold(result.cells);
    this.score += points;
    this.gold += gold;

    // Kapanan alanda kalan her düşman yok olur ve zincirli özel prim getirir.
    if (result.trapped.length > 0) {
      const killed = new Set(result.trapped);
      let chain = 0;
      for (const enemy of this.enemies) {
        if (!killed.has(enemy.id)) continue;
        chain++;
        const reward = trapReward(enemy.kind, this.level, chain);
        this.score += reward.points;
        this.gold += reward.gold;
        this.events.push({ type: 'enemy-trapped', enemy: { ...enemy }, chain, ...reward });
      }
      this.enemies = this.enemies.filter((enemy) => !killed.has(enemy.id));
    }

    this.trail = [];
    this.player.drawing = false;
    // Kapatılan bölge gemiyi içeride bıraktıysa en yakın kenara çek.
    this.moveToNearestEdge();
    this.events.push({
      type: 'capture',
      cells: result.cells,
      trapped: result.trapped.length,
      points,
      percent: this.field.percent(),
      gold,
    });
  }

  // ----------------------------------------------------------------- silah

  /**
   * Silah yükseltmesi otomatik ateş eder: gemi baktığı yöne belirli aralıkla
   * ışın atar. Mikrop ve virüs tek isabetle düşer; patron vurulmaz, savrulur.
   */
  private updateShots(dt: number): void {
    if (Number.isFinite(this.stats.shotInterval)) {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        this.shotTimer = this.stats.shotInterval;
        this.fireShot();
      }
    }
    if (this.shots.length === 0) return;

    const survivors: Shot[] = [];
    for (const shot of this.shots) {
      const travelled = Math.hypot(shot.vx, shot.vy) * dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.range -= travelled;
      if (shot.range <= 0) continue;

      const cx = Math.floor(shot.x);
      const cy = Math.floor(shot.y);
      // Alan dışı ya da temizlenmiş doku: mermi orada söner.
      if (!this.field.inBounds(cx, cy) || this.field.get(cx, cy) === FILLED) continue;
      if (this.hitEnemy(shot)) continue;
      survivors.push(shot);
    }
    this.shots = survivors;
  }

  private fireShot(): void {
    if (this.shots.length >= MAX_SHOTS) return;
    const { player, stats } = this;
    const dx = player.dx;
    const dy = player.dy === 0 && dx === 0 ? -1 : player.dy;
    const length = Math.hypot(dx, dy) || 1;
    this.shots.push({
      id: this.nextShotId++,
      x: player.x + 0.5 + (dx / length) * 1.1,
      y: player.y + 0.5 + (dy / length) * 1.1,
      vx: (dx / length) * stats.shotSpeed,
      vy: (dy / length) * stats.shotSpeed,
      range: stats.shotRange,
    });
  }

  /** Merminin değdiği düşmanı işler; mermi harcandıysa true döner. */
  private hitEnemy(shot: Shot): boolean {
    for (const enemy of this.enemies) {
      const reach = enemy.radius + 0.4;
      if (Math.abs(enemy.x - shot.x) > reach || Math.abs(enemy.y - shot.y) > reach) continue;

      if (enemy.kind === 'boss') {
        // Patron ışınla öldürülemez; yalnızca geri savrulur.
        enemy.vx = -enemy.vx;
        enemy.vy = -enemy.vy;
        return true;
      }

      this.enemies = this.enemies.filter((other) => other.id !== enemy.id);
      const points = (enemy.kind === 'hunter' ? 300 : 150) * this.level;
      this.score += points;
      this.gold += KILL_GOLD;
      this.events.push({
        type: 'enemy-down',
        kind: enemy.kind,
        species: enemy.species,
        points,
        gold: KILL_GOLD,
        enemy: { ...enemy },
      });
      return true;
    }
    return false;
  }

  /** Harcanan kalkan zamanla geri dolar. */
  private rechargeShield(dt: number): void {
    if (this.shield >= this.stats.shieldCharges) return;
    this.shieldTimer -= dt;
    if (this.shieldTimer > 0) return;
    this.shield += 1;
    this.shieldTimer = this.stats.shieldRecharge;
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

  /**
   * Türün davranışına göre yön ve hız. Ortak kural: `heading` gidilen yön,
   * `speed` temel hız, dönen çarpan o anki hız katsayısı. Duvardan sekme
   * moveEnemy içinde olur ve heading'i günceller.
   */
  private steerEnemy(enemy: Enemy, dt: number): void {
    enemy.timer += dt;
    let angle = enemy.heading;
    let factor = 1;

    switch (enemy.behavior) {
      case 'bouncer':
      case 'splitter':
        // Düz gider, duvardan seker. Bölünme handleSplits içinde.
        break;

      case 'slither':
        // Gövde yönü korunur, yalnızca yana kıvrılır.
        angle = enemy.heading + Math.sin(enemy.timer * 5) * 0.9;
        break;

      case 'pulse': {
        // Denizanası: iter, sürüklenir, yeniden iter.
        enemy.heading += (this.rng.next() - 0.5) * 1.2 * dt;
        const beat = Math.sin(enemy.timer * 2.4);
        factor = beat > 0 ? 0.3 + beat * 1.3 : 0.15;
        angle = enemy.heading;
        break;
      }

      case 'dasher':
        // Bekler, sonra rastgele bir hatta atılır.
        if (enemy.timer >= (enemy.phase === 0 ? 0.9 : 0.75)) {
          enemy.timer = 0;
          enemy.phase = enemy.phase === 0 ? 1 : 0;
          if (enemy.phase === 1) enemy.heading = this.rng.range(0, Math.PI * 2);
        }
        factor = enemy.phase === 0 ? 0.05 : 2.2;
        angle = enemy.heading;
        break;

      case 'hopper':
        // Oyuncuya doğru kısa sıçramalar.
        if (enemy.timer >= (enemy.phase === 0 ? 0.5 : 0.3)) {
          enemy.timer = 0;
          enemy.phase = enemy.phase === 0 ? 1 : 0;
          if (enemy.phase === 1) {
            enemy.heading = this.angleToPlayer(enemy) + (this.rng.next() - 0.5) * 0.6;
          }
        }
        factor = enemy.phase === 0 ? 0.12 : 2.4;
        angle = enemy.heading;
        break;

      case 'crawler': {
        // Temizlenmiş dokunun sınırını yoklar: duvara değdiyse teğet geçer,
        // değmediyse oyuncuya yönelir. Güvenli bölgenin kenarında dolaşır.
        const wall = this.wallDirection(enemy);
        if (wall === null) {
          enemy.heading += clampAngle(this.angleToPlayer(enemy) - enemy.heading, 1.1 * dt);
        } else {
          enemy.heading = this.slideAlongWall(enemy, wall);
        }
        factor = 0.85;
        angle = enemy.heading;
        break;
      }

      case 'stalker':
        // Israrlı takip.
        enemy.heading += clampAngle(
          this.angleToPlayer(enemy) - enemy.heading,
          this.mission.difficulty.hunterTurn * dt
        );
        angle = enemy.heading;
        break;

      case 'spinner': {
        // Çapasının çevresinde dönerek alanı tarar.
        const anchor = enemy.anchor ?? { x: enemy.x, y: enemy.y };
        const radial = Math.atan2(enemy.y - anchor.y, enemy.x - anchor.x);
        const distance = Math.hypot(enemy.y - anchor.y, enemy.x - anchor.x);
        // Yarıçapı koru: uzaklaştıysa içe, yaklaştıysa dışa kır.
        const pull = distance > 11 ? -0.55 : distance < 6 ? 0.55 : 0;
        enemy.heading = radial + Math.PI / 2 + pull;
        factor = 1.1;
        angle = enemy.heading;
        break;
      }

      case 'charger':
        // Ağır ağır dolaşır, sonra hücum eder.
        if (enemy.timer >= (enemy.phase === 0 ? 3.2 : 1.3)) {
          enemy.timer = 0;
          enemy.phase = enemy.phase === 0 ? 1 : 0;
          if (enemy.phase === 1) enemy.heading = this.angleToPlayer(enemy);
        }
        if (enemy.phase === 0) {
          enemy.heading += (this.rng.next() - 0.5) * 1.8 * dt;
          factor = 0.5;
        } else {
          factor = 2.3;
        }
        angle = enemy.heading;
        break;

      case 'weaver':
        // Sekiz çizerek gezinir: iki eksende farklı frekans.
        enemy.vx = Math.cos(enemy.timer * 0.85) * enemy.speed;
        enemy.vy = Math.sin(enemy.timer * 1.7) * enemy.speed;
        enemy.heading = Math.atan2(enemy.vy, enemy.vx);
        return;
    }

    enemy.vx = Math.cos(angle) * enemy.speed * factor;
    enemy.vy = Math.sin(angle) * enemy.speed * factor;
  }

  /** Düşmandan gemiye olan açı. */
  private angleToPlayer(enemy: Enemy): number {
    return Math.atan2(this.player.y + 0.5 - enemy.y, this.player.x + 0.5 - enemy.x);
  }

  /**
   * Yakındaki temizlenmiş dokunun yönü (radyan); yakında yoksa null.
   * Duvarda gezen türler bunu kullanarak sınırı takip eder.
   */
  private wallDirection(enemy: Enemy): number | null {
    const { field } = this;
    const cx = Math.floor(enemy.x);
    const cy = Math.floor(enemy.y);
    let sumX = 0;
    let sumY = 0;
    let hits = 0;

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (field.inBounds(x, y) && field.get(x, y) !== FILLED) continue;
        sumX += dx;
        sumY += dy;
        hits++;
      }
    }

    return hits === 0 ? null : Math.atan2(sumY, sumX);
  }

  /** Duvarın teğeti: mevcut yöne en yakın olanı seçer, sınıra hafifçe yapışır. */
  private slideAlongWall(enemy: Enemy, wall: number): number {
    const options = [wall + Math.PI / 2, wall - Math.PI / 2];
    let best = options[0];
    let bestDiff = Infinity;
    for (const option of options) {
      const diff = Math.abs(clampAngle(option - enemy.heading, Math.PI));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = option;
      }
    }
    return best + clampAngle(wall - best, 0.3);
  }

  /** Bölünen türler zamanla çoğalır; her kopya bir öncekinden küçük olur. */
  private handleSplits(): void {
    const born: Enemy[] = [];

    for (const enemy of this.enemies) {
      if (enemy.behavior !== 'splitter') continue;
      if (enemy.timer < SPLIT_INTERVAL) continue;
      enemy.timer = 0;
      if (enemy.radius < MIN_SPLIT_RADIUS) continue;
      if (this.enemies.length + born.length >= MAX_ENEMIES) continue;

      enemy.radius *= 0.78;
      enemy.heading += 0.7;
      const child: Enemy = {
        ...enemy,
        id: this.nextEnemyId++,
        heading: enemy.heading - 1.4,
        timer: 0,
        x: enemy.x + Math.cos(enemy.heading - 1.4) * enemy.radius,
        y: enemy.y + Math.sin(enemy.heading - 1.4) * enemy.radius,
      };
      child.vx = Math.cos(child.heading) * child.speed;
      child.vy = Math.sin(child.heading) * child.speed;
      born.push(child);
      this.events.push({ type: 'enemy-split', species: enemy.species });
    }

    this.enemies.push(...born);
  }

  private moveEnemy(enemy: Enemy, dt: number): void {
    const { field } = this;
    const nx = enemy.x + enemy.vx * dt;
    const cellY = Math.floor(enemy.y);
    const nextX = Math.floor(nx);
    let bounced = false;
    if (!field.inBounds(nextX, cellY) || field.get(nextX, cellY) === FILLED) {
      enemy.vx = -enemy.vx;
      bounced = true;
    } else {
      enemy.x = nx;
    }

    const ny = enemy.y + enemy.vy * dt;
    const cellX = Math.floor(enemy.x);
    const nextY = Math.floor(ny);
    if (!field.inBounds(cellX, nextY) || field.get(cellX, nextY) === FILLED) {
      enemy.vy = -enemy.vy;
      bounced = true;
    } else {
      enemy.y = ny;
    }

    // Sekme yönü değiştirdi: davranışlar heading üzerinden çalıştığı için eşitle.
    if (bounced) enemy.heading = Math.atan2(enemy.vy, enemy.vx);

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
    const { spawnInterval } = this.mission.difficulty;
    if (spawnInterval <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = spawnInterval;
    if (this.enemies.length >= MAX_ENEMIES) return;
    this.enemies.push(this.createEnemy(this.mission.spawn));
  }

  private createEnemy(id: SpeciesId, at?: Vec): Enemy {
    const species = speciesOf(id);
    const position = at ?? this.findSpawnPoint();
    const heading = this.rng.range(0, Math.PI * 2);
    const speed = this.mission.difficulty.speed * species.speed;

    return {
      id: this.nextEnemyId++,
      kind: species.kind,
      species: species.id,
      behavior: species.behavior,
      x: position.x,
      y: position.y,
      vx: Math.cos(heading) * speed,
      vy: Math.sin(heading) * speed,
      heading,
      speed,
      // Aynı türden düşmanlar aynı anda hareket etmesin diye sayaç kaydırılır.
      timer: this.rng.range(0, 2),
      phase: 0,
      anchor: species.behavior === 'spinner' ? { x: position.x, y: position.y } : undefined,
      radius: species.radius,
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
    // Kalkan mikrop/virüs darbesini emer; kendi izine girmek affedilmez.
    if (cause !== 'self' && this.shield > 0) {
      this.absorbHit();
      return;
    }

    clearTrail(this.field, this.trail);
    this.trail = [];
    this.player.drawing = false;
    this.stepAccumulator = 0;
    this.shots = [];
    this.lives -= 1;

    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = 'gameOver';
      this.events.push({ type: 'death', cause, livesLeft: 0 });
      this.events.push({ type: 'game-over', score: this.score, level: this.level });
      return;
    }

    this.phase = 'dying';
    this.freeze = this.stats.deathFreeze;
    this.events.push({ type: 'death', cause, livesLeft: this.lives });
  }

  /**
   * Kalkanlı darbe: iz silinir, gemi güvenli kenara çekilir, kısa süre
   * dokunulmaz olur — ama can gitmez.
   */
  private absorbHit(): void {
    clearTrail(this.field, this.trail);
    this.trail = [];
    this.player.drawing = false;
    this.stepAccumulator = 0;
    this.shield -= 1;
    this.shieldTimer = this.stats.shieldRecharge;
    this.invulnerable = Math.max(
      this.invulnerable,
      RESPAWN_INVULN * 0.75 + this.stats.invulnBonus
    );
    this.moveToNearestEdge();
    this.events.push({ type: 'shield-hit', chargesLeft: this.shield });
  }

  private respawn(): void {
    const spot = this.field.isEdge(this.trailStart.x, this.trailStart.y)
      ? this.trailStart
      : this.findEdgeSpot();
    this.player.x = spot.x;
    this.player.y = spot.y;
    this.player.dx = 0;
    this.player.dy = -1;
    this.invulnerable = RESPAWN_INVULN + this.stats.invulnBonus;
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
    const gold = this.plan.reward;
    this.score += bonus;
    this.gold += gold;
    this.phase = 'levelClear';
    this.freeze = LEVEL_CLEAR_FREEZE;
    this.events.push({ type: 'level-clear', level: this.level, percent, bonus, gold });
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
