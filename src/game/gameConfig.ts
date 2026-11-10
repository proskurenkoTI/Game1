/**
 * Игровые параметры и конфигурация волн.
 */

export const START_LIVES = 3;
export const SCORE_WORD = 10;
export const SCORE_SPEED = 5; // бонус за слово, набранное быстрее 2 секунд
export const SPEED_BONUS_MS = 2000;
export const SCORE_COMBO = 15; // разовый бонус за серию
export const COMBO_STREAK = 3;

export const MONSTER_SPAWN_Y = 100;
export const BASE_Y = 520; // монстр дошёл до базы
export const SPAWN_COOLDOWN_MS = 900;
export const FIRST_SPAWN_DELAY_MS = 600;
export const FINAL_WAVE = 5;

export const MONSTER_EMOJIS = ['👾', '🧟', '👻', '🦇', '👽', '💀', '🕷️', '🐍', '🐙'];

export interface WaveConfig {
  totalMonsters: number;
  maxConcurrent: number;
  minWordLen: number;
  maxWordLen: number;
  trapChance: number;
  speed: number;
}

export const WAVES: WaveConfig[] = [
  { totalMonsters: 5, maxConcurrent: 1, minWordLen: 3, maxWordLen: 4, trapChance: 0, speed: 40 },
  { totalMonsters: 6, maxConcurrent: 2, minWordLen: 4, maxWordLen: 5, trapChance: 0.15, speed: 50 },
  { totalMonsters: 7, maxConcurrent: 3, minWordLen: 5, maxWordLen: 6, trapChance: 0.2, speed: 60 },
  { totalMonsters: 8, maxConcurrent: 3, minWordLen: 6, maxWordLen: 8, trapChance: 0.2, speed: 75 },
  { totalMonsters: 9, maxConcurrent: 4, minWordLen: 6, maxWordLen: 8, trapChance: 0.3, speed: 85 },
];

/**
 * Возвращает конфиг волны. После FINAL_WAVE сложность продолжает расти.
 */
export function getWaveConfig(wave: number): WaveConfig {
  if (wave <= WAVES.length) return WAVES[wave - 1];

  const extra = wave - WAVES.length;
  return {
    totalMonsters: 9 + extra * 2,
    maxConcurrent: Math.min(4 + extra, 6),
    minWordLen: 6,
    maxWordLen: Math.min(8 + extra, 10),
    trapChance: Math.min(0.3 + extra * 0.05, 0.5),
    speed: 85 + extra * 10,
  };
}
