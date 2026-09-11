const DRAW_WIDTH = 18;
const OFFSET_X = 24;
const OFFSET_Y = 12;
const FIRE_INTERVAL = 0.4;

export class EscortManager {
  constructor(sprite) {
    this.sprite = sprite;
    this.ships = [];
  }

  reset() {
    this.ships = [];
  }

  sync(count) {
    while (this.ships.length < count) {
      const side = this.ships.length % 2 === 0 ? -1 : 1;
      this.ships.push({ side, x: 0, y: 0, fireTimer: Math.random() * FIRE_INTERVAL, ready: false });
    }
    while (this.ships.length > count) this.ships.pop();
  }

  update(dt, player, playerBullets, damageMult) {
    for (const s of this.ships) {
      const targetX = player.x + s.side * OFFSET_X;
      const targetY = player.y + OFFSET_Y;
      if (!s.ready) {
        s.x = targetX;
        s.y = targetY;
        s.ready = true;
      } else {
        s.x += (targetX - s.x) * 0.2;
        s.y += (targetY - s.y) * 0.2;
      }

      s.fireTimer -= dt;
      if (s.fireTimer <= 0) {
        s.fireTimer = FIRE_INTERVAL;
        playerBullets.spawnAngle(s.x, s.y - 10, -Math.PI / 2, 600, damageMult * 0.5);
      }
    }
  }

  draw(ctx) {
    if (!this.sprite.complete || this.sprite.naturalWidth === 0) return;
    const w = DRAW_WIDTH;
    const h = w * (this.sprite.naturalHeight / this.sprite.naturalWidth);
    for (const s of this.ships) {
      ctx.drawImage(this.sprite, s.x - w / 2, s.y - h / 2, w, h);
    }
  }
}
