/**
 * Стартовый экран инструкции режима «Оборона базы»: правила, значки монстров
 * и кнопка «В бой». Пока открыт — игра заморожена.
 */
import Phaser from 'phaser';
import { SHAPE_COLORS, TEXT_COLORS, uiText } from './theme';
import { createButton } from './uiButton';

const DEPTH = 45;
const OVERLAY_ALPHA = 0.88;

const TITLE = 'Как играть';

const RULES: string[] = [
  'Печатай слово над монстром — монстр умрёт.',
  'Мигающие красные слова — обманки: печатать нельзя, минус жизнь.',
  'Монстр дошёл до базы — минус жизнь.',
  '5 точных слов подряд — плюс одна жизнь. Esc — пауза.',
];

const LEGEND =
  '🔀 наоборот · 🎯 два слова · 🦘 прыгун · 👻 призрак · 💣 взрыв · 🛡️ щит · 💖 +1 жизнь';

const BUTTON_LABEL = '▶ В бой';
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 56;

export class HowToPlayScreen {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, onPlay: () => void) {
    const { width, height } = scene.scale;
    const centerY = height / 2;

    this.container = scene.add.container(0, 0).setDepth(DEPTH);

    const overlay = scene.add
      .rectangle(width / 2, centerY, width, height, SHAPE_COLORS.overlay, OVERLAY_ALPHA)
      .setInteractive();

    const titleText = scene.add
      .text(width / 2, centerY - 150, TITLE, uiText('44px', TEXT_COLORS.accent, true))
      .setOrigin(0.5);

    const rules = RULES.map((line, i) =>
      scene.add
        .text(width / 2, centerY - 84 + i * 38, line, uiText('20px', TEXT_COLORS.subtitle))
        .setOrigin(0.5),
    );

    const legendText = scene.add
      .text(width / 2, centerY + 78, LEGEND, uiText('16px', TEXT_COLORS.hint))
      .setOrigin(0.5);

    const button = createButton(scene, width / 2, centerY + 140, {
      label: BUTTON_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: onPlay,
    });

    // Порядок важен: overlay первым, кнопка последней — иначе клик не дойдёт.
    this.container.add([overlay, titleText, ...rules, legendText, button]);
  }

  destroy(): void {
    this.container.destroy();
  }
}
