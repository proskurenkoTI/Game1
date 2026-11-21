/**
 * Сцена уровня режима «Азбука»: сверху падают плашки с буквами, игрок
 * печатает их целиком. Каждое верно набранное слово — попадание.
 *
 * Уровень заканчивается, когда набрано нужное количество попаданий:
 * ошибки уровень не прерывают, упущенная плашка просто улетает вниз.
 * Справа сверху — прогресс в процентах и время уровня, слева сверху — «Домой».
 * Раскладка (ру/en) приходит в данных сцены и определяет цели и набор клавиш.
 */
import Phaser from 'phaser';
import {
  getAlphabetLevel,
  getTargetSpeed,
  hasNextAlphabetLevel,
  FIRST_TARGET_DELAY_MS,
  MAX_CONCURRENT_TARGETS,
  TARGET_SPAWN_COOLDOWN_MS,
  formatLevelTime,
  type KeyboardLayout,
} from './alphabetLevels';
import { completeLevel, getMaxUnlockedLevel, isLevelUnlocked } from './alphabetProgress';
import {
  createTarget,
  destroyTarget,
  findByPrefix,
  matchesTyped,
  refreshLabel,
  stepTarget,
  type AlphabetTarget,
} from './alphabetTargets';
import { LevelCompleteScreen } from './levelCompleteScreen';
import { Feedback } from './feedback';
import { TypingInput, type TypingInputOptions } from './typingInput';
import { playKill, playTypo, playVictory, playWaveStart } from './sound';
import { TEXT_COLORS, applyCanvasTheme, uiText } from './theme';
import { createButton } from './uiButton';

export interface AlphabetSceneData {
  level: number;
  layout: KeyboardLayout;
}

const HUD_DEPTH = 5;
const SIDE_MARGIN = 24;

const HOME_LABEL = '🏠';
const HOME_BUTTON_SIZE = 48;
const HOME_CENTER = SIDE_MARGIN + HOME_BUTTON_SIZE / 2;

const TITLE_Y = 26;
const HINT_Y = 76;

const RIGHT_TEXT_Y = [20, 58, 94];

/**
 * Пробел (фразы), верхний регистр и знаки препинания — часть целей уровней.
 * Точка с запятой нужна английским уровням про ряд A и ;.
 */
const TYPING_OPTIONS: Record<KeyboardLayout, TypingInputOptions> = {
  ru: { allowSpace: true, keepCase: true, letters: 'ru', extraChars: '.,!?' },
  en: { allowSpace: true, keepCase: true, letters: 'en', extraChars: '.,!?;' },
};

export class AlphabetScene extends Phaser.Scene {
  private level = 1;
  private layout: KeyboardLayout = 'ru';
  private targets: AlphabetTarget[] = [];
  private hits = 0;
  private elapsedMs = 0;
  private finished = false;

  private spawnCooldown = FIRST_TARGET_DELAY_MS;

  private feedback!: Feedback;
  private typing!: TypingInput;
  private progressText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private hitsText!: Phaser.GameObjects.Text;
  private completeScreen: LevelCompleteScreen | null = null;

  constructor() {
    super('AlphabetScene');
  }

  // ── Жизненный цикл ────────────────────────────────────────────────

  init(data?: Partial<AlphabetSceneData>): void {
    this.layout = data?.layout === 'en' ? 'en' : 'ru';
    const requested = typeof data?.level === 'number' ? data.level : 1;
    this.level = Math.min(Math.max(requested, 1), getMaxUnlockedLevel(this.layout));
    this.targets = [];
    this.hits = 0;
    this.elapsedMs = 0;
    this.finished = false;
    this.spawnCooldown = FIRST_TARGET_DELAY_MS;
    this.completeScreen = null;
  }

  create(): void {
    applyCanvasTheme(this);
    this.feedback = new Feedback(this);
    this.typing = new TypingInput(this, TYPING_OPTIONS[this.layout]);
    this.typing.onChange = () => this.refreshAllLabels();
    this.createHud();
    this.setupInput();
    playWaveStart();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    this.elapsedMs += delta;
    this.timeText.setText(`⏱ ${formatLevelTime(this.elapsedMs)}`);

    if (this.spawnCooldown <= 0) {
      this.trySpawnTarget();
      this.spawnCooldown = TARGET_SPAWN_COOLDOWN_MS;
    } else {
      this.spawnCooldown -= delta;
    }

    this.stepTargets(delta);
  }

  // ── Интерфейс ─────────────────────────────────────────────────────

  private createHud(): void {
    const { width } = this.scale;
    const config = getAlphabetLevel(this.layout, this.level);
    const rightX = width - SIDE_MARGIN;

    createButton(this, HOME_CENTER, HOME_CENTER, {
      label: HOME_LABEL,
      width: HOME_BUTTON_SIZE,
      height: HOME_BUTTON_SIZE,
      onPress: () => this.goToLevels(),
    }).setDepth(HUD_DEPTH);

    this.add
      .text(
        width / 2,
        TITLE_Y,
        `Уровень ${config.id} · ${config.title} · ${this.layout.toUpperCase()}`,
        uiText('26px', TEXT_COLORS.accent, true),
      )
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH);

