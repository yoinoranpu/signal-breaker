import { clamp } from './utils.js';

const SPRITE_SIZE = 32;

export function createDefaultStats() {
  return {
    damageMult: 1,
    fireInterval: 0.15,
    threeWay: false,
    followLerp: 0.25,
    hitRadius: 4,
    invulnTime: 2.0,
    bulletSpeed: 600,
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

    this.reset();
  }

  reset() {
    this.stats = createDefaultStats();
    this.lives = 3;
    this.invulnTimer = 2.0; // 開始直後も少しだけ無敵
    this.fireTimer = 0;
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

  setTarget(x, y) {
    const margin = this.stats.hitRadius;
    this.targetX = clamp(x, margin, this.gameWidth - margin);
    this.targetY = clamp(y, margin, this.gameHeight - margin);
  }

  applyUpgrade(mutate) {
    mutate(this.stats);
  }

  takeHit() {
    if (this.isInvulnerable) return false;
    this.lives -= 1;
    this.invulnTimer = this.stats.invulnTime;
    return true;
  }

  update(dt) {
    const t = 1 - Math.pow(1 - this.stats.followLerp, dt * 60);
    this.x += (this.targetX - this.x) * t;
    this.y += (this.targetY - this.y) * t;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    this.fireTimer -= dt;
  }

  // 発射タイミングが来ていれば発射角度の配列を返す(自機の中心からの相対角、真上=-90度基準)
  tryFire() {
    if (this.fireTimer > 0) return null;
    this.fireTimer = this.stats.fireInterval;
    if (this.stats.threeWay) {
      return [-Math.PI / 2 - 0.26, -Math.PI / 2, -Math.PI / 2 + 0.26];
    }
    return [-Math.PI / 2];
  }

  draw(ctx) {
    const half = this.spriteSize / 2;
    const blinking = this.isInvulnerable && Math.floor(this.invulnTimer / 0.1) % 2 === 0;
    if (!blinking && this.sprite.complete && this.sprite.naturalWidth > 0) {
      ctx.drawImage(this.sprite, this.x - half, this.y - half, this.spriteSize, this.spriteSize);
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.stats.hitRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
