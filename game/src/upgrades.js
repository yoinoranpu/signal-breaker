import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { circleHit } from './utils.js';

export const UPGRADE_POOL = [
  {
    id: 'atk',
    name: '攻撃力アップ',
    desc: '自弾威力 +30%',
    icon: 'atk',
    apply(stats) {
      stats.damageMult += 0.3;
    },
  },
  {
    id: 'firerate',
    name: '連射速度アップ',
    desc: '発射間隔を短縮',
    icon: 'firerate',
    apply(stats) {
      stats.fireInterval = Math.max(0.05, stats.fireInterval - 0.05);
    },
  },
  {
    id: 'threeway',
    name: '3WAY化',
    desc: '正面+斜め2発(取得済みなら威力+20%)',
    icon: '3way',
    apply(stats) {
      if (!stats.threeWay) {
        stats.threeWay = true;
      } else {
        stats.damageMult += 0.2;
      }
    },
  },
  {
    id: 'tracking',
    name: '移動追従アップ',
    desc: '自機の追従が速くなり避けやすくなる',
    icon: 'tracking',
    apply(stats) {
      stats.followLerp = Math.min(0.9, stats.followLerp + 0.1);
    },
  },
  {
    id: 'hitbox',
    name: '当たり判定縮小',
    desc: '被弾しにくくなる',
    icon: 'hitbox',
    apply(stats) {
      stats.hitRadius = Math.max(1, stats.hitRadius - 1);
    },
  },
  {
    id: 'invuln',
    name: '無敵延長',
    desc: '被弾後の無敵時間が伸びる',
    icon: 'invuln',
    apply(stats) {
      stats.invulnTime += 0.8;
    },
  },
  {
    id: 'life',
    name: '残機+1',
    desc: '残機が1機増える',
    icon: 'life',
    apply(stats, player) {
      player.lives += 1;
    },
  },
  {
    id: 'bulletspeed',
    name: '弾速アップ',
    desc: '自弾の速度が上がる',
    icon: 'bulletspeed',
    apply(stats) {
      stats.bulletSpeed += 150;
    },
  },
];

export function pickRandomThree() {
  const pool = [...UPGRADE_POOL];
  const picked = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
  }
  return picked;
}

const ITEM_RADIUS = 16;
const ITEM_DRAW_SIZE = 34;

export class ItemDropManager {
  constructor(sprite) {
    this.sprite = sprite;
    this.items = [];
  }

  reset() {
    this.items = [];
  }

  spawn(x, y) {
    this.items.push({ x, y, age: 0, active: true });
  }

  update(dt, player, onPickup) {
    for (const item of this.items) {
      if (!item.active) continue;
      item.age += dt;
      if (circleHit(item.x, item.y, ITEM_RADIUS, player.x, player.y, player.hitRadius)) {
        item.active = false;
        onPickup();
      }
    }
    this.items = this.items.filter((i) => i.active);
  }

  draw(ctx) {
    if (!this.sprite.complete || this.sprite.naturalWidth === 0) return;
    const half = ITEM_DRAW_SIZE / 2;
    for (const item of this.items) {
      const bob = Math.sin(item.age * 3) * 4;
      ctx.drawImage(this.sprite, item.x - half, item.y - half + bob, ITEM_DRAW_SIZE, ITEM_DRAW_SIZE);
    }
  }
}

const CARD_WIDTH = 130;
const CARD_HEIGHT = 170;
const CARD_GAP = 16;

export class UpgradeMenu {
  constructor(icons) {
    this.icons = icons; // { atk, firerate, '3way', tracking, hitbox, invuln, life, bulletspeed }
    this.active = false;
    this.options = [];
    this.cardRects = [];
  }

  open() {
    this.options = pickRandomThree();
    this.active = true;

    const totalWidth = CARD_WIDTH * 3 + CARD_GAP * 2;
    const startX = (GAME_WIDTH - totalWidth) / 2;
    const y = (GAME_HEIGHT - CARD_HEIGHT) / 2;
    this.cardRects = this.options.map((_, i) => ({
      x: startX + i * (CARD_WIDTH + CARD_GAP),
      y,
      w: CARD_WIDTH,
      h: CARD_HEIGHT,
    }));
  }

  handleClick(x, y) {
    if (!this.active) return null;
    for (let i = 0; i < this.cardRects.length; i++) {
      const r = this.cardRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        const chosen = this.options[i];
        this.active = false;
        return chosen;
      }
    }
    return null;
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.fillStyle = 'rgba(2, 4, 10, 0.75)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = '#8fd6ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('強化を1つ選択', GAME_WIDTH / 2, this.cardRects[0].y - 24);

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];
      const r = this.cardRects[i];

      ctx.fillStyle = '#131a2b';
      ctx.strokeStyle = '#4ad9ff';
      ctx.lineWidth = 2;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      const icon = this.icons[opt.icon];
      if (icon && icon.complete && icon.naturalWidth > 0) {
        const iconSize = 64;
        ctx.drawImage(icon, r.x + (r.w - iconSize) / 2, r.y + 14, iconSize, iconSize);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      wrapText(ctx, opt.name, r.x + r.w / 2, r.y + 100, r.w - 12, 16);

      ctx.fillStyle = '#9fb3d9';
      ctx.font = '11px sans-serif';
      wrapText(ctx, opt.desc, r.x + r.w / 2, r.y + 130, r.w - 16, 14);
    }

    ctx.textAlign = 'left';
  }
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  const lines = [];
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}
