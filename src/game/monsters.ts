/**
 * Модель монстра: создание визуала, движение, подсветка слова, уничтожение.
 *
 * Типы (kind):
 *  normal    — обычная цель
 *  trap      — обманка, печатать нельзя
 *  anagram   — слово показывают как есть, печатать надо задом наперёд
 *  composite — «огонь лёд», два слова подряд через пробел
 *  jumper    — периодически смещается по горизонтали
 *  ghost     — на время становится полупрозрачным, слово видно плохо
 *  bomb      — при убийстве взрывается и снимает соседей по радиусу
 *  shield    — прикрывает соседа, пока жив
 *  healer    — при убийстве возвращает жизнь
 */
import Phaser from 'phaser';
import {
  BASE_Y,
  MONSTER_EMOJIS,
  MONSTER_SPAWN_Y,
  fallSpeedFor,
  type WaveConfig,
  commonSpecialChance,
  rareSpecialChance,
} from './gameConfig';
import { randomComposite, randomWord, reverseWord } from './words';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';

export type MonsterKind =
  | 'normal'
  | 'trap'
  | 'anagram'
  | 'composite'
  | 'jumper'
  | 'ghost'
  | 'bomb'
  | 'shield'
  | 'healer';

export interface Monster {
  kind: MonsterKind;
  /** Что нужно напечатать. Для анаграммы — слово задом наперёд. */
  word: string;
  /** Что показано над монстром. */
  label: string;
  isTrap: boolean;
  x: number;
  y: number;
  speed: number;
  container: Phaser.GameObjects.Container;
  wordText: Phaser.GameObjects.Text;
  /** Значок «меня прикрывает щит», скрыт, пока щит жив. */
  shieldBadge: Phaser.GameObjects.Text;
  firstTypedAt: number | null;

  // ── Поведение особых типов ────────────────────────────────────────
  /** Прыгун: куда и когда смещаться. */
  targetX: number;
  jumpTimer: number;
  /** Призрак: фаза невидимости. */
  phaseTimer: number;
  phaseHidden: boolean;
  /** Щит: кого прикрывает; прикрытый монстр: кто его прикрывает. */
  protectedMonster: Monster | null;
  shieldedBy: Monster | null;
}

/** Иконка типа: игрок должен одним взглядом понимать, с чем имеет дело. */
const KIND_EMOJI: Partial<Record<MonsterKind, string>> = {
  anagram: '🔀',
  composite: '🎯',
  jumper: '🦘',
  ghost: '👻',
  bomb: '💣',
  shield: '🛡️',
  healer: '💖',
};

/** Частые особые монстры: анаграмма, два слова, прыгун, призрак, щит. */
const COMMON_POOL: { kind: MonsterKind; fromWave: number }[] = [
  { kind: 'jumper', fromWave: 2 },
  { kind: 'anagram', fromWave: 2 },
  { kind: 'ghost', fromWave: 4 },
  { kind: 'composite', fromWave: 4 },
  { kind: 'shield', fromWave: 4 },
];

/** Редкие особые монстры: бомба и лечение. Появляются по своей норме. */
const RARE_POOL: { kind: MonsterKind; fromWave: number }[] = [
  { kind: 'bomb', fromWave: 3 },
  { kind: 'healer', fromWave: 7 },
];

const GHOST_VISIBLE_MS = 2200;
const GHOST_HIDDEN_MS = 1100;
const GHOST_HIDDEN_ALPHA = 0.12;
const JUMP_INTERVAL_MS = 1400;

function pickKind(config: WaveConfig): MonsterKind {
  if (Math.random() < config.trapChance) return 'trap';

  // Редкие монстры (бомба, лечение) идут по собственной норме. Каждый тип
  // бросает шанс отдельно, иначе они делили бы одну вероятность пополам.
  const rareChance = rareSpecialChance(config);
  let rarePicked: MonsterKind | null = null;
  for (const entry of RARE_POOL) {
    if (config.wave >= entry.fromWave && Math.random() < rareChance) {
      rarePicked = entry.kind;
    }
  }
  if (rarePicked) return rarePicked;

  // Частые особые монстры: после 4-й волны шанс заметно растёт.
  if (Math.random() < commonSpecialChance(config)) {
    const pool = COMMON_POOL.filter((e) => config.wave >= e.fromWave);
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)].kind;
  }

  return 'normal';
}

/**
 * Подбирает слово под тип монстра.
 * @param blocked уже набранные на поле слова — с ними нельзя конфликтовать
 * @returns null, если тип сейчас выпустить нечем (тогда монстр станет обычным)
 */
