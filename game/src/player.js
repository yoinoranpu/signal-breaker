import { clamp } from './utils.js';

const SPRITE_SIZE = 32;

export function createDefaultStats() {
  return {
    damageMult: 1,
    fireInterval: 0.28,
    threeWay: false,
    followLerp: 0.25,
    hitRadius: 4,
    invulnTime: 2.0,
    bulletSpeed: 600,
    shieldCharges: 0,
    pierceCount: 0,
    escortCount: 0,
    homingEvery: 0,
    pulseInterval: 0,
    splitCount: 0,
    bounce: false,
  };
}

export class Player {
  constructor(gameWidth, gameHeight, sprite) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.sprite = sprite;
    this.stats = createDefaultStats();
    this.spriteSize = SPRITE_SIZE;

    this.lives = 3;
    this.invulnTimer = 0;
    this.fireTimer = 0;
    this.shotCount = 0;
    this.shieldPopFlash = 0;
    this.tempBoostTimer = 0;

    this.reset();
  }

  reset() {
    this.stats = createDefaultStats();
    this.lives = 3;
    this.invulnTimer = 2.0; // 開始直後も少しだけ無敵
    this.fireTimer = 0;
    this.shotCount = 0;
    this.shieldPopFlash = 0;
    this.tempBoostTimer = 0;
    this.x = this.gameWidth / 2;
    this.y = this.gameHeight - 100;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  get hitRadius() {
    return this.stats.hitRadius;
  }

  get isInvulnerable() {
    return this.invulnTimer > 0;
  }

  getDamageMultiplier() {
    return this.stats.damageMult * (this.tempBoostTimer > 0 ? 1.6 : 1);
  }

  setTarget(x, y) {
    const margin = this.stats.hitRadius;
    this.targetX = clamp(x, margin, this.gameWidth - margin);
    this.targetY = clamp(y, margin, this.gameHeight - margin);
  }

  applyUpgrade(mutate) {
    mutate(this.stats);
  }

  // シールドで防いだら'shielded'、被弾して残機が減れば'hit'、無敵中ならfalseを返す
  takeHit() {
    if (this.isInvulnerable) return false;
    if (this.stats.shieldCharges > 0) {
      this.stats.shieldCharges -= 1;
      this.invulnTimer = 0.6;
      this.shieldPopFlash = 0.3;
      return 'shielded';
    }
    this.lives -= 1;
    this.invulnTimer = this.stats.invulnTime;
    return 'hit';
  }

  update(dt) {
    const t = 1 - Math.pow(1 - this.stats.followLerp, dt * 60);
    this.x += (this.targetX - this.x) * t;
    this.y += (this.targetY - this.y) * t;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.shieldPopFlash > 0) this.shieldPopFlash -= dt;
    if (this.tempBoostTimer > 0) this.tempBoostTimer -= dt;
    this.fireTimer -= dt;
  }

  // 発射タイミングが来ていれば {angles, isHoming} を返す(真上=-90度基準の相対角)
  tryFire() {
    if (this.fireTimer > 0) return null;
    this.fireTimer = this.stats.fireInterval;
    this.shotCount += 1;

    const isHoming = this.stats.homingEvery > 0 && this.shotCount % this.stats.homingEvery === 0;

    if (this.stats.threeWay) {
      return { angles: [-Math.PI / 2 - 0.26, -Math.PI / 2, -Math.PI / 2 + 0.26], isHoming };
    }
    return { angles: [-Math.PI / 2], isHoming };
  }

  draw(ctx) {
    const half = this.spriteSize / 2;
    const blinking = this.isInvulnerable && Math.floor(this.invulnTimer / 0.1) % 2 === 0;
    if (!blinking && this.sprite.complete && this.sprite.naturalWidth > 0) {
      ctx.drawImage(this.sprite, this.x - half, this.y - half, this.spriteSize, this.spriteSize);
    }

    if (this.tempBoostTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 138, 61, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, half + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.stats.shieldCharges > 0 || this.shieldPopFlash > 0) {
      ctx.save();
      ctx.strokeStyle = this.shieldPopFlash > 0 ? '#ffffff' : 'rgba(74, 217, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, half + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.stats.hitRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
