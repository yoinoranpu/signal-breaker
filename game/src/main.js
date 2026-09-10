import { GAME_WIDTH, GAME_HEIGHT, STATE, BOSS_WARNING_DURATION } from './constants.js';
import { loadImage, circleHit } from './utils.js';
import { Player } from './player.js';
import { BulletPool } from './bullets.js';
import { EnemyManager } from './enemies.js';
import { Boss } from './boss.js';
import { ItemDropManager, UpgradeMenu } from './upgrades.js';
import { registerSfx, playSfx, BgmPlayer } from './audio.js';
import {
  RETRY_BUTTON,
  isPointInRect,
  drawTitle,
  drawHUD,
  drawBossHpBar,
  drawBossWarning,
  drawClear,
  drawGameOver,
} from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}
window.addEventListener('resize', resize);
resize();

// --- アセット読み込み ---
const images = {
  player: loadImage('assets/images/player.png'),
  enemyA: loadImage('assets/images/enemy_a.png'),
  enemyB: loadImage('assets/images/enemy_b.png'),
  enemyC: loadImage('assets/images/enemy_c.png'),
  bulletPlayer: loadImage('assets/images/bullet_player.png'),
  bulletEnemy: loadImage('assets/images/bullet_enemy.png'),
  bossPhase1: loadImage('assets/images/boss_phase1.png'),
  bossPhase2: loadImage('assets/images/boss_phase2.png'),
  item: loadImage('assets/images/item_drop.png'),
  logo: loadImage('assets/images/logo_title.png'),
  background: loadImage('assets/images/background.jpg'),
  upgrade: {
    atk: loadImage('assets/images/upgrade_atk.png'),
    firerate: loadImage('assets/images/upgrade_firerate.png'),
    '3way': loadImage('assets/images/upgrade_3way.png'),
    tracking: loadImage('assets/images/upgrade_tracking.png'),
    hitbox: loadImage('assets/images/upgrade_hitbox.png'),
    invuln: loadImage('assets/images/upgrade_invuln.png'),
    life: loadImage('assets/images/upgrade_life.png'),
    bulletspeed: loadImage('assets/images/upgrade_bulletspeed.png'),
  },
};

// --- サウンド ---
registerSfx('shot', 'assets/sounds/se/shot1.mp3');
registerSfx('explosion', 'assets/sounds/se/bomb1.mp3');
registerSfx('hit', 'assets/sounds/se/blow2.mp3');
registerSfx('bossTransition', 'assets/sounds/se/base-siren1.mp3');
registerSfx('clear', 'assets/sounds/se/trumpet1.mp3');
registerSfx('gameover', 'assets/sounds/se/curse-melody1.mp3');
const bgmPlayer = new BgmPlayer();

// --- ゲームオブジェクト ---
const player = new Player(GAME_WIDTH, GAME_HEIGHT, images.player);
const playerBullets = new BulletPool(images.bulletPlayer, {
  radius: 3,
  drawWidth: 6,
  drawHeight: 42,
  faceUp: true,
});
const enemyBullets = new BulletPool(images.bulletEnemy, {
  radius: 4.5,
  drawWidth: 14,
  drawHeight: 14,
  faceUp: false,
});
const enemyManager = new EnemyManager({ A: images.enemyA, B: images.enemyB, C: images.enemyC });
const itemManager = new ItemDropManager(images.item);
const upgradeMenu = new UpgradeMenu(images.upgrade);

let boss = null;
let state = STATE.TITLE;
let score = 0;
let bossWarningTimer = 0;
let bgScroll = 0;
let titleTime = 0;

function resetGame() {
  player.reset();
  playerBullets.clear();
  enemyBullets.clear();
  enemyManager.reset();
  itemManager.reset();
  boss = null;
  score = 0;
  bossWarningTimer = 0;
}

function startStage() {
  resetGame();
  state = STATE.PLAYING;
  bgmPlayer.play('stage', 'assets/sounds/bgm/stage.mp3', { volume: 0.45 });
}

// --- 入力 ---
function toInternalCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * GAME_WIDTH,
    y: ((clientY - rect.top) / rect.height) * GAME_HEIGHT,
  };
}

function onPointerMove(e) {
  const { x, y } = toInternalCoords(e.clientX, e.clientY);
  player.setTarget(x, y);
}

