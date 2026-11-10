/**
 * Строка ввода: рамка, напечатанный текст, мигающий курсор
 * и разбор клавиш в действия. Про слова и монстры ничего не знает.
 */
import Phaser from 'phaser';
import { SHAPE_COLORS, TEXT_COLORS, monoText } from './theme';

export type TypingAction =
  | { kind: 'backspace' }
  | { kind: 'clear' }
  | { kind: 'char'; char: string }
  | { kind: 'pause' };

/** Разрешённые символы: латиница, кириллица, цифры. */
const ALLOWED_CHAR = /^[a-zа-я0-9]$/;

export const INPUT_LINE_Y = 590;
const INPUT_TEXT_X = 28;
const INPUT_BOX_HEIGHT = 44;
const CURSOR_GAP = 2;
const CURSOR_BLINK_MS = 500;

export class TypingInput {
  /** Вызывается после каждого изменения строки ввода. */
  onChange: ((typed: string) => void) | null = null;

  private typed = '';
  private inputText: Phaser.GameObjects.Text;
  private cursorText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { width } = scene.scale;

    scene.add
      .rectangle(width / 2, INPUT_LINE_Y, width - 40, INPUT_BOX_HEIGHT, SHAPE_COLORS.panel)
      .setStrokeStyle(1, SHAPE_COLORS.line);

    this.inputText = scene.add
      .text(INPUT_TEXT_X, INPUT_LINE_Y, '> ', monoText('24px', TEXT_COLORS.primary))
      .setOrigin(0, 0.5);

    this.cursorText = scene.add
      .text(INPUT_TEXT_X + this.inputText.width, INPUT_LINE_Y, '|', monoText('24px', TEXT_COLORS.accent))
      .setOrigin(0, 0.5);

    scene.tweens.add({
      targets: this.cursorText,
      alpha: 0,
      duration: CURSOR_BLINK_MS,
      yoyo: true,
      repeat: -1,
    });
  }

  get value(): string {
    return this.typed;
  }

  setValue(typed: string): void {
    this.typed = typed;
    this.inputText.setText(`> ${typed}`);
    this.cursorText.setX(this.inputText.x + this.inputText.width + CURSOR_GAP);
    this.onChange?.(typed);
  }

  clear(): void {
    this.setValue('');
  }

  /**
   * Превращает событие клавиатуры в действие ввода.
   * null — клавиша не относится к набору слова.
   */
  readAction(event: KeyboardEvent): TypingAction | null {
    const key = event.key;

    if (key === 'Backspace') {
      event.preventDefault();
      return { kind: 'backspace' };
    }
    if (key === 'Enter') {
      event.preventDefault();
      return { kind: 'clear' };
    }
    if (key === 'Escape') {
      event.preventDefault();
      return { kind: 'pause' };
    }
    if (key.length !== 1) return null;

    const char = key.toLowerCase();
    if (!ALLOWED_CHAR.test(char)) return null;

    event.preventDefault();
    return { kind: 'char', char };
  }
}
