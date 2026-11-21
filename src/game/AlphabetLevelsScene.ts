/**
 * Экран выбора уровня режима «Азбука»: сетка квадратных кнопок с номерами
 * 1..50, кнопка «Домой» в левом верхнем углу и кнопка-стрелка переключения
 * раскладки (ру/EN) в правом верхнем углу.
 *
 * Пройденные уровни отмечены галочкой, следующий за ними открыт, остальные
 * показаны замками и не кликаются — прогресс каждой раскладки хранится
 * отдельно в alphabetProgress.
 */
import Phaser from 'phaser';
import { getAlphabetLevels, type KeyboardLayout } from './alphabetLevels';
import { getMaxUnlockedLevel, isLevelCompleted, isLevelUnlocked } from './alphabetProgress';
import { TEXT_COLORS, applyCanvasTheme, uiText } from './theme';
import { createButton, createPlaceholderButton } from './uiButton';

/**
 * Раскладка, выбранная игроком. Держится в модуле, а не в сцене, чтобы
 * выбор переживал возврат из уровня и повторный вход в режим.
 */
let currentLayout: KeyboardLayout = 'ru';

const TITLE = 'Азбука';

const GRID_COLS = 10;

const TILE_SIZE = 62;
const TILE_GAP = 16;

const TITLE_Y = 84;
const SUBTITLE_Y = 134;
/** Вертикальный центр сетки: подзаголовок сверху, немного воздуха снизу. */
const GRID_CENTER_Y = 400;

const HOME_LABEL = '🏠';
const BUTTON_SIZE = 48;
const MARGIN = 24;

/** Кнопка-стрелка: на ней написано, на какую раскладку она переключает. */
const LAYOUT_LABEL_WIDTH = 128;
const LAYOUT_LABELS: Record<KeyboardLayout, string> = {
  ru: 'EN →',
  en: '← RU',
};

const LOCKED_LABEL = '🔒';
const DONE_MARK = '✓';

export class AlphabetLevelsScene extends Phaser.Scene {
  constructor() {
    super('AlphabetLevelsScene');
  }

  create(): void {
    applyCanvasTheme(this);

    const { width } = this.scale;

    createButton(this, MARGIN + BUTTON_SIZE / 2, MARGIN + BUTTON_SIZE / 2, {
      label: HOME_LABEL,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      onPress: () => this.goToMenu(),
    });

    this.createLayoutSwitch(width);

    this.add
      .text(
        width / 2,
        TITLE_Y,
        `${TITLE} · ${currentLayout.toUpperCase()}`,
        uiText('44px', TEXT_COLORS.accent, true),
      )
      .setOrigin(0.5);

    this.add
      .text(width / 2, SUBTITLE_Y, this.subtitle(), uiText('18px', TEXT_COLORS.subtitle))
      .setOrigin(0.5);

    this.drawGrid();
  }

  private createLayoutSwitch(width: number): void {
    createButton(this, width - MARGIN - LAYOUT_LABEL_WIDTH / 2, MARGIN + BUTTON_SIZE / 2, {
      label: LAYOUT_LABELS[currentLayout],
      width: LAYOUT_LABEL_WIDTH,
      height: BUTTON_SIZE,
      fontSize: '20px',
      onPress: () => this.switchLayout(),
    });
  }

  private subtitle(): string {
    const unlocked = getMaxUnlockedLevel(currentLayout);
    const hint = currentLayout === 'ru' ? 'печатай в русской раскладке' : 'печатай в английской раскладке';
    return `Пройдено ${unlocked - 1} из ${this.levels().length} · открыт уровень ${unlocked} · ${hint}`;
  }

  private levels() {
    return getAlphabetLevels(currentLayout);
  }

  private drawGrid(): void {
    const { width } = this.scale;
    const levels = this.levels();
    const rows = Math.ceil(levels.length / GRID_COLS);
    const gridWidth = GRID_COLS * TILE_SIZE + (GRID_COLS - 1) * TILE_GAP;
    const gridHeight = rows * TILE_SIZE + (rows - 1) * TILE_GAP;
    const gridLeft = width / 2 - gridWidth / 2;
    const gridTop = GRID_CENTER_Y - gridHeight / 2;

    for (const levelConfig of levels) {
      const level = levelConfig.id;
      const index = level - 1;
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      const x = gridLeft + TILE_SIZE / 2 + col * (TILE_SIZE + TILE_GAP);
      const y = gridTop + TILE_SIZE / 2 + row * (TILE_SIZE + TILE_GAP);

      if (!isLevelUnlocked(currentLayout, level)) {
        createPlaceholderButton(this, x, y, {
          label: LOCKED_LABEL,
          width: TILE_SIZE,
          height: TILE_SIZE,
          fontSize: '22px',
        });
        continue;
      }

      createButton(this, x, y, {
        label: String(level),
        width: TILE_SIZE,
        height: TILE_SIZE,
        onPress: () => this.selectLevel(level),
      });

      if (isLevelCompleted(currentLayout, level)) {
        this.add
          .text(
            x + TILE_SIZE / 2 - 7,
            y - TILE_SIZE / 2 + 3,
            DONE_MARK,
            uiText('14px', TEXT_COLORS.success, true),
          )
          .setOrigin(0.5, 0);
      }
    }
  }

  /** Перезапуск сцены перерисовывает сетку уже другой раскладки. */
  private switchLayout(): void {
    currentLayout = currentLayout === 'ru' ? 'en' : 'ru';
    this.scene.restart();
  }

  private selectLevel(level: number): void {
    this.scene.start('AlphabetScene', { level, layout: currentLayout });
  }

  private goToMenu(): void {
    this.scene.start('MenuScene');
  }
}
