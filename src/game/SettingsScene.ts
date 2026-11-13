/**
 * Экран настроек: звук и тема.
 *
 * Значения живут в модулях sound и theme, поэтому действуют до
 * перезагрузки страницы: после F5 звук снова включён, тема снова тёмная.
 * Кнопка показывает текущее значение и переключает его, а сцена
 * перезапускается, чтобы подпись и цвета перерисовались.
 */
import Phaser from 'phaser';
import { isSoundEnabled, setSoundEnabled } from './sound';
import { TEXT_COLORS, applyCanvasTheme, getTheme, toggleTheme, uiText } from './theme';
import { createButton } from './uiButton';

const TITLE = 'Настройки';
const NOTE = 'Настройки действуют до перезагрузки страницы.';

const BUTTON_WIDTH = 300;
const BUTTON_HEIGHT = 56;
const BUTTON_GAP = 20;

const TITLE_Y = 180;
const FIRST_BUTTON_Y = 300;

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create(): void {
    applyCanvasTheme(this);

    const { width } = this.scale;
    const centerX = width / 2;

    this.add
      .text(centerX, TITLE_Y, TITLE, uiText('44px', TEXT_COLORS.accent, true))
      .setOrigin(0.5);

    createButton(this, centerX, FIRST_BUTTON_Y, {
      label: this.soundLabel(),
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.toggleSound(),
    });

    createButton(this, centerX, FIRST_BUTTON_Y + BUTTON_HEIGHT + BUTTON_GAP, {
      label: this.themeLabel(),
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.switchTheme(),
    });

    createButton(this, centerX, FIRST_BUTTON_Y + 2 * (BUTTON_HEIGHT + BUTTON_GAP), {
      label: 'Назад',
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.scene.start('MenuScene'),
    });

    this.add
      .text(centerX, FIRST_BUTTON_Y + 3 * (BUTTON_HEIGHT + BUTTON_GAP), NOTE, uiText('14px', TEXT_COLORS.hint))
      .setOrigin(0.5);
  }

  private soundLabel(): string {
    return isSoundEnabled() ? '🔊 Звук: включён' : '🔇 Звук: выключен';
  }

  private themeLabel(): string {
    return getTheme() === 'dark' ? '🌙 Тема: тёмная' : '☀️ Тема: светлая';
  }

  /** scene.restart() ставится в очередь менеджера сцен, поэтому из pointerdown безопасен. */
  private toggleSound(): void {
    setSoundEnabled(!isSoundEnabled());
    this.scene.restart();
  }

  private switchTheme(): void {
    toggleTheme();
    this.scene.restart();
  }
}
