import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

export const RETRY_BUTTON = {
  x: GAME_WIDTH / 2 - 90,
  y: 430,
  w: 180,
  h: 48,
};

export const PAUSE_BUTTON = { x: GAME_WIDTH - 34, y: 26, w: 26, h: 26 };

export const RESUME_BUTTON = { x: GAME_WIDTH / 2 - 90, y: 470, w: 180, h: 44 };
export const TITLE_BUTTON = { x: GAME_WIDTH / 2 - 90, y: 526, w: 180, h: 44 };
export const BGM_SLIDER = { x: GAME_WIDTH / 2 - 100, y: 300, w: 200, h: 10 };
export const SE_SLIDER = { x: GAME_WIDTH / 2 - 100, y: 360, w: 200, h: 10 };

export function isPointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function drawTitle(ctx, images, time) {
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const logo = images.logo;
  if (logo.complete && logo.naturalWidth > 0) {
    const w = 380;
    const h = w * (logo.naturalHeight / logo.naturalWidth);
    ctx.drawImage(logo, (GAME_WIDTH - w) / 2, 160, w, h);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9fb3d9';
  ctx.font = '13px sans-serif';
  ctx.fillText('暴走したネットワーク防衛システムの中枢を止めるため、単機で潜入する', GAME_WIDTH / 2, 420, GAME_WIDTH - 60);

  if (Math.floor(time / 0.6) % 2 === 0) {
    ctx.fillStyle = '#4ad9ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('タップ / クリックでスタート', GAME_WIDTH / 2, 520);
  }

  ctx.fillStyle = '#5d6f92';
  ctx.font = '11px sans-serif';
  ctx.fillText('マウス/指の動きに自機が追従します。ショットは自動発射', GAME_WIDTH / 2, 620);

  ctx.textAlign = 'left';
}

export function drawHUD(ctx, { lives, score, shieldCharges = 0 }) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('LIVES', 12, 20);
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#4ad9ff';
    ctx.beginPath();
    const cx = 20 + i * 18;
    const cy = 34;
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.lineTo(cx - 6, cy + 7);
    ctx.closePath();
    ctx.fill();
  }

  if (shieldCharges > 0) {
    ctx.fillStyle = '#7dffb0';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`シールド x${shieldCharges}`, 12, 50);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`SCORE ${String(score).padStart(6, '0')}`, GAME_WIDTH - 12, 16);
  ctx.textAlign = 'left';
}

export function drawPauseButton(ctx) {
  const r = PAUSE_BUTTON;
  ctx.fillStyle = 'rgba(19, 26, 43, 0.8)';
  ctx.strokeStyle = 'rgba(74, 217, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#4ad9ff';
  ctx.fillRect(r.x + 8, r.y + 6, 4, 14);
  ctx.fillRect(r.x + 16, r.y + 6, 4, 14);
}

function drawSlider(ctx, rect, value, label) {
  ctx.fillStyle = '#9fb3d9';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, rect.x, rect.y - 10);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#4ad9ff';
  ctx.fillRect(rect.x, rect.y, rect.w * value, rect.h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  const knobX = rect.x + rect.w * value;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(knobX, rect.y + rect.h / 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

export function sliderValueAt(rect, x) {
  return Math.max(0, Math.min(1, (x - rect.x) / rect.w));
}

export function drawPauseMenu(ctx, { bgmVolume, seVolume }) {
  ctx.fillStyle = 'rgba(2, 4, 10, 0.85)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4ad9ff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PAUSE', GAME_WIDTH / 2, 220);

  drawSlider(ctx, BGM_SLIDER, bgmVolume, `BGM音量 ${Math.round(bgmVolume * 100)}%`);
  drawSlider(ctx, SE_SLIDER, seVolume, `SE音量 ${Math.round(seVolume * 100)}%`);

  for (const [rect, label] of [
    [RESUME_BUTTON, '再開する'],
    [TITLE_BUTTON, 'タイトルに戻る'],
  ]) {
    ctx.fillStyle = '#131a2b';
    ctx.strokeStyle = '#4ad9ff';
    ctx.lineWidth = 2;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#4ad9ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);
  }

  ctx.textAlign = 'left';
}

export function drawBossHpBar(ctx, ratio) {
  const barW = GAME_WIDTH - 40;
  const barH = 12;
  const x = 20;
  const y = 64;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = '#ff3d7a';
  ctx.fillRect(x, y, barW * ratio, barH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barW, barH);
}

export function drawBossWarning(ctx, elapsed) {
  const flashOn = Math.floor(elapsed / 0.2) % 2 === 0;
  if (!flashOn) return;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3d3d';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('WARNING', GAME_WIDTH / 2, GAME_HEIGHT / 2);
  ctx.textAlign = 'left';
}

function drawResultScreen(ctx, title, titleColor, score, buttonLabel) {
  ctx.fillStyle = 'rgba(2,4,10,0.85)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(title, GAME_WIDTH / 2, 300);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`SCORE ${score}`, GAME_WIDTH / 2, 350);

  const r = RETRY_BUTTON;
  ctx.fillStyle = '#131a2b';
  ctx.strokeStyle = '#4ad9ff';
  ctx.lineWidth = 2;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#4ad9ff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(buttonLabel, GAME_WIDTH / 2, r.y + r.h / 2 + 6);

  ctx.textAlign = 'left';
}

export function drawClear(ctx, score) {
  drawResultScreen(ctx, 'CLEAR', '#4ad9ff', score, 'もう一度遊ぶ');
}

export function drawGameOver(ctx, score) {
  drawResultScreen(ctx, 'GAME OVER', '#ff3d7a', score, 'もう一度遊ぶ');
}