function onPointerDown(e) {
  bgmPlayer.unlock();
  const { x, y } = toInternalCoords(e.clientX, e.clientY);

  if (state === STATE.TITLE) {
    startStage();
  } else if (state === STATE.PLAYING && upgradeMenu.active) {
    const chosen = upgradeMenu.handleClick(x, y);
    if (chosen) chosen.apply(player.stats, player);
  } else if (state === STATE.CLEAR || state === STATE.GAMEOVER) {
    if (isPointInRect(x, y, RETRY_BUTTON)) {
      startStage();
    }
  }

  player.setTarget(x, y);
}

canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  onPointerDown(e);
});

// --- 背景描画(縦スクロールループ) ---
function drawBackground() {
  const bg = images.background;
  if (!bg.complete || bg.naturalWidth === 0) {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    return;
  }
  const drawH = GAME_WIDTH * (bg.naturalHeight / bg.naturalWidth);
  const y0 = bgScroll % drawH;
  ctx.drawImage(bg, 0, y0 - drawH, GAME_WIDTH, drawH);
  ctx.drawImage(bg, 0, y0, GAME_WIDTH, drawH);
}

// --- メインループ ---
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt) {
  if (state === STATE.TITLE) {
    titleTime += dt;
    return;
  }

  if (state === STATE.CLEAR || state === STATE.GAMEOVER) {
    return;
  }

  if (state === STATE.BOSS_WARNING) {
    bossWarningTimer += dt;
    if (bossWarningTimer >= BOSS_WARNING_DURATION) {
      boss = new Boss({ phase1: images.bossPhase1, phase2: images.bossPhase2 });
      state = STATE.PLAYING;
      bgmPlayer.play('boss', 'assets/sounds/bgm/boss.mp3', { volume: 0.5 });
    }
    return;
  }

  // STATE.PLAYING
  if (upgradeMenu.active) {
    return; // 選択中はゲーム側を一時停止
  }

  bgScroll += 40 * dt;
  player.update(dt);
  const fireAngles = player.tryFire();
  if (fireAngles) {
    for (const angle of fireAngles) {
      playerBullets.spawnAngle(player.x, player.y - 14, angle, player.stats.bulletSpeed, player.stats.damageMult);
    }
    playSfx('shot', 0.25);
  }
  playerBullets.update(dt);
  enemyBullets.update(dt);

  if (boss) {
    boss.update(dt, { enemyBullets, player, playerBullets });
    if (boss.justTransitioned) {
      boss.justTransitioned = false;
      playSfx('bossTransition', 0.6);
    }
    if (boss.defeated) {
      score += 5000;
      state = STATE.CLEAR;
      playSfx('clear', 0.7);
      bgmPlayer.play('clear', 'assets/sounds/bgm/title.mp3', { volume: 0.4 });
    }
  } else {
    enemyManager.update(dt, {
      player,
      playerBullets,
      enemyBullets,
      onScore: (v) => {
        score += v;
        playSfx('explosion', 0.35);
      },
      onItemDrop: (x, y) => itemManager.spawn(x, y),
    });

    itemManager.update(dt, player, () => upgradeMenu.open());

    if (enemyManager.isStageComplete()) {
      state = STATE.BOSS_WARNING;
      bossWarningTimer = 0;
    }
  }

  // 敵弾 vs 自機
  for (const b of enemyBullets.bullets) {
    if (!b.active) continue;
    if (circleHit(player.x, player.y, player.hitRadius, b.x, b.y, enemyBullets.radius)) {
      b.active = false;
      if (player.takeHit()) {
        playSfx('hit', 0.6);
        if (player.lives <= 0) {
          state = STATE.GAMEOVER;
          playSfx('gameover', 0.7);
          bgmPlayer.stop();
        }
      }
    }
  }
}

function draw() {
  if (state === STATE.TITLE) {
    drawTitle(ctx, images, titleTime);
    return;
  }

  drawBackground();

  playerBullets.draw(ctx);
  enemyBullets.draw(ctx);

  if (boss) {
    boss.draw(ctx);
  } else {
    enemyManager.draw(ctx);
    itemManager.draw(ctx);
  }

  player.draw(ctx);

  drawHUD(ctx, { lives: player.lives, score });
  if (boss) drawBossHpBar(ctx, boss.hpRatio);

  if (state === STATE.BOSS_WARNING) {
    drawBossWarning(ctx, bossWarningTimer);
  }

  upgradeMenu.draw(ctx);

  if (state === STATE.CLEAR) drawClear(ctx, score);
  if (state === STATE.GAMEOVER) drawGameOver(ctx, score);
}

requestAnimationFrame(loop);
