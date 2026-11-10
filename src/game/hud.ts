/**
 * HUD: волна, счёт, жизни, счётчик оставшихся и подсказка.
 * Модуль только рисует состояние — ничего о нём не решает.
 */
import Phaser from 'phaser';
import { START_LIVES } from './gameConfig';
import { INPUT_LINE_Y } from './typingInput';
import { TEXT_COLORS, uiText } from './theme';
import { createButton, createPlaceholderButton } from './uiButton';

export interface HudSnapshot {
  wave: number;
  remaining: number;
  lives: number;
  score: number;
}

export interface HudOptions {
  onPause: () => void;
}

const HINT_TEXT = 'Печатай слово — монстр умрёт. Мигающие слова — обманки, не печатай!';
const PAUSE_HINT = 'Esc — пауза';
const HEART_FULL = '❤';
const HEART_LOST = '🖤';

const HUD_DEPTH = 5;

const SIDE_MARGIN = 24;
const RIGHT_TEXT_Y = [20, 56, 92, 128]; // волна, осталось, жизни, счёт

const HINT_Y = 76;

const BUTTON_SIZE = 48;
const BUTTON_Y = 44;
const BUTTON_GAP = 12;

const SETTINGS_LABEL = '⚙';
const PAUSE_LABEL = '❙❙';

export class Hud {
  private waveText!: Phaser.GameObjects.Text;
  private remainingText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, options: HudOptions) {
    const { width } = scene.scale;
    const rightX = width - SIDE_MARGIN;

    // ── Левая сторона: кнопки ──────────────────────────────────────

    // Кнопка настроек — заглушка, не кликабельна.
    createPlaceholderButton(scene, SIDE_MARGIN, BUTTON_Y, {
      label: SETTINGS_LABEL,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
    }).setDepth(HUD_DEPTH);

    // Кнопка паузы — кликабельна, вызывает togglePause.
    createButton(scene, SIDE_MARGIN + BUTTON_SIZE + BUTTON_GAP, BUTTON_Y, {
      label: PAUSE_LABEL,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      onPress: options.onPause,
    }).setDepth(HUD_DEPTH);

    // ── Правая сторона: статистика столбцом ─────────────────────────

    this.waveText = scene.add
      .text(rightX, RIGHT_TEXT_Y[0], 'Волна 1', uiText('24px', TEXT_COLORS.primary, true))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.remainingText = scene.add
      .text(rightX, RIGHT_TEXT_Y[1], 'Осталось: 5', uiText('18px', TEXT_COLORS.muted))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.livesText = scene.add
      .text(rightX, RIGHT_TEXT_Y[2], HEART_FULL.repeat(START_LIVES), uiText('24px', TEXT_COLORS.white))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.scoreText = scene.add
      .text(rightX, RIGHT_TEXT_Y[3], 'Счёт: 0', uiText('24px', TEXT_COLORS.primary, true))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    // ── Подсказки ───────────────────────────────────────────────────

    scene.add
      .text(width / 2, HINT_Y, HINT_TEXT, uiText('14px', TEXT_COLORS.hint))
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH);

    scene.add
      .text(rightX, INPUT_LINE_Y, PAUSE_HINT, uiText('14px', TEXT_COLORS.hint))
      .setOrigin(1, 0.5);
  }

  update(snapshot: HudSnapshot): void {
    this.waveText.setText(`Волна ${snapshot.wave}`);
    this.scoreText.setText(`Счёт: ${snapshot.score}`);
    this.remainingText.setText(`Осталось: ${snapshot.remaining}`);
    this.livesText.setText(
      HEART_FULL.repeat(Math.max(0, snapshot.lives)) +
        HEART_LOST.repeat(Math.max(0, START_LIVES - snapshot.lives)),
    );
  }
}
