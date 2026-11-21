/**
 * Модель падающей цели режима «Азбука»: плашка с буквами, движение вниз,
 * подсветка уже напечатанной части и удаление.
 *
 * Цели уровня — короткие строки (пары букв, слоги, слова, фразы). Игрок
 * печатает цель целиком, она «собирается» и засчитывается как попадание.
 */
import Phaser from 'phaser';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';

/** Откуда стартует плашка — чуть выше верхнего края поля. */
export const TARGET_SPAWN_Y = -40;
/** Ниже этой линии цель считается упущенной и исчезает. */
export const TARGET_MISS_Y = 552;

const MIN_X = 90;
const MAX_X_MARGIN = 90;

const TILE_HEIGHT = 52;
const TILE_PADDING_X = 14;
const FONT_SIZE = '26px';

const SPEED_MIN = 0.9;
const SPEED_MAX = 1.1;

export interface AlphabetTarget {
  /** Строка, которую нужно напечатать целиком. */
  text: string;
  x: number;
  y: number;
  speed: number;
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
}

/**
 * true, если новая цель конфликтует с уже падающей: одна начинается с другой.
 * Такие цели не выпускаем одновременно, иначе непонятно, какую печатаешь.
 */
function conflicts(candidate: string, activeTexts: string[]): boolean {
  return activeTexts.some(
    (active) => candidate === active || candidate.startsWith(active) || active.startsWith(candidate),
  );
}

/**
 * Заводит новую цель у верхнего края.
 * Возвращает null, если все цели уровня уже на поле или конфликтуют.
 */
export function createTarget(
  scene: Phaser.Scene,
  levelTargets: string[],
  activeTexts: string[],
  baseSpeed: number,
): AlphabetTarget | null {
  const candidates = levelTargets.filter((text) => !conflicts(text, activeTexts));
  if (candidates.length === 0) return null;

  const text = candidates[Math.floor(Math.random() * candidates.length)];
  const { width } = scene.scale;
  const x = Phaser.Math.Between(MIN_X, width - MAX_X_MARGIN);
  const speed = baseSpeed * Phaser.Math.FloatBetween(SPEED_MIN, SPEED_MAX);

  const container = scene.add.container(x, TARGET_SPAWN_Y);
  const label = scene.add
    .text(0, 0, text, uiText(FONT_SIZE, TEXT_COLORS.onField, true))
    .setOrigin(0.5);
  const plate = scene.add
    .rectangle(0, 0, label.width + TILE_PADDING_X * 2, TILE_HEIGHT, SHAPE_COLORS.panel)
    .setStrokeStyle(1, SHAPE_COLORS.line);

  container.add([plate, label]);

  return { text, x, y: TARGET_SPAWN_Y, speed, container, label };
}

/** Шаг цели вниз за delta миллисекунд. true — цель ушла за нижнюю черту. */
export function stepTarget(target: AlphabetTarget, delta: number): boolean {
  target.y += (target.speed * delta) / 1000;
  target.container.y = target.y;
  return target.y >= TARGET_MISS_Y;
}

/** true, если набранный префикс начинает цель. */
export function matchesTyped(target: AlphabetTarget, typed: string): boolean {
  return typed !== '' && target.text.startsWith(typed);
}

/** Первая цель нужного типа, чей текст начинается с префикса. */
export function findByPrefix(
  targets: AlphabetTarget[],
  prefix: string,
  exact: boolean,
): AlphabetTarget | undefined {
  return targets.find((target) =>
    exact ? target.text === prefix : target.text.startsWith(prefix),
  );
}

/** Показывать в плашке только неотпечатанную часть и подсветить её. */
export function refreshLabel(target: AlphabetTarget, typed: string): void {
  if (matchesTyped(target, typed)) {
    target.label.setText(target.text.slice(typed.length));
    target.label.setColor(TEXT_COLORS.accent);
  } else {
    target.label.setText(target.text);
    target.label.setColor(TEXT_COLORS.onField);
  }
}

export function destroyTarget(target: AlphabetTarget): void {
  target.container.destroy();
}
