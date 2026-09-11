import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

export class EffectManager {
  constructor() {
    this.particles = [];
    this.popups = [];
    this.rings = [];
    this.flashTimer = 0;
    this.flashColor = '#ff3d5a';
  }

  spawnExplosion(x, y, color = '#ffd166', count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.25,
        age: 0,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  spawnScorePopup(x, y, text, color = '#ffffff') {
    this.popups.push({ x, y, text, color, age: 0, life: 0.8 });
  }

  spawnRing(x, y, color = '#4ad9ff', maxRadius = 120) {
    this.rings.push({ x, y, color, maxRadius, age: 0, life: 0.45 });
  }

  triggerHitFlash(color = '#ff3d5a') {
    this.flashTimer = 0.25;
    this.flashColor = color;
  }

  reset() {
    this.particles = [];
    this.popups = [];
    this.rings = [];
    this.flashTimer = 0;
  }

  update(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    for (const s of this.popups) {
      s.age += dt;
      s.y -= 26 * dt;
    }
    this.popups = this.popups.filter((s) => s.age < s.life);

    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);

    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const r of this.rings) {
      const t = r.age / r.life;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.maxRadius * t, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.font = 'bold 13px sans-serif';
    for (const s of this.popups) {
      const t = 1 - s.age / s.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawScreenFlash(ctx) {
    if (this.flashTimer <= 0) return;
    const t = this.flashTimer / 0.25;
    ctx.save();
    ctx.globalAlpha = t * 0.35;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.restore();
  }
}
