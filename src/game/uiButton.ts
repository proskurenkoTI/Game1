/**
 * Кнопка поверх остальной графики: прямоугольник + подпись + hover-анимация.
 * Используется экраном паузы и экраном конца игры.
 */
import Phaser from 'phaser';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';

export interface ButtonOptions {
  label: string;
  width: number;
  height: number;
  /** Размер подписи, по умолчанию 22px. */
  fontSize?: string;
  onPress: () => void;
}

export interface PlaceholderButtonOptions {
  label: string;
  width: number;
  height: number;
  fontSize?: string;
}

const HOVER_SCALE = 1.06;
const HOVER_DURATION = 100;
const PLACEHOLDER_FILL_ALPHA = 0.45;

/** Кликабельная кнопка с hover-анимацией. */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: ButtonOptions,
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);

  const background = scene.add
    .rectangle(0, 0, options.width, options.height, SHAPE_COLORS.button)
    .setInteractive({ useHandCursor: true });

  const label = scene.add
    .text(0, 0, options.label, uiText(options.fontSize ?? '22px', TEXT_COLORS.onButton, true))
    .setOrigin(0.5);

  button.add([background, label]);

  background.on('pointerdown', options.onPress);
  background.on('pointerover', () =>
    scene.tweens.add({ targets: button, scale: HOVER_SCALE, duration: HOVER_DURATION }),
  );
  background.on('pointerout', () =>
    scene.tweens.add({ targets: button, scale: 1, duration: HOVER_DURATION }),
  );

  return button;
}

/**
 * Кнопка-заглушка: выглядит как кнопка, но не интерактивна.
 * Нужна для элементов интерфейса, которые ещё не реализованы.
 */
export function createPlaceholderButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: PlaceholderButtonOptions,
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);

  const background = scene.add
    .rectangle(0, 0, options.width, options.height, SHAPE_COLORS.button)
    .setAlpha(PLACEHOLDER_FILL_ALPHA);

  const label = scene.add
    .text(0, 0, options.label, uiText(options.fontSize ?? '22px', TEXT_COLORS.onButton, true))
    .setOrigin(0.5)
    .setAlpha(PLACEHOLDER_FILL_ALPHA);

  button.add([background, label]);

  return button;
}
