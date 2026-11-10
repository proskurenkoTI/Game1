/**
 * Экран паузы: полупрозрачное затемнение, заголовок и кнопка продолжения.
 * Экран владеет своими GameObject'ами и убирается одним destroy().
 */
import Phaser from 'phaser';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';
import { createButton } from './uiButton';

const DEPTH = 40;
const OVERLAY_ALPHA = 0.7;
const TITLE = 'Пауза';
const HINT = 'Монстры ждут. Нажми Esc или кнопку, чтобы продолжить.';
const BUTTON_LABEL = 'Продолжить';
const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 56;

export class PauseScreen {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, onResume: () => void) {
    const { width, height } = scene.scale;
    const centerY = height / 2;

    this.container = scene.add.container(0, 0).setDepth(DEPTH);

    // Затемнение легче, чем на конце игры: поле боя должно оставаться видно.
    const overlay = scene.add
      .rectangle(width / 2, centerY, width, height, SHAPE_COLORS.overlay, OVERLAY_ALPHA)
      .setInteractive();

    const titleText = scene.add
      .text(width / 2, centerY - 70, TITLE, uiText('44px', TEXT_COLORS.accent, true))
      .setOrigin(0.5);

    const hintText = scene.add
      .text(width / 2, centerY - 10, HINT, uiText('18px', TEXT_COLORS.subtitle))
      .setOrigin(0.5);

    const button = createButton(scene, width / 2, centerY + 60, {
      label: BUTTON_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: onResume,
    });

    // Порядок важен: overlay первым, кнопка последней — иначе клик не дойдёт.
    this.container.add([overlay, titleText, hintText, button]);
  }

  destroy(): void {
    this.container.destroy();
  }
}