function makeWord(
  kind: MonsterKind,
  config: WaveConfig,
  blocked: string[],
): { word: string; label: string } | null {
  if (kind === 'composite') {
    // Составную цель собираем из коротких слов, иначе строка не влезет в поле.
    const composite = randomComposite(3, 5, blocked);
    return composite ? { word: composite, label: composite } : null;
  }

  const word = randomWord(
    kind === 'shield' || kind === 'healer' ? Math.min(3, config.minWordLen) : config.minWordLen,
    kind === 'shield' || kind === 'healer' ? 5 : config.maxWordLen,
    blocked,
  );

  if (kind === 'anagram') {
    const reversed = reverseWord(word);
    if (reversed === null) return null;
    // Показываем слово как есть, печатать надо его задом наперёд.
    return { word: reversed, label: word };
  }

  return { word, label: word };
}

/**
 * Заводит монстра у верхнего края поля.
 * Обманка отличается визуально: курсив, красный цвет и мигание.
 */
export function createMonster(
  scene: Phaser.Scene,
  config: WaveConfig,
  alive: Monster[],
): Monster {
  const { width } = scene.scale;
  const blocked = collectBlocked(alive);
  let kind = pickKind(config);

  let picked = makeWord(kind, config, blocked);
  // Слово подошло не всякому типу — откатываемся к обычному монстру.
  if (picked === null) {
    kind = 'normal';
    picked = makeWord('normal', config, blocked)!;
  }

  const { word, label } = picked;
  const x = Phaser.Math.Between(80, width - 80);
  const speed = fallSpeedFor(config.speed, word.length) * Phaser.Math.FloatBetween(0.9, 1.1);

  const container = scene.add.container(x, MONSTER_SPAWN_Y);
  const emoji = scene.add
    .text(0, 0, KIND_EMOJI[kind] ?? MONSTER_EMOJIS[Math.floor(Math.random() * MONSTER_EMOJIS.length)], {
      fontSize: '40px',
    })
    .setOrigin(0.5);
  const wordText = scene.add
    .text(0, -44, label, uiText('20px', TEXT_COLORS.onField, true))
    .setOrigin(0.5);
  // Значок щита висит над прикрытым монстром и виден, только пока щит жив.
  const shieldBadge = scene.add
    .text(0, 30, '🛡️', { fontSize: '20px' })
    .setOrigin(0.5)
    .setVisible(false);
  container.add([emoji, wordText, shieldBadge]);

  if (kind === 'trap') {
    wordText.setFontStyle('bold italic');
    wordText.setColor(TEXT_COLORS.trap);
    emoji.setTint(SHAPE_COLORS.trapTint);
    scene.tweens.add({
      targets: wordText,
      alpha: 0.3,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
  }

  if (kind === 'anagram') {
    wordText.setColor(TEXT_COLORS.accent);
  }

  if (kind === 'composite') {
    wordText.setFontSize(18);
  }

  return {
    kind,
    word,
    label,
    isTrap: kind === 'trap',
    x,
    y: MONSTER_SPAWN_Y,
    speed,
    container,
    wordText,
    shieldBadge,
    firstTypedAt: null,
    targetX: x,
    jumpTimer: JUMP_INTERVAL_MS,
    phaseTimer: GHOST_VISIBLE_MS,
    phaseHidden: false,
    protectedMonster: null,
    shieldedBy: null,
  };
}

/**
 * Слова, которые нельзя брать новым монстрам: полные слова поля плюс
 * части составной цели — иначе «огонь» и «огонь лёд» запутают ввод.
 */
function collectBlocked(alive: Monster[]): string[] {
  const blocked: string[] = [];
  for (const monster of alive) {
    blocked.push(monster.word);
    if (monster.kind === 'composite') blocked.push(...monster.word.split(' '));
  }
  return blocked;
}

/**
 * Щит прикрепляется к живому соседу: пока щит не убит, цель неприкосновенна.
 * Возвращает false, если прикрывать некого (щит тогда ведёт себя как обычный).
 */
export function attachShield(shield: Monster, monsters: Monster[]): boolean {
  const candidates = monsters.filter(
    (m) =>
      !m.isTrap &&
      m.kind !== 'shield' &&
      m.kind !== 'bomb' &&
      m.shieldedBy === null &&
      // Монстр, который уже начали печатать, прикрывать нельзя — это
      // отобрало бы у игрока начатое слово.
      m.firstTypedAt === null,
  );
  if (candidates.length === 0) return false;

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  shield.protectedMonster = target;
  target.shieldedBy = shield;
  target.shieldBadge.setVisible(true);
  return true;
}

/** Снимает защиту с прикрываемого монстра (щит погиб). */
export function releaseShield(shield: Monster): void {
  const target = shield.protectedMonster;
  if (!target) return;
  target.shieldedBy = null;
  target.shieldBadge.setVisible(false);
  shield.protectedMonster = null;
}

/**
 * Прикрываемый монстр покинул поле своим ходом — щит теряет цель,
 * иначе он останется указывать на уничтоженный объект.
 */
export function detachProtectedTarget(monster: Monster): void {
  const shield = monster.shieldedBy;
  if (!shield) return;
  shield.protectedMonster = null;
  monster.shieldedBy = null;
  monster.shieldBadge.setVisible(false);
}

/** true, если монстра сейчас прикрывает живой щит. */
export function isShielded(monster: Monster): boolean {
  return monster.shieldedBy !== null;
}

/** Шаг монстра вниз за delta миллисекунд. true — монстр дошёл до базы. */
export function stepMonster(monster: Monster, delta: number): boolean {
  monster.y += (monster.speed * delta) / 1000;
  monster.container.y = monster.y;

  if (monster.kind === 'jumper') {
    monster.jumpTimer -= delta;
    if (monster.jumpTimer <= 0) {
      const { width } = monster.container.scene.scale;
      monster.targetX = Phaser.Math.Between(80, width - 80);
      monster.jumpTimer = JUMP_INTERVAL_MS;
    }
    // Плавный уход в сторону: прыжок читается глазом, но не teleport-скачок.
    monster.x += (monster.targetX - monster.x) * Math.min(1, delta / 260);
    monster.container.x = monster.x;
  }

  if (monster.kind === 'ghost') {
    monster.phaseTimer -= delta;
    if (monster.phaseTimer <= 0) {
      monster.phaseHidden = !monster.phaseHidden;
      monster.phaseTimer = monster.phaseHidden ? GHOST_HIDDEN_MS : GHOST_VISIBLE_MS;
      monster.container.setAlpha(monster.phaseHidden ? 0.3 : 1);
      monster.wordText.setAlpha(monster.phaseHidden ? GHOST_HIDDEN_ALPHA : 1);
    }
  }

  return monster.y >= BASE_Y;
}

/** true, если набранный префикс начинает слово монстра. */
export function matchesTyped(monster: Monster, typed: string): boolean {
  return typed !== '' && monster.word.startsWith(typed);
}

/** Первый монстр нужного типа, чьё слово начинается с префикса. */
export function findByPrefix(
  monsters: Monster[],
  prefix: string,
  isTrap: boolean,
): Monster | undefined {
  return monsters.find((monster) => monster.isTrap === isTrap && monster.word.startsWith(prefix));
}

/**
 * Показать в слове только неотпечатанную часть и подсветить её.
 * У анаграммы слово набирают с конца, поэтому гасим уже набранные буквы
 * справа: остаток читается как продолжение ввода в обратном порядке.
 */
export function refreshWord(monster: Monster, typed: string): void {
  const active = matchesTyped(monster, typed);
  const idleColor = monster.isTrap ? TEXT_COLORS.trap : TEXT_COLORS.onField;

  if (monster.kind === 'anagram') {
    const rest = active ? monster.label.slice(0, monster.label.length - typed.length) : monster.label;
    monster.wordText.setText(rest);
    monster.wordText.setColor(active ? TEXT_COLORS.accent : idleColor);
    return;
  }

  if (active) {
    monster.wordText.setText(monster.word.slice(typed.length));
    monster.wordText.setColor(TEXT_COLORS.accent);
  } else {
    monster.wordText.setText(monster.label);
    monster.wordText.setColor(idleColor);
  }
}

export function destroyMonster(monster: Monster): void {
  monster.container.destroy();
}

/**
 * Сдвигает момент начала набора слова на pausedMs вперёд.
 * Нужен после паузы: иначе время, проведённое в паузе,
 * «съедает» бонус за быстрое слово.
 */
export function shiftTypingStartedAt(monsters: Monster[], pausedMs: number): void {
  if (pausedMs <= 0) return;
  for (const monster of monsters) {
    if (monster.firstTypedAt !== null) {
      monster.firstTypedAt += pausedMs;
    }
  }
}
