/**
 * Общие стили текстов и цветовые константы.
 * Убирает дублирование fontFamily / fontSize / color по всем файлам.
 */
import Phaser from 'phaser';

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

const FONT_UI = 'system-ui, sans-serif';
const FONT_MONO = 'monospace';

/** Стиль обычного UI-текста. */
export function uiText(size: string, color: string, bold = false): TextStyle {
  return bold
    ? { fontFamily: FONT_UI, fontSize: size, color, fontStyle: 'bold' }
    : { fontFamily: FONT_UI, fontSize: size, color };
}

/** Стиль текста строки ввода (моноширинный, чтобы курсор не «прыгал»). */
export function monoText(size: string, color: string): TextStyle {
  return { fontFamily: FONT_MONO, fontSize: size, color };
}

/** CSS-цвета текстов. */
export const TEXT_COLORS = {
  primary: '#e2e8f0',
  muted: '#94a3b8',
  hint: '#64748b',
  trap: '#fca5a5',
  danger: '#f87171',
  accent: '#fbbf24',
  success: '#4ade80',
  white: '#ffffff',
  subtitle: '#cbd5e1',
  bright: '#f8fafc',
} as const;

/** Цвета заливошек (для rectangle). */
export const SHAPE_COLORS = {
  line: 0x334155,
  panel: 0x1e293b,
  overlay: 0x0f172a,
  button: 0x3b82f6,
  trapTint: 0xffb3b3,
} as const;
