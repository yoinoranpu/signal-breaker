const sources = {};

export function registerSfx(name, src) {
  sources[name] = src;
}

export function playSfx(name, volume = 1) {
  const src = sources[name];
  if (!src) return;
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

export class BgmPlayer {
  constructor() {
    this.current = null;
    this.currentKey = null;
    this.unlocked = false;
  }

  unlock() {
    this.unlocked = true;
  }

  play(key, src, { volume = 0.5 } = {}) {
    if (this.currentKey === key) return;
    if (this.current) {
      this.current.pause();
    }
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    this.current = audio;
    this.currentKey = key;
    if (this.unlocked) {
      audio.play().catch(() => {});
    }
  }

  stop() {
    if (this.current) this.current.pause();
    this.current = null;
    this.currentKey = null;
  }
}
