import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { circleHit, randRange } from './utils.js';
import { trySpawnSplit } from './bullets.js';

const TYPE_A = {
  hp: 2,
  radius: 15,
  drawSize: 38,
  score: 100,
};
const TYPE_B = {
  hp: 3,
  radius: 17,
  drawSize: 42,
  score: 100,
};
const TYPE_C = {
  hp: 6,
  radius: 22,
  drawSize: 52,
  score: 1000,
};

const ENEMY_BULLET_SPEED = 215;

function spawnTypeA(x) {
  return {
    type: 'A',
    x,
    y: -30,
    vx: 0,
    vy: 110,
    hp: TYPE_A.hp,
    fired: false,
    age: 0,
    dead: false,
  };
}

function spawnTypeB(fromLeft, y) {
  const facingRight = fromLeft;
  return {
    type: 'B',
    x: fromLeft ? -40 : GAME_WIDTH + 40,
    y,
    vx: facingRight ? 95 : -95,
    vy: 45,
    hp: TYPE_B.hp,
    facingRight,
    age: 0,
    shotsFired: 0,
    nextShotAt: randRange(0.4, 0.7),
    dead: false,
  };
}

function spawnTypeC(x) {
  return {
    type: 'C',
    x,
    y: -50,
    vx: 0,
    vy: 90,
    hp: TYPE_C.hp,
    stage: 'approach', // approach -> pause -> leaving
    age: 0,
    pauseTimer: 0,
    volleysFired: 0,
    dead: false,
  };
}

function fireSpread(enemyBullets, x, y, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    enemyBullets.spawnAngle(x, y, angle, speed);
  }
}

function fire3Way(enemyBullets, x, y, centerAngle, speed) {
  enemyBullets.spawnAngle(x, y, centerAngle - 0.5, speed);
  enemyBullets.spawnAngle(x, y, centerAngle, speed);
  enemyBullets.spawnAngle(x, y, centerAngle + 0.5, speed);
}

function updateTypeA(e, dt, enemyBullets) {
  e.age += dt;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (!e.fired && e.age > 0.25) {
    e.fired = true;
    fire3Way(enemyBullets, e.x, e.y, Math.PI / 2, ENEMY_BULLET_SPEED);
  }
  if (e.y > GAME_HEIGHT + 40) e.dead = true;
}

function updateTypeB(e, dt, enemyBullets, player) {
  e.age += dt;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.shotsFired < 2 && e.age >= e.nextShotAt) {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    enemyBullets.spawnAngle(e.x, e.y, angle, ENEMY_BULLET_SPEED);
    e.shotsFired += 1;
    e.nextShotAt = e.age + randRange(0.5, 0.8);
  }
  if (e.x < -60 || e.x > GAME_WIDTH + 60 || e.y > GAME_HEIGHT + 40) e.dead = true;
}

function updateTypeC(e, dt, enemyBullets) {
  e.age += dt;
  if (e.stage === 'approach') {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.y >= 150) {
      e.y = 150;
      e.stage = 'pause';
      e.pauseTimer = 0;
    }
  } else if (e.stage === 'pause') {
    e.pauseTimer += dt;
    if (e.volleysFired === 0 && e.pauseTimer >= 0.4) {
      fireSpread(enemyBullets, e.x, e.y, 8, ENEMY_BULLET_SPEED * 0.85);
      e.volleysFired = 1;
    } else if (e.volleysFired === 1 && e.pauseTimer >= 1.4) {
      fireSpread(enemyBullets, e.x, e.y, 8, ENEMY_BULLET_SPEED * 0.85);
      e.volleysFired = 2;
      e.stage = 'leaving';
      e.vy = 130;
    }
  } else if (e.stage === 'leaving') {
    e.y += e.vy * dt;
    if (e.y > GAME_HEIGHT + 60) e.dead = true;
  }
}

function specFor(type) {
  if (type === 'A') return TYPE_A;
  if (type === 'B') return TYPE_B;
  return TYPE_C;
}

export class EnemyManager {
  constructor(sprites) {
    this.sprites = sprites; // { A, B, C }
    this.enemies = [];
    this.timeline = buildTimeline();
    this.timelineIndex = 0;
    this.stageTime = 0;
  }

  reset() {
    this.enemies = [];
    this.timelineIndex = 0;
    this.stageTime = 0;
  }

