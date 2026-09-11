import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

const OFFSCREEN_MARGIN = 40;

// 自弾/敵弾で使い回すオブジェクトプール(生成・破棄コストを避ける)
export class BulletPool {
  constructor(sprite, { radius, drawWidth, drawHeight, faceUp = false }) {
    this.sprite = sprite;
    this.radius = radius;
    this.drawWidth = drawWidth;
    this.drawHeight = drawHeight;
    this.faceUp = faceUp; // スプライトが初期状態で上向きなら角度に合わせて回転させる
    this.bullets = [];
  }

  spawn(x, y, vx, vy, damage = 1, options = {}) {
    let b = this.bullets.find((b) => !b.active);
    if (!b) {
      b = { active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 1 };
      this.bullets.push(b);
    }
    b.active = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.damage = damage;
    b.pierceLeft = options.pierce || 0;
    b.homing = !!options.homing;
    b.splitLeft = options.split || 0;
    b.hasSplit = false;
    b.bounce = !!options.bounce;
    b.grazed = false;
    return b;
  }

  spawnAngle(x, y, angleRad, speed, damage = 1, options = {}) {
    return this.spawn(x, y, Math.cos(angleRad) * speed, Math.sin(angleRad) * speed, damage, options);
  }

  update(dt) {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.bounce) {
        if (b.x < 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
        } else if (b.x > GAME_WIDTH) {
          b.x = GAME_WIDTH;
          b.vx = -Math.abs(b.vx);
        }
      }

      if (
        b.x < -OFFSCREEN_MARGIN ||
        b.x > GAME_WIDTH + OFFSCREEN_MARGIN ||
        b.y < -OFFSCREEN_MARGIN ||
        b.y > GAME_HEIGHT + OFFSCREEN_MARGIN
      ) {
        b.active = false;
      }
    }
  }

  draw(ctx) {
    if (!this.sprite.complete || this.sprite.naturalWidth === 0) return;
    const hw = this.drawWidth / 2;
    const hh = this.drawHeight / 2;
    for (const b of this.bullets) {
      if (!b.active) continue;
      if (this.faceUp) {
        const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.drawImage(this.sprite, -hw, -hh, this.drawWidth, this.drawHeight);
        ctx.restore();
      } else {
        ctx.drawImage(this.sprite, b.x - hw, b.y - hh, this.drawWidth, this.drawHeight);
      }
    }
  }

  clear() {
    for (const b of this.bullets) b.active = false;
  }
}

// 命中した弾から分裂弾を発生させる(1発につき1回のみ)
export function trySpawnSplit(b, pool) {
  if (b.splitLeft <= 0 || b.hasSplit) return;
  b.hasSplit = true;
  const pairs = Math.min(3, b.splitLeft);
  const baseAngle = Math.atan2(b.vy, b.vx);
  const speed = Math.hypot(b.vx, b.vy);
  for (let i = 1; i <= pairs; i++) {
    const offset = ((Math.PI / 180) * 15) * i;
    pool.spawnAngle(b.x, b.y, baseAngle - offset, speed, b.damage * 0.5);
    pool.spawnAngle(b.x, b.y, baseAngle + offset, speed, b.damage * 0.5);
  }
}
