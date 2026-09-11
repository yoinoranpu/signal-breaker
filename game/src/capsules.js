import { GAME_HEIGHT } from './constants.js';
import { circleHit } from './utils.js';

const DRIFT_SPEED = 55;
const RADIUS = 10;

const COLORS = {
  speed: '#4ad9ff',
  shield: '#7dffb0',
  power: '#ff8a3d',
};

const LETTERS = {
  speed: 'S',
  shield: 'B',
  power: 'P',
};

// 通常撃破からたまに流れてくる軽量な即時強化カプセル(3択の大きな強化とは別枠)
export class CapsuleManager {
  constructor() {
    this.items = [];
  }

  reset() {
    this.items = [];
  }

  spawn(x, y, kind) {
    this.items.push({ x, y, kind, active: true });
  }

  update(dt, player, onPickup) {
    for (const c of this.items) {
      if (!c.active) continue;
      c.y += DRIFT_SPEED * dt;
      if (c.y > GAME_HEIGHT + 30) {
        c.active = false;
        continue;
      }
      if (circleHit(c.x, c.y, RADIUS, player.x, player.y, player.hitRadius)) {
        c.active = false;
        onPickup(c.kind, c.x, c.y);
      }
    }
    this.items = this.items.filter((c) => c.active);
  }

  draw(ctx) {
    for (const c of this.items) {
      ctx.save();
      ctx.shadowColor = COLORS[c.kind];
      ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS[c.kind];
      ctx.beginPath();
      ctx.arc(c.x, c.y, RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#0a0e18';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(LETTERS[c.kind], c.x, c.y + 3);
      ctx.textAlign = 'left';
    }
  }
}

export function randomCapsuleKind() {
  const kinds = ['speed', 'shield', 'power'];
  return kinds[Math.floor(Math.random() * kinds.length)];
}
