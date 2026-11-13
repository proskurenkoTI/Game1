/**
 * Модель монстра: создание визуала, движение, подсветка слова, уничтожение.
 */
import Phaser from 'phaser';
import { BASE_Y, MONSTER_EMOJIS, MONSTER_SPAWN_Y, type WaveConfig } from './gameConfig';
import { randomWord } from './words';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';

export interface Monster {
  word: string;
  isTrap: boolean;
  x: number;
  y: number;
  speed: number;
  container: Phaser.GameObjects.Container;
  wordText: Phaser.GameObjects.Text;
  firstTypedAt: number | null;
}

/**
 * Заводит монстра у верхнего края поля.
 * Обманка отличается визуально: курсив, красный цвет и мигание.
 */
export function createMonster(
  scene: Phaser.Scene,
  config: WaveConfig,
  activeWords: string[],
): Monster {
  const { width } = scene.scale;
  const isTrap = Math.random() < config.trapChance;
  const word = randomWord(config.minWordLen, config.maxWordLen, activeWords);
  const x = Phaser.Math.Between(80, width - 80);
  const speed = config.speed * Phaser.Math.FloatBetween(0.9, 1.1);

  const container = scene.add.container(x, MONSTER_SPAWN_Y);
  const emoji = scene.add
    .text(0, 0, MONSTER_EMOJIS[Math.floor(Math.random() * MONSTER_EMOJIS.length)], {
      fontSize: '40px',
    })
    .setOrigin(0.5);
  const wordText = scene.add
    .text(0, -44, word, uiText('20px', TEXT_COLORS.onField, true))
    .setOrigin(0.5);
  container.add([emoji, wordText]);

  if (isTrap) {
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

  return {
    word,
    isTrap,
    x,
    y: MONSTER_SPAWN_Y,
    speed,
    container,
    wordText,
    firstTypedAt: null,
  };
}

/** Шаг монстра вниз за delta миллисекунд. true — монстр дошёл до базы. */
export function stepMonster(monster: Monster, delta: number): boolean {
  monster.y += (monster.speed * delta) / 1000;
  monster.container.y = monster.y;
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

/** Показать в слове только неотпечатанную часть и подсветить её. */
export function refreshWord(monster: Monster, typed: string): void {
  if (matchesTyped(monster, typed)) {
    monster.wordText.setText(monster.word.slice(typed.length));
    monster.wordText.setColor(TEXT_COLORS.accent);
  } else {
    monster.wordText.setText(monster.word);
    monster.wordText.setColor(monster.isTrap ? TEXT_COLORS.trap : TEXT_COLORS.onField);
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
