/**
 * Данные режима «Азбука»: 50 уровней с набором падающих целей и нужным
 * количеством правильных попаданий. Есть два набора — русская и английская
 * раскладки, механика у них одинаковая.
 *
 * Цели — строки ровно в том виде, в котором их нужно печатать:
 * регистр, пробелы и знаки препинания значимы.
 */
import { ALPHABET_LEVELS_EN } from './alphabetLevelsEn';

/** Раскладка, на которой печатают цели режима «Азбука». */
export type KeyboardLayout = 'ru' | 'en';

export interface AlphabetLevelConfig {
  /** Номер уровня, 1..50. */
  id: number;
  /** Короткое название для заголовка сцены. */
  title: string;
  /** Уникальные цели, которые падают на поле. */
  targets: string[];
  /** Сколько правильных попаданий нужно, чтобы пройти уровень. */
  requiredClicks: number;
}

export const ALPHABET_LEVELS_RU: AlphabetLevelConfig[] = [
  { id: 1, title: 'Ф и Ы', targets: ['фы', 'ыф', 'фф', 'ыы'], requiredClicks: 200 },
  { id: 2, title: 'В и А', targets: ['ва', 'ав', 'фв', 'аы'], requiredClicks: 200 },
  { id: 3, title: 'П и Р', targets: ['пр', 'рп', 'па', 'ры'], requiredClicks: 200 },
  { id: 4, title: 'О и Л', targets: ['ол', 'ло', 'во', 'ал'], requiredClicks: 200 },
  { id: 5, title: 'Д и Ж', targets: ['дж', 'жд', 'од', 'ла'], requiredClicks: 200 },
  { id: 6, title: 'Э', targets: ['эа', 'эо', 'эл', 'эж'], requiredClicks: 150 },
  { id: 7, title: 'Повтор дома', targets: ['фы', 'ва', 'пр', 'ол'], requiredClicks: 150 },
  { id: 8, title: 'Пары дома', targets: ['фв', 'ыр', 'ап', 'од', 'лж'], requiredClicks: 150 },
  { id: 9, title: 'Й и Ц', targets: ['йц', 'цй', 'йо', 'цл'], requiredClicks: 200 },
  { id: 10, title: 'У и К', targets: ['ук', 'ку', 'йу', 'цк'], requiredClicks: 200 },
  { id: 11, title: 'Е и Н', targets: ['ен', 'не', 'уе', 'кн'], requiredClicks: 200 },
  { id: 12, title: 'Г и Ш', targets: ['гш', 'шг', 'ег', 'нш'], requiredClicks: 200 },
  { id: 13, title: 'Щ и З', targets: ['щз', 'зщ', 'гщ', 'шз'], requiredClicks: 200 },
  { id: 14, title: 'Х и Ъ', targets: ['хъ', 'ъх', 'щх', 'зъ'], requiredClicks: 200 },
  { id: 15, title: 'Повтор верха', targets: ['йц', 'ук', 'ен', 'гш'], requiredClicks: 150 },
  { id: 16, title: 'Пары верха', targets: ['цу', 'ке', 'нг', 'шщ', 'зх'], requiredClicks: 150 },
  { id: 17, title: 'Я и Ч', targets: ['яч', 'чя', 'яо', 'чл'], requiredClicks: 200 },
  { id: 18, title: 'С и М', targets: ['см', 'мс', 'яс', 'чм'], requiredClicks: 200 },
  { id: 19, title: 'И и Т', targets: ['ит', 'ти', 'си', 'мт'], requiredClicks: 200 },
  { id: 20, title: 'Ь и Б', targets: ['ьб', 'бь', 'иь', 'тб'], requiredClicks: 200 },
  { id: 21, title: 'Ю', targets: ['юя', 'юч', 'юс', 'юм'], requiredClicks: 150 },
  { id: 22, title: 'Повтор низа', targets: ['яч', 'см', 'ит', 'ьб', 'ю'], requiredClicks: 150 },
  { id: 23, title: 'Пары низа', targets: ['чс', 'ми', 'ти', 'бь', 'юя'], requiredClicks: 150 },
  { id: 24, title: 'Ё', targets: ['ёе', 'ёо', 'ёу', 'ёи'], requiredClicks: 150 },
  { id: 25, title: 'Гласные парами', targets: ['ао', 'уи', 'еы', 'яё'], requiredClicks: 120 },
  { id: 26, title: 'Согласные парами', targets: ['фв', 'дж', 'цк', 'шщ'], requiredClicks: 120 },
  { id: 27, title: 'Левая и правая рука', targets: ['фй', 'ыц', 'ву', 'ак'], requiredClicks: 120 },
  { id: 28, title: 'Верх и низ', targets: ['йя', 'цч', 'ус', 'км'], requiredClicks: 120 },
  { id: 29, title: 'Дом и верх', targets: ['фц', 'ыу', 'вк', 'ае'], requiredClicks: 120 },
  { id: 30, title: 'Дом и низ', targets: ['фя', 'ыч', 'вс', 'ам'], requiredClicks: 120 },
  { id: 31, title: 'Верх и низ', targets: ['йч', 'цс', 'йс', 'чц'], requiredClicks: 120 },
  { id: 32, title: 'Все ряды в парах', targets: ['фы', 'йц', 'ыц', 'фй'], requiredClicks: 120 },
  { id: 33, title: 'Слоги из 2 букв', targets: ['на', 'по', 'но'], requiredClicks: 100 },
  { id: 34, title: 'Слоги из 3 букв', targets: ['при', 'пир'], requiredClicks: 100 },
  { id: 35, title: 'Короткие слова', targets: ['да', 'ад', 'он', 'но'], requiredClicks: 100 },
  { id: 36, title: 'Слова 4-5 букв', targets: ['факт', 'вата'], requiredClicks: 80 },
  { id: 37, title: 'Пары с пробелом', targets: ['фы ва', 'ыф ав'], requiredClicks: 80 },
  { id: 38, title: 'Заглавные буквы', targets: ['Фы', 'Вф', 'Аа'], requiredClicks: 80 },
  { id: 39, title: 'Знаки препинания', targets: ['фы,', 'ыф.', 'фф!'], requiredClicks: 80 },
  { id: 40, title: 'Ё-пары', targets: ['ёе', 'ёо', 'ёу'], requiredClicks: 100 },
  { id: 41, title: 'Ъ и Ь', targets: ['ъх', 'ьб', 'ъь'], requiredClicks: 100 },
  { id: 42, title: 'Э-пары', targets: ['эа', 'эо', 'эл'], requiredClicks: 100 },
  { id: 43, title: 'Редкие буквы', targets: ['ёэ', 'ъь'], requiredClicks: 100 },
  { id: 44, title: 'Повтор дома', targets: ['фы', 'ва', 'ыв', 'аф'], requiredClicks: 100 },
  { id: 45, title: 'Повтор верха', targets: ['йц', 'ук', 'цй', 'ку'], requiredClicks: 100 },
  { id: 46, title: 'Повтор низа', targets: ['яч', 'см', 'чя', 'мс'], requiredClicks: 100 },
  { id: 47, title: 'Смешанные с редкими', targets: ['ёф', 'эы'], requiredClicks: 100 },
  { id: 48, title: 'Короткие фразы', targets: ['да он', 'он да'], requiredClicks: 80 },
  { id: 49, title: 'Пары, пробел, заглавные', targets: ['Фы ва', 'Ва фы'], requiredClicks: 80 },
  {
    id: 50,
    title: 'Финал',
    targets: ['фы', 'йц', 'яч', 'ёэ', 'ва', 'ук', 'юя', 'да он', 'он да'],
    requiredClicks: 150,
  },
];

