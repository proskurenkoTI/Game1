/**
 * Общие стили текстов и палитры.
 *
 * Тема переключается на лету: TEXT_COLORS и SHAPE_COLORS — активные цвета
 * текущей темы, их читают все модули. Уже нарисованные объекты перекрашиваются
 * при следующем запуске сцены (сцены строят визуал заново в create()), поэтому
 * экран настроек после смены темы перезапускается.
 *
 * Тема всегда стартует с тёмной и нигде не сохраняется.
 */
import Phaser from 'phaser';

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

const FONT_UI = 'system-ui, sans-serif';
const FONT_MONO = 'monospace';

export type ThemeName = 'dark' | 'light';

/**
 * CSS-цвета текстов.
 * onField — текст на фоне игрового поля, onButton — подпись на цветной плашке кнопки.
 */
export type TextKey =
  | 'primary'
  | 'muted'
  | 'hint'
  | 'trap'
  | 'danger'
  | 'accent'
  | 'success'
  | 'onField'
  | 'onButton'
  | 'subtitle'
  | 'bright';

/** Цвета заливошек (для rectangle) и тонировки обманки. */
export type ShapeKey = 'line' | 'panel' | 'overlay' | 'button' | 'trapTint';

interface Palette {
  text: Record<TextKey, string>;
  shape: Record<ShapeKey, number>;
  /** Фон canvas (камеры). */
  canvas: string;
  /** Фон страницы вокруг canvas. */
  page: string;
}

const PALETTES: Record<ThemeName, Palette> = {
  dark: {
    text: {
      primary: '#e2e8f0',
      muted: '#94a3b8',
      hint: '#64748b',
      trap: '#fca5a5',
      danger: '#f87171',
      accent: '#fbbf24',
      success: '#4ade80',
      onField: '#ffffff',
      onButton: '#ffffff',
      subtitle: '#cbd5e1',
      bright: '#f8fafc',
    },
    shape: {
      line: 0x334155,
      panel: 0x1e293b,
      overlay: 0x0f172a,
      button: 0x3b82f6,
      trapTint: 0xffb3b3,
    },
    canvas: '#0f172a',
    page: '#111827',
  },
  light: {
    text: {
      primary: '#0f172a',
      muted: '#475569',
      hint: '#64748b',
      trap: '#be123c',
      danger: '#dc2626',
      accent: '#b45309',
      success: '#15803d',
      onField: '#0f172a',
      onButton: '#ffffff',
      subtitle: '#334155',
      bright: '#020617',
    },
    shape: {
      line: 0x94a3b8,
      panel: 0xffffff,
      overlay: 0xf8fafc,
      button: 0x2563eb,
      trapTint: 0xf87171,
    },
    canvas: '#f1f5f9',
    page: '#e2e8f0',
  },
};

/** Активные цвета текстов — читай напрямую, не запоминай значения. */
export const TEXT_COLORS: Record<TextKey, string> = { ...PALETTES.dark.text };

/** Активные цвета заливошек. */
export const SHAPE_COLORS: Record<ShapeKey, number> = { ...PALETTES.dark.shape };

const PAGE_BG_VARIABLE = '--page-bg';

let currentTheme: ThemeName = 'dark';

export function getTheme(): ThemeName {
  return currentTheme;
}

export function getCanvasBackground(): string {
  return PALETTES[currentTheme].canvas;
}

/** Ставит фон камеры: у каждой сцены своя камера, зови из create(). */
export function applyCanvasTheme(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(getCanvasBackground());
}

export function setTheme(theme: ThemeName): void {
  currentTheme = theme;

  const palette = PALETTES[theme];
  Object.assign(TEXT_COLORS, palette.text);
  Object.assign(SHAPE_COLORS, palette.shape);

  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(PAGE_BG_VARIABLE, palette.page);
  }
}

/** Меняет тёмную на светлую и наоборот, возвращает новую тему. */
export function toggleTheme(): ThemeName {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  return currentTheme;
}

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
