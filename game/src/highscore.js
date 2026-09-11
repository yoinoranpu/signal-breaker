const KEY = 'sb_highscore';

export function getHighScore() {
  try {
    return parseInt(localStorage.getItem(KEY) || '0', 10) || 0;
  } catch (e) {
    return 0;
  }
}

// ハイスコアを更新した場合はtrueを返す
export function updateHighScore(score) {
  const current = getHighScore();
  if (score > current) {
    try {
      localStorage.setItem(KEY, String(score));
    } catch (e) {
      // ignore
    }
    return true;
  }
  return false;
}

export function getRank(score) {
  if (score >= 15000) return 'S';
  if (score >= 12000) return 'A';
  if (score >= 9000) return 'B';
  if (score >= 6000) return 'C';
  return 'D';
}
