/**
 * Экран результата уровня режима «Азбука»: затемнение, время прохождения
 * и кнопки «дальше / ещё раз» и «Домой».
 * Владеет собственными GameObject'ами и убирается одним destroy().
 */
import Phaser from 'phaser';
import { formatLevelTime } from './alphabetLevels';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';
import { createButton } from './uiButton';

export interface LevelCompleteData {
  level: number;
  title: string;
  timeMs: number;
  requiredClicks: number;
  /** Есть ли следующий уровень — меняет главную кнопку. */
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
}

const DEPTH = 50;
const OVERLAY_ALPHA = 0.88;

const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 56;
const HOME_WIDTH = 200;

const NEXT_LABEL = 'Следующий уровень →';
const REPLAY_LABEL = '↻ Ещё раз';
const HOME_LABEL = '🏠 Домой';

export class LevelCompleteScreen {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, data: LevelCompleteData) {
    const { width, height } = scene.scale;
    const centerY = height / 2;

    this.container = scene.add.container(0, 0).setDepth(DEPTH);

    const overlay = scene.add
      .rectangle(width / 2, centerY, width, height, SHAPE_COLORS.overlay, OVERLAY_ALPHA)
      .setInteractive();

    const titleText = scene.add
      .text(
        width / 2,
        centerY - 100,
        data.hasNext ? `Уровень ${data.level} пройден!` : 'Финальный уровень пройден!',
        uiText('44px', TEXT_COLORS.accent, true),
      )
      .setOrigin(0.5);

    const subtitleText = scene.add
      .text(width / 2, centerY - 44, data.title, uiText('20px', TEXT_COLORS.subtitle))
      .setOrigin(0.5);

    const timeText = scene.add
      .text(
        width / 2,
        centerY + 6,
        `Время: ${formatLevelTime(data.timeMs)}  ·  Попаданий: ${data.requiredClicks}`,
        uiText('26px', TEXT_COLORS.bright, true),
      )
      .setOrigin(0.5);

    const mainButton = createButton(scene, width / 2, centerY + 84, {
      label: data.hasNext ? NEXT_LABEL : REPLAY_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: data.hasNext ? data.onNext : data.onReplay,
    });

    const homeButton = createButton(scene, width / 2, centerY + 84 + BUTTON_HEIGHT + 16, {
      label: HOME_LABEL,
      width: HOME_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: data.onHome,
    });

    // Порядок важен: overlay первым, кнопки последними — иначе клик не дойдёт.
    this.container.add([overlay, titleText, subtitleText, timeText, mainButton, homeButton]);
  }

  destroy(): void {
    this.container.destroy();
  }
}
