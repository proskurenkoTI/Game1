/**
 * Кратковременная обратная связь: всплывающие очки, баннер волны, вспышки камеры.
 */
import Phaser from 'phaser';
import { TEXT_COLORS, uiText } from './theme';

const FLOATING_DEPTH = 30;
const FLOATING_RISE = 50;
const FLOATING_DURATION = 700;

const BANNER_DEPTH = 10;
const BANNER_RISE = 40;
const BANNER_DURATION = 1200;
const BANNER_DELAY = 600;

export class Feedback {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Надпись, которая всплывает вверх и гаснет (очки, потери жизни). */
  floatingText(x: number, y: number, text: string, color: string): void {
    const label = this.scene.add
      .text(x, y, text, uiText('20px', color, true))
      .setOrigin(0.5)
      .setDepth(FLOATING_DEPTH);

    this.scene.tweens.add({
      targets: label,
      y: y - FLOATING_RISE,
      alpha: 0,
      duration: FLOATING_DURATION,
      onComplete: () => label.destroy(),
    });
  }

  /** Крупная надпись по центру — начало волны. */
  waveBanner(text: string): void {
    const { width, height } = this.scene.scale;
    const banner = this.scene.add
      .text(width / 2, height / 2 - 60, text, uiText('40px', TEXT_COLORS.accent, true))
      .setOrigin(0.5)
      .setDepth(BANNER_DEPTH);

    this.scene.tweens.add({
      targets: banner,
      alpha: 0,
      y: height / 2 - 60 - BANNER_RISE,
      duration: BANNER_DURATION,
      delay: BANNER_DELAY,
      onComplete: () => banner.destroy(),
    });
  }

  /** Резкая красная вспышка — потерян жизнь. */
  dangerFlash(): void {
    this.scene.cameras.main.flash(180, 255, 60, 60);
  }

  /** Мягкая вспышка — опечатка. */
  errorFlash(): void {
    this.scene.cameras.main.flash(80, 255, 200, 200);
  }
}
