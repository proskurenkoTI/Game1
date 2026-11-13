/**
 * Главное меню: заголовок, подсказка и две кнопки.
 * Игра отсюда не запускается сама — ждём нажатия «Играть».
 */
import Phaser from 'phaser';
import { TEXT_COLORS, applyCanvasTheme, uiText } from './theme';
import { createButton } from './uiButton';

const TITLE = 'Печатай и стреляй';
const HINT = 'Печатай слово над монстром — он умрёт.\nМигающие слова — обманки, их печатать нельзя!';

const PLAY_LABEL = 'Играть';
const SETTINGS_LABEL = 'Настройки';

const TITLE_Y = 200;
const HINT_Y = 280;
const FIRST_BUTTON_Y = 380;

const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 56;
const BUTTON_GAP = 20;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    applyCanvasTheme(this);

    const { width } = this.scale;
    const centerX = width / 2;

    this.add
      .text(centerX, TITLE_Y, TITLE, uiText('48px', TEXT_COLORS.accent, true))
      .setOrigin(0.5);

    this.add
      .text(centerX, HINT_Y, HINT, uiText('18px', TEXT_COLORS.subtitle))
      .setOrigin(0.5)
      .setAlign('center');

    createButton(this, centerX, FIRST_BUTTON_Y, {
      label: PLAY_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.startGame(),
    });

    createButton(this, centerX, FIRST_BUTTON_Y + BUTTON_HEIGHT + BUTTON_GAP, {
      label: SETTINGS_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.openSettings(),
    });
  }

  private startGame(): void {
    this.scene.start('GameScene');
  }

  private openSettings(): void {
    this.scene.start('SettingsScene');
  }
}
