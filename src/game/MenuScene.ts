/**
 * Главное меню: выбор режима игры и кнопка настроек.
 * Игра отсюда не запускается сама — ждём нажатия на режим.
 */
import Phaser from 'phaser';
import { TEXT_COLORS, applyCanvasTheme, uiText } from './theme';
import { createButton, createPlaceholderButton } from './uiButton';

const TITLE = 'Печатай и стреляй';
const HINT = 'Печатай слово — монстр умрёт. Мигающие слова — обманки, не печатай!';

const MODE_DEFENSE = '🏰 Оборона базы';
const MODE_ALPHABET = '🔤 Азбука';
const MODE_JUMP = '🍄 Буквопрыг · скоро';

const SETTINGS_LABEL = 'Настройки';

const TITLE_Y = 150;
const HINT_Y = 210;
const FIRST_MODE_Y = 280;
const SETTINGS_Y = 510;

const BUTTON_WIDTH = 280;
const BUTTON_HEIGHT = 56;
const MODE_BUTTON_GAP = 14;

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

    // «Оборона базы» — реализованный режим, текущая GameScene.
    createButton(this, centerX, FIRST_MODE_Y, {
      label: MODE_DEFENSE,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.startGame(),
    });

    // «Азбука» — выбор уровня режима.
    createButton(this, centerX, FIRST_MODE_Y + BUTTON_HEIGHT + MODE_BUTTON_GAP, {
      label: MODE_ALPHABET,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.openAlphabetLevels(),
    });

    // Режим-заглушка: выглядит как кнопка, но не кликабельна.
    createPlaceholderButton(
      this,
      centerX,
      FIRST_MODE_Y + 2 * (BUTTON_HEIGHT + MODE_BUTTON_GAP),
      {
        label: MODE_JUMP,
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
      },
    );

    createButton(this, centerX, SETTINGS_Y, {
      label: SETTINGS_LABEL,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      onPress: () => this.openSettings(),
    });
  }

  private startGame(): void {
    this.scene.start('GameScene');
  }

  private openAlphabetLevels(): void {
    this.scene.start('AlphabetLevelsScene');
  }

  private openSettings(): void {
    this.scene.start('SettingsScene');
  }
}