  update(dt, { player, playerBullets, enemyBullets, onScore, onItemDrop, onCapsuleDrop, onExplosion }) {
    this.stageTime += dt;

    while (
      this.timelineIndex < this.timeline.length &&
      this.timeline[this.timelineIndex].time <= this.stageTime
    ) {
      const event = this.timeline[this.timelineIndex];
      this.enemies.push(event.spawn());
      this.timelineIndex += 1;
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.type === 'A') updateTypeA(e, dt, enemyBullets);
      else if (e.type === 'B') updateTypeB(e, dt, enemyBullets, player);
      else updateTypeC(e, dt, enemyBullets);

      const spec = specFor(e.type);
      for (const b of playerBullets.bullets) {
        if (!b.active || e.dead) continue;
        if (circleHit(e.x, e.y, spec.radius, b.x, b.y, playerBullets.radius)) {
          trySpawnSplit(b, playerBullets);
          if (b.pierceLeft > 0) b.pierceLeft -= 1;
          else b.active = false;
          e.hp -= b.damage;
          if (e.hp <= 0) {
            e.dead = true;
            const awarded = onScore(spec.score);
            if (onExplosion) onExplosion(e.x, e.y, awarded);
            if (e.type === 'C') {
              onItemDrop(e.x, e.y);
            } else if (onCapsuleDrop && Math.random() < 0.14) {
              onCapsuleDrop(e.x, e.y);
            }
          }
        }
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  isStageComplete() {
    return this.timelineIndex >= this.timeline.length && this.enemies.length === 0;
  }

  draw(ctx) {
    for (const e of this.enemies) {
      const spec = specFor(e.type);
      const sprite = this.sprites[e.type];
      if (!sprite.complete || sprite.naturalWidth === 0) continue;
      const half = spec.drawSize / 2;
      if (e.type === 'B' && !e.facingRight) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -half, -half, spec.drawSize, spec.drawSize);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, e.x - half, e.y - half, spec.drawSize, spec.drawSize);
      }
    }
  }
}

function buildTimeline() {
  const events = [];

  // 0:00-0:20 タイプAを間隔を空けて出現(導入)
  const aTimesIntro = [1.0, 6.0, 11.5, 17.0];
  for (const t of aTimesIntro) {
    events.push({ time: t, spawn: () => spawnTypeA(randRange(80, 400)) });
  }

  // 0:20-0:25 タイプA/B混在、密度アップ
  events.push({ time: 20, spawn: () => spawnTypeA(randRange(80, 400)) });
  events.push({ time: 21.5, spawn: () => spawnTypeB(true, randRange(120, 220)) });
  events.push({ time: 23, spawn: () => spawnTypeB(false, randRange(120, 220)) });

  // 0:25 タイプC(1体目)
  events.push({ time: 25, spawn: () => spawnTypeC(240) });

  // 0:25-0:55 物量増加
  const midPhase = [
    { t: 28, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 31, fn: () => spawnTypeB(true, randRange(100, 240)) },
    { t: 34, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 37, fn: () => spawnTypeB(false, randRange(100, 240)) },
    { t: 40, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 42.5, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 45, fn: () => spawnTypeB(true, randRange(100, 240)) },
    { t: 48, fn: () => spawnTypeB(false, randRange(100, 240)) },
    { t: 51, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 53, fn: () => spawnTypeA(randRange(60, 420)) },
  ];
  for (const { t, fn } of midPhase) events.push({ time: t, spawn: fn });

  // 0:55 タイプC(2体目)
  events.push({ time: 55, spawn: () => spawnTypeC(240) });

  // 0:55-1:15 物量ラッシュ(道中のクライマックス)
  const rush = [
    { t: 57, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 58.5, fn: () => spawnTypeB(true, randRange(100, 240)) },
    { t: 60, fn: () => spawnTypeB(false, randRange(100, 240)) },
    { t: 61.5, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 63, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 65, fn: () => spawnTypeB(true, randRange(100, 240)) },
    { t: 67, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 68.5, fn: () => spawnTypeB(false, randRange(100, 240)) },
    { t: 70, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 71.5, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 73, fn: () => spawnTypeB(true, randRange(100, 240)) },
  ];
  for (const { t, fn } of rush) events.push({ time: t, spawn: fn });

  // 1:15 タイプC(3体目)
  events.push({ time: 75, spawn: () => spawnTypeC(240) });

  // 1:15-1:30 仕上げの物量
  const finale = [
    { t: 77, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 78.5, fn: () => spawnTypeB(false, randRange(100, 240)) },
    { t: 80, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 81.5, fn: () => spawnTypeB(true, randRange(100, 240)) },
    { t: 83, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 84.5, fn: () => spawnTypeA(randRange(60, 420)) },
    { t: 86, fn: () => spawnTypeB(false, randRange(100, 240)) },
    { t: 87.5, fn: () => spawnTypeA(randRange(60, 420)) },
  ];
  for (const { t, fn } of finale) events.push({ time: t, spawn: fn });

  events.sort((a, b) => a.time - b.time);
  return events;
}