/** Все уровни раскладки. */
export function getAlphabetLevels(layout: KeyboardLayout): AlphabetLevelConfig[] {
  return layout === 'en' ? ALPHABET_LEVELS_EN : ALPHABET_LEVELS_RU;
}

/**
 * Количество уровней. Наборы раскладок одинаковой длины; считаем по русскому,
 * чтобы число не зависело от порядка инициализации модулей.
 */
export const ALPHABET_LEVEL_COUNT = ALPHABET_LEVELS_RU.length;

/** Конфиг уровня по номеру. Вне диапазона — первый уровень раскладки. */
export function getAlphabetLevel(layout: KeyboardLayout, id: number): AlphabetLevelConfig {
  const levels = getAlphabetLevels(layout);
  return levels.find((level) => level.id === id) ?? levels[0];
}

export function hasNextAlphabetLevel(id: number): boolean {
  return id < ALPHABET_LEVEL_COUNT;
}

/** Время уровня в виде MM:SS. */
export function formatLevelTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ── Параметры падения целей ────────────────────────────────────────────

/** Скорость целей первого уровня, px/с. */
export const TARGET_BASE_SPEED = 55;
/** Прибавка к скорости за каждый номер уровня. */
export const TARGET_SPEED_PER_LEVEL = 0.6;
export const MAX_TARGET_SPEED = 95;

/** Сколько целей может висеть на поле одновременно. */
export const MAX_CONCURRENT_TARGETS = 4;
export const TARGET_SPAWN_COOLDOWN_MS = 800;
export const FIRST_TARGET_DELAY_MS = 500;

/** Цели поздних уровней падают быстрее. */
export function getTargetSpeed(level: number): number {
  return Math.min(
    TARGET_BASE_SPEED + (level - 1) * TARGET_SPEED_PER_LEVEL,
    MAX_TARGET_SPEED,
  );
}
