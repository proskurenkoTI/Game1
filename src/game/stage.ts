/**
 * Декорации поля: линия базы и её подпись.
 */
import Phaser from 'phaser';
import { BASE_Y } from './gameConfig';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';

const BASE_LABEL_Y = 545;

export function createBase(scene: Phaser.Scene): void {
  const { width } = scene.scale;

  scene.add.rectangle(width / 2, BASE_Y, width - 40, 2, SHAPE_COLORS.line);
  scene.add.text(width / 2, BASE_LABEL_Y, '🏠 БАЗА', uiText('26px', TEXT_COLORS.white)).setOrigin(0.5);
}