    this.add
      .text(
        width / 2,
        HINT_Y,
        `Печатай падающую цель целиком · Esc — вернуться к уровням · переключи клавиатуру на ${this.layout.toUpperCase()}`,
        uiText('14px', TEXT_COLORS.hint),
      )
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH);

    this.progressText = this.add
      .text(rightX, RIGHT_TEXT_Y[0], '0%', uiText('34px', TEXT_COLORS.success, true))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.timeText = this.add
      .text(rightX, RIGHT_TEXT_Y[1], '⏱ 00:00', uiText('24px', TEXT_COLORS.primary, true))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.hitsText = this.add
      .text(rightX, RIGHT_TEXT_Y[2], '', uiText('16px', TEXT_COLORS.muted))
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.updateHud();
  }

  /** Прогресс не может превышать 100%, сколько бы попаданий ни было. */
  private progressPercent(): number {
    const { requiredClicks } = getAlphabetLevel(this.layout, this.level);
    return Math.min(100, Math.floor((this.hits * 100) / requiredClicks));
  }

  private updateHud(): void {
    const { requiredClicks } = getAlphabetLevel(this.layout, this.level);
    this.progressText.setText(`${this.progressPercent()}%`);
    this.hitsText.setText(`Попаданий: ${Math.min(this.hits, requiredClicks)}/${requiredClicks}`);
  }

  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }
    this.input.keyboard.on('keydown', (event: KeyboardEvent) => this.onKeyDown(event));
  }

  // ── Ввод ──────────────────────────────────────────────────────────

  private onKeyDown(event: KeyboardEvent): void {
    if (this.finished) return;

    const action = this.typing.readAction(event);
    if (!action) return;

    if (action.kind === 'pause') {
      this.goToLevels();
      return;
    }
    if (action.kind === 'backspace') {
      this.typing.setValue(this.typing.value.slice(0, -1));
      return;
    }
    if (action.kind === 'clear') {
      this.typing.clear();
      return;
    }

    const attempt = this.typing.value + action.char;
    const completed = findByPrefix(this.targets, attempt, true);
    if (completed) {
      this.registerHit(completed);
      return;
    }

    const partial = findByPrefix(this.targets, attempt, false);
    if (partial) {
      this.typing.setValue(attempt);
      return;
    }

    this.registerMiss();
  }

  // ── Попадания и ошибки ────────────────────────────────────────────

  private registerHit(target: AlphabetTarget): void {
    this.hits += 1;
    this.feedback.floatingText(target.x, target.y, '+1', TEXT_COLORS.success);
    playKill();
    this.typing.clear();
    this.removeTarget(target);
    this.updateHud();
    this.checkLevelEnd();
  }

  /** Ошибка не завершает уровень: сбрасываем ввод и идём дальше. */
  private registerMiss(): void {
    this.typing.clear();
    this.feedback.errorFlash();
    playTypo();
  }

  /** Плашка упала ниже поля — не засчитываем, уровень продолжается. */
  private dropTarget(target: AlphabetTarget): void {
    // Если под упавшую цель было что-то напечатано, строку ввода обнуляем.
    if (matchesTyped(target, this.typing.value)) {
      this.typing.clear();
    }
    this.removeTarget(target);
    this.feedback.floatingText(target.x, target.y, 'мимо', TEXT_COLORS.muted);
  }

  private removeTarget(target: AlphabetTarget): void {
    this.targets = this.targets.filter((item) => item !== target);
    destroyTarget(target);
  }

  // ── Спавн и движение целей ────────────────────────────────────────

  private trySpawnTarget(): void {
    if (this.targets.length >= MAX_CONCURRENT_TARGETS) return;
    const config = getAlphabetLevel(this.layout, this.level);
    const target = createTarget(
      this,
      config.targets,
      this.targets.map((item) => item.text),
      getTargetSpeed(this.level),
    );
    if (target) this.targets.push(target);
  }

  private stepTargets(delta: number): void {
    const fallen: AlphabetTarget[] = [];
    for (const target of this.targets) {
      if (stepTarget(target, delta)) fallen.push(target);
    }
    for (const target of fallen) this.dropTarget(target);
  }

  private refreshAllLabels(): void {
    const typed = this.typing.value;
    for (const target of this.targets) refreshLabel(target, typed);
  }

  // ── Конец уровня и переходы ───────────────────────────────────────

  private checkLevelEnd(): void {
    const config = getAlphabetLevel(this.layout, this.level);
    if (this.hits < config.requiredClicks) return;

    this.finished = true;
    completeLevel(this.layout, this.level);
    playVictory();
    this.showCompleteScreen(config.title, config.requiredClicks);
  }

  private showCompleteScreen(title: string, requiredClicks: number): void {
    this.completeScreen = new LevelCompleteScreen(this, {
      level: this.level,
      title,
      timeMs: this.elapsedMs,
      requiredClicks,
      hasNext: hasNextAlphabetLevel(this.level),
      onNext: () => this.startLevel(this.level + 1),
      onReplay: () => this.startLevel(this.level),
      onHome: () => this.goToLevels(),
    });
  }

  private startLevel(level: number): void {
    if (!isLevelUnlocked(this.layout, level)) return;
    this.completeScreen?.destroy();
    this.completeScreen = null;
    this.scene.start('AlphabetScene', { level, layout: this.layout });
  }

  private goToLevels(): void {
    this.scene.start('AlphabetLevelsScene');
  }
}
