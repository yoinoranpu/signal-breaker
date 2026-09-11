import { GAME_WIDTH, GAME_HEIGHT, STATE, BOSS_WARNING_DURATION } from './constants.js';
import { loadImage, circleHit } from './utils.js';
import { Player } from './player.js';
import { BulletPool } from './bullets.js';
import { EnemyManager } from './enemies.js';
import { Boss } from './boss.js';
import { ItemDropManager, UpgradeMenu } from './upgrades.js';
import { CapsuleManager, randomCapsuleKind } from './capsules.js';
import { EscortManager } from './escort.js';
import { EffectManager } from './effects.js';
import { registerSfx, playSfx, BgmPlayer, getVolumeSettings, setBgmVolume, setSeVolume } from './audio.js';
import { getHighScore, updateHighScore, getRank } from './highscore.js';
import {
  RETRY_BUTTON,
  PAUSE_BUTTON,
  RESUME_BUTTON,
  TITLE_BUTTON,
  BGM_SLIDER,
  SE_SLIDER,
  isPointInRect,
  sliderValueAt,
  drawTitle,
  drawHUD,
  drawPauseButton,
  drawPauseMenu,
  drawBossHpBar,
  drawBossWarning,
  drawClear,
  drawGameOver,
  drawCombo,
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
  escort: loadImage('assets/images/escort.png'),
  capsule: {
    speed: loadImage('assets/images/capsule_speed.png'),
    shield: loadImage('assets/images/capsule_shield.png'),
    power: loadImage('assets/images/capsule_power.png'),
  },
  upgrade: {
    atk: loadImage('assets/images/upgrade_atk.png'),
    firerate: loadImage('assets/images/upgrade_firerate.png'),
    '3way': loadImage('assets/images/upgrade_3way.png'),
    tracking: loadImage('assets/images/upgrade_tracking.png'),
    hitbox: loadImage('assets/images/upgrade_hitbox.png'),
    invuln: loadImage('assets/images/upgrade_invuln.png'),
    life: loadImage('assets/images/upgrade_life.png'),
    bulletspeed: loadImage('assets/images/upgrade_bulletspeed.png'),
    escort: loadImage('assets/images/upgrade_escort.png'),
    homing: loadImage('assets/images/upgrade_homing.png'),
    pierce: loadImage('assets/images/upgrade_pierce.png'),
    barrier: loadImage('assets/images/upgrade_barrier.png'),
    pulse: loadImage('assets/images/upgrade_pulse.png'),
  },
};

// --- サウンド ---
registerSfx('shot', 'assets/sounds/se/shot1.mp3');
registerSfx('explosion', 'assets/sounds/se/bomb1.mp3');
registerSfx('hit', 'assets/sounds/se/blow2.mp3');
registerSfx('shield', 'assets/sounds/se/shot-struck1.mp3');
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
const capsuleManager = new CapsuleManager(images.capsule);
const escortManager = new EscortManager(images.escort);
const effects = new EffectManager();
const upgradeMenu = new UpgradeMenu(images.upgrade);

let boss = null;
let state = STATE.TITLE;
let score = 0;
let bossWarningTimer = 0;
let bgScroll = 0;
let titleTime = 0;
let paused = false;
let pulseTimer = 0;
let combo = 0;
let comboTimer = 0;
let grazeGained = 0;
let resultInfo = null;

const COMBO_WINDOW = 1.6;

function resetGame() {
  player.reset();
  playerBullets.clear();
  enemyBullets.clear();
  enemyManager.reset();
  itemManager.reset();
  capsuleManager.reset();
  escortManager.reset();
  effects.reset();
  boss = null;
  score = 0;
  bossWarningTimer = 0;
  paused = false;
  pulseTimer = 0;
  combo = 0;
  comboTimer = 0;
  grazeGained = 0;
  resultInfo = null;
}

function awardKillScore(basePoints) {
  combo += 1;
  comboTimer = COMBO_WINDOW;
  const mult = 1 + Math.min(combo - 1, 10) * 0.1;
  const total = Math.round(basePoints * mult);
  score += total;
  return total;
}

function startStage() {
  resetGame();
  state = STATE.PLAYING;
  bgmPlayer.play('stage', 'assets/sounds/bgm/stage.mp3', { volume: 0.45 });
}

