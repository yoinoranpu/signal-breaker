const sources = {};

const settings = {
  bgmVolume: 0.35,
  seVolume: 0.5,
};

try {
  const saved = JSON.parse(localStorage.getItem('sb_audio_settings') || '{}');
  if (typeof saved.bgmVolume === 'number') settings.bgmVolume = saved.bgmVolume;
  if (typeof saved.seVolume === 'number') settings.seVolume = saved.seVolume;
} catch (e) {
  // ignore
}

function persist() {
  try {
    localStorage.setItem('sb_audio_settings', JSON.stringify(settings));
  } catch (e) {
    // ignore
  }
}

export function getVolumeSettings() {
  return settings;
}

export function setBgmVolume(v) {
  settings.bgmVolume = Math.max(0, Math.min(1, v));
  persist();
  if (activeBgm) activeBgm.audio.volume = settings.bgmVolume * activeBgm.baseVolume;
}

export function setSeVolume(v) {
  settings.seVolume = Math.max(0, Math.min(1, v));
  persist();
}

export function registerSfx(name, src) {
  sources[name] = src;
}

export function playSfx(name, volume = 1) {
  const src = sources[name];
  if (!src) return;
  const audio = new Audio(src);
  audio.volume = Math.max(0, Math.min(1, volume * settings.seVolume));
  audio.play().catch(() => {});
}

let activeBgm = null;

export class BgmPlayer {
  constructor() {
    this.current = null;
    this.currentKey = null;
    this.unlocked = false;
  }

  unlock() {
    this.unlocked = true;
    if (this.current) this.current.play().catch(() => {});
  }

  play(key, src, { volume = 0.5 } = {}) {
    if (this.currentKey === key) return;
    if (this.current) this.current.pause();
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume * settings.bgmVolume;
    this.current = audio;
    this.currentKey = key;
    activeBgm = { audio, baseVolume: volume };
    if (this.unlocked) audio.play().catch(() => {});
  }

  stop() {
    if (this.current) this.current.pause();
    this.current = null;
    this.currentKey = null;
    activeBgm = null;
  }
}
