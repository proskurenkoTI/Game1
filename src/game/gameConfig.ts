/**
 * Игровые параметры и конфигурация волн.
 */

export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const SCORE_WORD = 10;
export const SCORE_SPEED = 5; // бонус за слово, набранное быстрее 2 секунд
export const SPEED_BONUS_MS = 2000;
export const SCORE_COMBO = 15; // разовый бонус за серию
export const COMBO_STREAK = 3;
/** Серия без ошибок, за которую возвращают жизнь. */
export const HEAL_STREAK = 5;
/** Радиус взрыва монстра-бомбы, px. */
export const BOMB_RADIUS = 240;

export const MONSTER_SPAWN_Y = 100;
export const BASE_Y = 520; // монстр дошёл до базы
export const SPAWN_COOLDOWN_MS = 900;
export const FIRST_SPAWN_DELAY_MS = 600;

export const MONSTER_EMOJIS = ['👾', '🧟', '👻', '🦇', '👽', '💀', '🕷️', '🐍', '🐙'];

export interface WaveConfig {
  /** Номер волны — нужен, чтобы понимать, какие типы монстров уже открыты. */
  wave: number;
  totalMonsters: number;
  maxConcurrent: number;
  minWordLen: number;
  maxWordLen: number;
  trapChance: number;
  /** Шанс особого монстра (аналограмма, бомба, щит и т.п.). */
  specialChance: number;
  speed: number;
}

export const WAVES: Omit<WaveConfig, 'wave'>[] = [
  { totalMonsters: 5, maxConcurrent: 1, minWordLen: 3, maxWordLen: 4, trapChance: 0, specialChance: 0, speed: 40 },
  { totalMonsters: 6, maxConcurrent: 2, minWordLen: 4, maxWordLen: 5, trapChance: 0.15, specialChance: 0.15, speed: 46 },
  { totalMonsters: 7, maxConcurrent: 3, minWordLen: 4, maxWordLen: 6, trapChance: 0.2, specialChance: 0.22, speed: 52 },
  { totalMonsters: 8, maxConcurrent: 3, minWordLen: 5, maxWordLen: 7, trapChance: 0.2, specialChance: 0.28, speed: 58 },
  { totalMonsters: 9, maxConcurrent: 4, minWordLen: 5, maxWordLen: 8, trapChance: 0.3, specialChance: 0.34, speed: 64 },
];

/**
 * Частота особых монстров делится на две группы:
 *
 *  частые  — анаграмма, два слова, прыгун, призрак, щит. После COMMON_DENSITY_FROM_WAVE
 *            их шанс заметно растёт, чтобы поле переставало быть однообразным;
 *  редкие  — бомба и лечение. Они идут не по общему шансу, а по своей норме:
 *            один монстр на RARE_SPARSE_EVERY_WAVES волн, а с RARE_DENSE_FROM_WAVE —
 *            по одному каждой волны.
 */
export const COMMON_DENSITY_FROM_WAVE = 4;
export const COMMON_DENSITY_BOOST = 1.9;

/** Скольким монстрам волны соответствует один редкий монстр. */
export const RARE_SPARSE_EVERY_WAVES = 2;
/** С этой волны редких монстров выдаём по штуке каждой волны. */
export const RARE_DENSE_FROM_WAVE = 6;

/**
 * Шанс частого особого монстра при спавне. После COMMON_DENSITY_FROM_WAVE
 * шанс берётся не из таблицы волн, а растёт линейно — так типы с особым
 * поведением появляются часто, но не вытесняют обычные слова.
 */
export function commonSpecialChance(config: WaveConfig): number {
  if (config.wave < COMMON_DENSITY_FROM_WAVE) return config.specialChance;
  const extra = config.wave - COMMON_DENSITY_FROM_WAVE;
  return Math.min(0.55 + extra * 0.04, 0.8);
}

/**
 * Шанс редкого монстра при спавне одного монстра — считается отдельно
 * для каждого редкого типа. Учитывает (1 - trapChance), так как обманки
 * поглощают часть спавнов и уменьшают эффективный шанс редких.
 * commonChance не влияет: редкий проверяется первым и возвращает сразу.
 */
export function rareSpecialChance(config: WaveConfig): number {
  const targetPerType =
    config.wave >= RARE_DENSE_FROM_WAVE ? 1 : 1 / RARE_SPARSE_EVERY_WAVES;
  return targetPerType / (config.totalMonsters * (1 - config.trapChance));
}

/**
 * Волны бесконечны: после пятой сложность продолжает расти, но не за счёт
 * прямой гонки скорости, а за счёт числа монстров, обманок и особых типов.
 * Короткие слова возвращаются в пул, чтобы на поле одновременно были и
 * быстрые коротыши, и медленные длиннющие слова.
 */
export function getWaveConfig(wave: number): WaveConfig {
  if (wave <= WAVES.length) return { ...WAVES[wave - 1], wave };

  const extra = wave - WAVES.length;
  return {
    wave,
    totalMonsters: Math.min(9 + extra * 2, 24),
    maxConcurrent: Math.min(4 + Math.floor(extra / 2), 7),
    // Короткие слова остаются в пуле: они падают быстро, длинные — медленно.
    minWordLen: 3,
    maxWordLen: Math.min(8 + extra, 11),
    trapChance: Math.min(0.3 + extra * 0.03, 0.45),
    specialChance: Math.min(0.34 + extra * 0.05, 0.65),
    // Рост скорости намеренно пологий и с потолком.
    speed: Math.min(64 + extra * 4, 110),
  };
}

// ── Скорость падения зависит от длины слова ────────────────────────────

/** Длина слова, для которой скорость волны эталонная. */
const SPEED_BASE_LEN = 5;
/** Длинное слово не может падать медленнее этой доли базовой скорости. */
const SPEED_FACTOR_MIN = 0.45;
/** Короткое слово не может падать быстрее этой доли. */
const SPEED_FACTOR_MAX = 1.8;

/**
 * Скорость падения: короткое слово летит быстрее, длинное — медленнее,
 * чтобы на набор оставалось примерно одинаковое время.
 */
export function fallSpeedFor(waveSpeed: number, wordLength: number): number {
  const factor = Math.min(
    Math.max(SPEED_BASE_LEN / Math.max(wordLength, 1), SPEED_FACTOR_MIN),
    SPEED_FACTOR_MAX,
  );
  return waveSpeed * factor;
}
