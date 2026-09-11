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
    desc: '発射間隔を大きく短縮',
    icon: 'firerate',
    apply(stats) {
      stats.fireInterval = Math.max(0.08, stats.fireInterval * 0.72);
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
  {
    id: 'escort',
    name: 'エスコート機',
    desc: '左右に僚機がついて援護射撃(最大2機)',
    icon: 'escort',
    apply(stats) {
      stats.escortCount = Math.min(2, stats.escortCount + 1);
    },
  },
  {
    id: 'homing',
    name: '誘導弾',
    desc: '一定間隔で自弾が敵を追尾する(取得済みなら頻度アップ)',
    icon: 'homing',
    apply(stats) {
      stats.homingEvery = stats.homingEvery === 0 ? 5 : Math.max(2, stats.homingEvery - 1);
    },
  },
  {
    id: 'pierce',
    name: '貫通弾',
    desc: '自弾が敵を貫通するようになる(取得済みならさらに+1体)',
    icon: 'pierce',
    apply(stats) {
      stats.pierceCount += 1;
    },
  },
  {
    id: 'barrier',
    name: 'バリア',
    desc: '被弾を1回無効化するシールドを1枚獲得',
    icon: 'barrier',
    apply(stats, player) {
      player.stats.shieldCharges = Math.min(3, player.stats.shieldCharges + 1);
    },
  },
  {
    id: 'pulse',
    name: 'パルスウェーブ',
    desc: '一定間隔で自機周囲の敵弾を消し敵にダメージ(取得済みなら間隔短縮)',
    icon: 'pulse',
    apply(stats) {
      stats.pulseInterval = stats.pulseInterval === 0 ? 9 : Math.max(4, stats.pulseInterval - 2);
    },
  },
  {
    id: 'split',
    name: 'スプリット弾',
    desc: '命中した自弾が分裂して追加の弾になる(取得済みなら分裂数アップ)',
    icon: 'split',
    apply(stats) {
      stats.splitCount = Math.min(3, stats.splitCount + 1);
    },
  },
  {
    id: 'bounce',
    name: '反射弾',
    desc: '自弾が画面の左右の壁で跳ね返るようになる',
    icon: 'bounce',
    apply(stats) {
      stats.bounce = true;
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
const ITEM_DRIFT_SPEED = 45;

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
      item.y += ITEM_DRIFT_SPEED * dt;
      if (item.y > GAME_HEIGHT + 40) {
        item.active = false;
        continue;
      }
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
const CARD_HEIGHT = 192;
const CARD_GAP = 16;

export class UpgradeMenu {
  constructor(icons) {
    this.icons = icons; // 画像アイコン(既存8種)
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

  drawIcon(ctx, key, cx, cy, size) {
    const img = this.icons[key];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      return;
    }
    drawProceduralIcon(ctx, key, cx, cy, size);
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

      this.drawIcon(ctx, opt.icon, r.x + r.w / 2, r.y + 46, 64);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      wrapText(ctx, opt.name, r.x + r.w / 2, r.y + 108, r.w - 12, 16);

      ctx.fillStyle = '#9fb3d9';
      ctx.font = '11px sans-serif';
      wrapText(ctx, opt.desc, r.x + r.w / 2, r.y + 138, r.w - 16, 14);
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

// 画像アセットがない新規アビリティ用の簡易ベクターアイコン
function drawProceduralIcon(ctx, key, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = 2.5;
  const s = size / 2;

  if (key === 'escort') {
    ctx.fillStyle = '#4ad9ff';
    drawTriangle(ctx, 0, -s * 0.5, s * 0.55);
    ctx.globalAlpha = 0.6;
    drawTriangle(ctx, -s * 0.7, s * 0.3, s * 0.35);
    drawTriangle(ctx, s * 0.7, s * 0.3, s * 0.35);
    ctx.globalAlpha = 1;
  } else if (key === 'homing') {
    ctx.strokeStyle = '#ff6ec7';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(s, 0);
    ctx.moveTo(0, -s);
    ctx.lineTo(0, s);
    ctx.stroke();
  } else if (key === 'pierce') {
    ctx.strokeStyle = '#ffd166';
    for (const off of [-s * 0.5, 0, s * 0.5]) {
      ctx.beginPath();
      ctx.arc(off, 0, s * 0.32, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(s, 0);
    ctx.stroke();
  } else if (key === 'barrier') {
    ctx.strokeStyle = '#7dffb0';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    for (let i = 1; i <= 6; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#7dffb0';
    ctx.fill();
  } else if (key === 'split') {
    ctx.strokeStyle = '#4ad9ff';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.8);
    ctx.lineTo(0, 0);
    ctx.lineTo(-s * 0.7, -s * 0.8);
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.7, -s * 0.8);
    ctx.stroke();
    ctx.fillStyle = '#4ad9ff';
    for (const [dx, dy] of [
      [0, s * 0.8],
      [-s * 0.7, -s * 0.8],
      [s * 0.7, -s * 0.8],
    ]) {
      ctx.beginPath();
      ctx.arc(dx, dy, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === 'bounce') {
    ctx.strokeStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, -s * 0.6);
    ctx.lineTo(0, s * 0.6);
    ctx.lineTo(s * 0.8, -s * 0.6);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(s * 0.85, -s);
    ctx.lineTo(s * 0.85, s);
    ctx.stroke();
  } else if (key === 'pulse') {
    ctx.strokeStyle = '#c084fc';
    for (const r of [0.3, 0.55, 0.8]) {
      ctx.globalAlpha = 1 - r * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, s * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawTriangle(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x - s * 0.7, y + s * 0.7);
  ctx.lineTo(x + s * 0.7, y + s * 0.7);
  ctx.closePath();
  ctx.fill();
}
