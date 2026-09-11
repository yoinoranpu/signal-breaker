import { GAME_WIDTH } from './constants.js';
import { circleHit } from './utils.js';
import { trySpawnSplit } from './bullets.js';

const MAX_HP = 120;
const RADIUS = 60;
const DRAW_SIZE = 150;
const REST_Y = 170;
const BULLET_SPEED = 230;

export class Boss {
  constructor(sprites) {
    this.sprites = { phase1: sprites.phase1, phase2: sprites.phase2 };
    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.x = GAME_WIDTH / 2;
    this.y = -120;
    this.phase = 1;
    this.age = 0;
    this.enterDone = false;
    this.invulnTimer = 0;
    this.transitioning = false;

    this.aimTimer = 0;
    this.spreadTimer = 0;
    this.patternTimer = 0;
    this.activePattern = 'aim3';
    this.spiralAngle = 0;
    this.spiralFireTimer = 0;

    this.defeated = false;
    this.driftDir = 1;
    this.justTransitioned = false;
  }

  get hpRatio() {
    return Math.max(0, this.hp / this.maxHp);
  }

  update(dt, { enemyBullets, player, playerBullets }) {
    this.age += dt;

    if (!this.enterDone) {
      this.y += 120 * dt;
      if (this.y >= REST_Y) {
        this.y = REST_Y;
        this.enterDone = true;
      }
      return;
    }

    // 左右にゆっくりドリフト(演出)
    this.x += this.driftDir * 20 * dt;
    if (this.x > GAME_WIDTH - 90) this.driftDir = -1;
    if (this.x < 90) this.driftDir = 1;

    if (this.transitioning) {
      this.invulnTimer -= dt;
      if (this.invulnTimer <= 0) {
        this.transitioning = false;
        this.phase = 2;
      }
      return;
    }

    if (this.phase === 1) {
      this.updatePhase1(dt, enemyBullets, player);
    } else {
      this.updatePhase2(dt, enemyBullets, player);
    }

    if (!this.defeated) {
      this.checkPlayerBullets(playerBullets);
    }
  }

  updatePhase1(dt, enemyBullets, player) {
    this.aimTimer -= dt;
    if (this.aimTimer <= 0) {
      this.aimTimer = 1.2;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      enemyBullets.spawnAngle(this.x, this.y, angle - 0.35, BULLET_SPEED);
      enemyBullets.spawnAngle(this.x, this.y, angle, BULLET_SPEED);
      enemyBullets.spawnAngle(this.x, this.y, angle + 0.35, BULLET_SPEED);
    }

    this.spreadTimer -= dt;
    if (this.spreadTimer <= 0) {
      this.spreadTimer = 3.3;
      const count = 12;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count;
        enemyBullets.spawnAngle(this.x, this.y, a, BULLET_SPEED * 0.8);
      }
    }
  }

  updatePhase2(dt, enemyBullets, player) {
    this.patternTimer -= dt;
    if (this.patternTimer <= 0) {
      this.patternTimer = 4;
      this.activePattern = this.activePattern === 'spiral' ? 'aim3' : 'spiral';
    }

    if (this.activePattern === 'spiral') {
      this.spiralFireTimer -= dt;
      if (this.spiralFireTimer <= 0) {
        this.spiralFireTimer = 0.06;
        this.spiralAngle += 0.28;
        enemyBullets.spawnAngle(this.x, this.y, this.spiralAngle, BULLET_SPEED);
        enemyBullets.spawnAngle(this.x, this.y, this.spiralAngle + Math.PI, BULLET_SPEED);
      }
    } else {
      this.aimTimer -= dt;
      if (this.aimTimer <= 0) {
        this.aimTimer = 0.8;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        enemyBullets.spawnAngle(this.x, this.y, angle - 0.35, BULLET_SPEED);
        enemyBullets.spawnAngle(this.x, this.y, angle, BULLET_SPEED);
        enemyBullets.spawnAngle(this.x, this.y, angle + 0.35, BULLET_SPEED);
      }
    }
  }

  checkPlayerBullets(playerBullets) {
    for (const b of playerBullets.bullets) {
      if (!b.active) continue;
      if (circleHit(this.x, this.y, RADIUS, b.x, b.y, playerBullets.radius)) {
        trySpawnSplit(b, playerBullets);
        if (b.pierceLeft > 0) b.pierceLeft -= 1;
        else b.active = false;
        this.hp -= b.damage;
        if (this.phase === 1 && this.hp <= this.maxHp / 2 && !this.transitioning) {
          this.transitioning = true;
          this.justTransitioned = true;
          this.invulnTimer = 1.0;
        }
        if (this.hp <= 0) {
          this.hp = 0;
          this.defeated = true;
        }
      }
    }
  }

  draw(ctx) {
    const sprite = this.phase === 1 ? this.sprites.phase1 : this.sprites.phase2;
    if (!sprite.complete || sprite.naturalWidth === 0) return;
    const half = DRAW_SIZE / 2;

    const flash = this.transitioning && Math.floor(this.age / 0.08) % 2 === 0;
    ctx.save();
    if (flash) ctx.globalAlpha = 0.4;
    ctx.drawImage(sprite, this.x - half, this.y - half, DRAW_SIZE, DRAW_SIZE);
    ctx.restore();
  }
}
