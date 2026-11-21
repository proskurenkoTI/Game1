/**
 * Прогресс режима «Азбука»: какой уровень открыт в каждой раскладке.
 *
 * Следующий уровень открывается только после прохождения предыдущего,
 * поэтому на раскладку храним одно число — номер максимального открытого
 * уровня. Уровни меньше него считаются пройденными. Прогресс русской и
 * английской раскладок независим.
 *
 * Значения кладём в localStorage, чтобы прогресс переживал перезагрузку
 * страницы. Если хранилище недоступно (приватный режим), работаем в памяти.
 */
import { ALPHABET_LEVEL_COUNT, type KeyboardLayout } from './alphabetLevels';

const STORAGE_KEYS: Record<KeyboardLayout, string> = {
  ru: 'alphabet.ru.maxUnlockedLevel',
  en: 'alphabet.en.maxUnlockedLevel',
};

/** Ключ русской раскладки, который использовался до появления английской. */
const LEGACY_RU_KEY = 'alphabet.maxUnlockedLevel';

function clampLevel(value: number): number {
  return Math.min(Math.max(value, 1), ALPHABET_LEVEL_COUNT);
}

function readStored(layout: KeyboardLayout): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[layout]);
    if (raw === null && layout === 'ru') {
      const legacy = window.localStorage.getItem(LEGACY_RU_KEY);
      const legacyLevel = legacy === null ? NaN : Number.parseInt(legacy, 10);
      return Number.isFinite(legacyLevel) ? clampLevel(legacyLevel) : 1;
    }
    const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? clampLevel(parsed) : 1;
  } catch {
    return 1;
  }
}

const maxUnlocked: Record<KeyboardLayout, number> = {
  ru: readStored('ru'),
  en: readStored('en'),
};

function writeStored(layout: KeyboardLayout, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS[layout], String(value));
  } catch {
    // Хранилище недоступно — прогресс остаётся только в памяти.
  }
}

export function getMaxUnlockedLevel(layout: KeyboardLayout): number {
  return maxUnlocked[layout];
}

export function isLevelUnlocked(layout: KeyboardLayout, level: number): boolean {
  return level <= maxUnlocked[layout];
}

/** Пройден ли уровень: всё, что ниже открытого, уже закрыто ранее. */
export function isLevelCompleted(layout: KeyboardLayout, level: number): boolean {
  return level < maxUnlocked[layout];
}

/** Открывает уровень, не двигая прогресс раскладки назад. */
export function unlockLevel(layout: KeyboardLayout, level: number): void {
  const next = clampLevel(level);
  if (next <= maxUnlocked[layout]) return;
  maxUnlocked[layout] = next;
  writeStored(layout, next);
}

/** Засчитывает пройденный уровень: открывает следующий за ним. */
export function completeLevel(layout: KeyboardLayout, level: number): void {
  unlockLevel(layout, level + 1);
}