function returnToTitle() {
  resetGame();
  bgmPlayer.stop();
  state = STATE.TITLE;
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
  } else if (state === STATE.PLAYING && paused) {
    const vol = getVolumeSettings();
    if (isPointInRect(x, y, BGM_SLIDER)) {
      setBgmVolume(sliderValueAt(BGM_SLIDER, x));
    } else if (isPointInRect(x, y, SE_SLIDER)) {
      setSeVolume(sliderValueAt(SE_SLIDER, x));
    } else if (isPointInRect(x, y, RESUME_BUTTON)) {
      paused = false;
    } else if (isPointInRect(x, y, TITLE_BUTTON)) {
      returnToTitle();
    }
    return;
  } else if (state === STATE.PLAYING && upgradeMenu.active) {
    const chosen = upgradeMenu.handleClick(x, y);
    if (chosen) chosen.apply(player.stats, player);
  } else if (state === STATE.PLAYING && isPointInRect(x, y, PAUSE_BUTTON)) {
    paused = true;
    return;
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

// --- 誘導弾の追尾処理 ---
function steerHomingBullets(dt) {
  const targets = [];
  if (boss) {
    targets.push({ x: boss.x, y: boss.y });
  } else {
    for (const e of enemyManager.enemies) targets.push({ x: e.x, y: e.y });
  }
  if (targets.length === 0) return;

  const turnRate = 5.5; // ラジアン/秒
  for (const b of playerBullets.bullets) {
    if (!b.active || !b.homing) continue;
    let nearest = null;
    let nearestDist = Infinity;
    for (const t of targets) {
      const d = (t.x - b.x) ** 2 + (t.y - b.y) ** 2;
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }
    if (!nearest) continue;
    const speed = Math.hypot(b.vx, b.vy);
    const currentAngle = Math.atan2(b.vy, b.vx);
    const targetAngle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
    let diff = targetAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = turnRate * dt;
    const applied = Math.max(-maxTurn, Math.min(maxTurn, diff));
    const newAngle = currentAngle + applied;
    b.vx = Math.cos(newAngle) * speed;
    b.vy = Math.sin(newAngle) * speed;
  }
}

// --- パルスウェーブ(周囲の敵弾を消し、周囲の敵にダメージ) ---
function triggerPulse() {
  const radius = 110;
  for (const b of enemyBullets.bullets) {
    if (!b.active) continue;
    if (circleHit(player.x, player.y, radius, b.x, b.y, 0)) b.active = false;
  }
  const dmg = 3;
  for (const e of enemyManager.enemies) {
    if (e.dead) continue;
    if (circleHit(player.x, player.y, radius, e.x, e.y, 0)) {
      e.hp -= dmg;
      if (e.hp <= 0) {
        e.dead = true;
        const awarded = awardKillScore(100);
        effects.spawnExplosion(e.x, e.y, '#c084fc');
        effects.spawnScorePopup(e.x, e.y - 10, `+${awarded}`, '#c084fc');
      }
    }
  }
  if (boss && circleHit(player.x, player.y, radius, boss.x, boss.y, 0)) {
    boss.hp -= dmg;
  }
  effects.spawnRing(player.x, player.y, '#c084fc', radius);
}

function handleCapsulePickup(kind) {
  if (kind === 'speed') {
    player.stats.followLerp = Math.min(0.9, player.stats.followLerp + 0.05);
    effects.spawnScorePopup(player.x, player.y - 24, 'SPEED UP!', '#4ad9ff');
  } else if (kind === 'shield') {
    player.stats.shieldCharges = Math.min(3, player.stats.shieldCharges + 1);
    effects.spawnScorePopup(player.x, player.y - 24, 'SHIELD!', '#7dffb0');
  } else if (kind === 'power') {
    player.tempBoostTimer = 8;
    effects.spawnScorePopup(player.x, player.y - 24, 'POWER UP!', '#ff8a3d');
  }
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
  canvas.classList.toggle('hide-cursor', state === STATE.PLAYING && !upgradeMenu.active && !paused);

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
  if (paused || upgradeMenu.active) {
    return; // 一時停止/選択中はゲーム側を止める
  }

  bgScroll += 40 * dt;
  player.update(dt);
  effects.update(dt);

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  const fireResult = player.tryFire();
  if (fireResult) {
    const dmg = player.getDamageMultiplier();
    fireResult.angles.forEach((angle, i) => {
      const homing = fireResult.isHoming && i === Math.floor(fireResult.angles.length / 2);
      playerBullets.spawnAngle(player.x, player.y - 14, angle, player.stats.bulletSpeed, dmg, {
        homing,
        pierce: player.stats.pierceCount,
        split: player.stats.splitCount,
        bounce: player.stats.bounce,
      });
    });
    playSfx('shot', 0.2);
  }
  playerBullets.update(dt);
  enemyBullets.update(dt);
  steerHomingBullets(dt);

  escortManager.sync(player.stats.escortCount);
  escortManager.update(dt, player, playerBullets, player.getDamageMultiplier());

  if (player.stats.pulseInterval > 0) {
    pulseTimer -= dt;
    if (pulseTimer <= 0) {
      pulseTimer = player.stats.pulseInterval;
      triggerPulse();
    }
  }

  if (boss) {
    boss.update(dt, { enemyBullets, player, playerBullets });
    if (boss.justTransitioned) {
      boss.justTransitioned = false;
      playSfx('bossTransition', 0.5);
    }
    if (boss.defeated) {
      const awarded = awardKillScore(5000);
      state = STATE.CLEAR;
      effects.spawnExplosion(boss.x, boss.y, '#ff8a3d', 30);
      effects.spawnScorePopup(boss.x, boss.y - 20, `+${awarded}`, '#ff8a3d');
      playSfx('clear', 0.6);
      bgmPlayer.play('clear', 'assets/sounds/bgm/title.mp3', { volume: 0.4 });
      const isNewRecord = updateHighScore(score);
      resultInfo = { rank: getRank(score), isNewRecord, highScore: getHighScore(), graze: grazeGained };
    }
  } else {
    enemyManager.update(dt, {
      player,
      playerBullets,
      enemyBullets,
      onScore: (v) => awardKillScore(v),
      onExplosion: (x, y, points) => {
        playSfx('explosion', 0.3);
        effects.spawnExplosion(x, y);
        effects.spawnScorePopup(x, y - 10, `+${points}`, '#ffd166');
      },
      onItemDrop: (x, y) => itemManager.spawn(x, y),
      onCapsuleDrop: (x, y) => capsuleManager.spawn(x, y, randomCapsuleKind()),
    });

    itemManager.update(dt, player, () => upgradeMenu.open());
    capsuleManager.update(dt, player, (kind) => handleCapsulePickup(kind));

    if (enemyManager.isStageComplete()) {
      state = STATE.BOSS_WARNING;
      bossWarningTimer = 0;
    }
  }

  // 敵弾 vs 自機
  const grazeRadius = player.hitRadius + 16;
  for (const b of enemyBullets.bullets) {
    if (!b.active) continue;
    if (circleHit(player.x, player.y, player.hitRadius, b.x, b.y, enemyBullets.radius)) {
      b.active = false;
      const result = player.takeHit();
      if (result === 'shielded') {
        playSfx('shield', 0.5);
        effects.triggerHitFlash('#7dffb0');
      } else if (result === 'hit') {
        playSfx('hit', 0.5);
        effects.triggerHitFlash('#ff3d5a');
        if (player.lives <= 0) {
          state = STATE.GAMEOVER;
          playSfx('gameover', 0.6);
          bgmPlayer.stop();
          const isNewRecord = updateHighScore(score);
          resultInfo = { isNewRecord, highScore: getHighScore(), graze: grazeGained };
        }
      }
    } else if (!b.grazed && circleHit(player.x, player.y, grazeRadius, b.x, b.y, enemyBullets.radius)) {
      b.grazed = true;
      score += 2;
      grazeGained += 1;
      effects.spawnExplosion(b.x, b.y, '#ffffff', 3);
    }
  }
}

function draw() {
  if (state === STATE.TITLE) {
    drawTitle(ctx, images, titleTime, getHighScore());
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
    capsuleManager.draw(ctx);
  }

  escortManager.draw(ctx);
  player.draw(ctx);
  effects.draw(ctx);

  drawHUD(ctx, { lives: player.lives, score, shieldCharges: player.stats.shieldCharges });
  drawCombo(ctx, combo);
  if (boss) drawBossHpBar(ctx, boss.hpRatio);

  if (state === STATE.BOSS_WARNING) {
    drawBossWarning(ctx, bossWarningTimer);
  }

  if (state === STATE.PLAYING && !upgradeMenu.active) {
    drawPauseButton(ctx);
  }

  upgradeMenu.draw(ctx);

  effects.drawScreenFlash(ctx);

  if (paused) {
    drawPauseMenu(ctx, getVolumeSettings());
  }

  if (state === STATE.CLEAR) drawClear(ctx, score, resultInfo);
  if (state === STATE.GAMEOVER) drawGameOver(ctx, score, resultInfo);
}

requestAnimationFrame(loop);
