/**
 * Экран конца игры: затемнение, итог, лучший счёт и кнопки рестарта / дома.
 * Владеет собственными GameObject'ами и умеет их убирать одним вызовом.
 */
import Phaser from 'phaser';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';
import { createButton } from './uiButton';

export type EndReason = 'win' | 'lose';

export interface EndScreenData {
  reason: EndReason;
  score: number;
  bestScore: number;
  onRestart: () => void;
  onHome: () => void;
}

const RESTART_LABEL = 'Ещё';
const HOME_LABEL = '🏠 Домой';
const BUTTON_WIDTH = 200;
const BUTTON_HEIGHT = 56;
const BUTTON_GAP = 24;
const BUTTONS_Y = 130;
const OVERLAY_ALPHA = 0.88;

const COPY: Record<EndReason, { title: string; subtitle: string }> = {
  win: { title: 'Победа!', subtitle: 'Все волны пройдены!' },
  lose: { title: 'Игра окончена', subtitle: 'Монстры добрались до базы.' },
};

export class EndScreen {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, data: EndScreenData) {
    const { width, height } = scene.scale;
    const centerY = height / 2;
    const copy = COPY[data.reason];

    // Весь экран держим в одном контейнере, чтобы одним вызовом
    // удалить его при рестарте.
    this.container = scene.add.container(0, 0).setDepth(50);

    const overlay = scene.add
      .rectangle(width / 2, centerY, width, height, SHAPE_COLORS.overlay, OVERLAY_ALPHA)
      .setInteractive();

    const titleText = scene.add
      .text(width / 2, centerY - 100, copy.title, uiText('44px', TEXT_COLORS.accent, true))
      .setOrigin(0.5);

    const subtitleText = scene.add
      .text(width / 2, centerY - 40, copy.subtitle, uiText('20px', TEXT_COLORS.subtitle))
      .setOrigin(0.5);

    const scoreText = scene.add
      .text(width / 2, centerY + 10, `Счёт: ${data.score}`, uiText('28px', TEXT_COLORS.bright, true))
      .setOrigin(0.5);

    const bestText = scene.add
      .text(width / 2, centerY + 52, `Лучший: ${data.bestScore}`, uiText('20px', TEXT_COLORS.muted))
      .setOrigin(0.5);

    // Две кнопки в ряд: рестарт слева, «Домой» — справа.
    const halfRow = BUTTON_WIDTH / 2 + BUTTON_GAP / 2;

    const restartButton = createButton(scene, width / 2 - halfRow, centerY + BUTTONS_Y, {
      label: RESTART_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: data.onRestart,
    });

    const homeButton = createButton(scene, width / 2 + halfRow, centerY + BUTTONS_Y, {
      label: HOME_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: data.onHome,
    });

    // Порядок имеет значение: overlay рисуется первым (под остальным),
    // а кнопки — последними (поверх него), поэтому получат клик.
    this.container.add([
      overlay,
      titleText,
      subtitleText,
      scoreText,
      bestText,
      restartButton,
      homeButton,
    ]);
  }

  destroy(): void {
    this.container.destroy();
  }
}
