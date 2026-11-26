/**
 * HUD: волна, счёт, жизни, серия, счётчик оставшихся.
 * Модуль только рисует состояние — ничего о нём не решает.
 */
import Phaser from 'phaser';
import { HEAL_STREAK, MAX_LIVES, START_LIVES } from './gameConfig';
import { INPUT_LINE_Y } from './typingInput';
import { TEXT_COLORS, uiText } from './theme';
import { createButton } from './uiButton';

export interface HudSnapshot {
  wave: number;
  remaining: number;
  lives: number;
  maxLives: number;
  /** Текущая серия без ошибок — из неё растёт лечение. */
  combo: number;
  score: number;
}

export interface HudOptions {
  onPause: () => void;
  onHome: () => void;
}

const PAUSE_HINT = 'Esc — пауза';
// Оба символа обязаны быть цветными emoji одинаковой ширины: без U+FE0F
// полное сердце рисуется узким текстовым глифом и в ряду появляется щель.
const HEART_FULL = '❤\uFE0F';
const HEART_LOST = '🖤';

const HUD_DEPTH = 5;

const SIDE_MARGIN = 24;
const RIGHT_TEXT_Y = [20, 56, 92, 124, 156]; // волна, осталось, жизни, серия, счёт

const BUTTON_SIZE = 48;
const BUTTON_Y = 44;
const BUTTON_GAP = 12;

const HOME_LABEL = '🏠';
const PAUSE_LABEL = '❙❙';

export class Hud {
  private waveText!: Phaser.GameObjects.Text;
  private remainingText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, options: HudOptions) {
    const { width } = scene.scale;
    const rightX = width - SIDE_MARGIN;

    // ── Левая сторона: кнопки ──────────────────────────────────────

    // Кнопка «Домой» — выход в главное меню.
    createButton(scene, SIDE_MARGIN, BUTTON_Y, {
      label: HOME_LABEL,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      onPress: options.onHome,
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
      .text(
        rightX,
        RIGHT_TEXT_Y[2],
        HEART_FULL.repeat(START_LIVES) + HEART_LOST.repeat(MAX_LIVES - START_LIVES),
        uiText('24px', TEXT_COLORS.onField),
      )
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.comboText = scene.add
      .text(rightX, RIGHT_TEXT_Y[3], '', uiText('16px', TEXT_COLORS.accent, true))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.scoreText = scene.add
      .text(rightX, RIGHT_TEXT_Y[4], 'Счёт: 0', uiText('24px', TEXT_COLORS.primary, true))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    // ── Подсказки ───────────────────────────────────────────────────
    // Правила игры показывает стартовый экран инструкции, поэтому
    // верхняя часть поля остаётся свободной.

    scene.add
      .text(rightX, INPUT_LINE_Y, PAUSE_HINT, uiText('14px', TEXT_COLORS.hint))
      .setOrigin(1, 0.5);
  }

  update(snapshot: HudSnapshot): void {
    this.waveText.setText(`Волна ${snapshot.wave}`);
    this.scoreText.setText(`Счёт: ${snapshot.score}`);
    this.remainingText.setText(`Осталось: ${snapshot.remaining}`);

    // Жизни: полные, пустые и максимальный порог.
    this.livesText.setText(
      HEART_FULL.repeat(Math.max(0, snapshot.lives)) +
        HEART_LOST.repeat(Math.max(0, snapshot.maxLives - snapshot.lives)),
    );

    // Серия до следующего лечения.
    this.comboText.setText(
      snapshot.combo > 0 ? `Серия: ${snapshot.combo}/${HEAL_STREAK}` : '',
    );
  }
}
