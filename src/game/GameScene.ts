import Phaser from 'phaser';
import { BASE_Y, FINAL_WAVE, START_LIVES } from './gameConfig';
import {
  createMonster,
  destroyMonster,
  findByPrefix,
  matchesTyped,
  refreshWord,
  shiftTypingStartedAt,
  stepMonster,
  type Monster,
} from './monsters';
import { getBestScore, rememberBestScore, ScoreKeeper } from './scoring';
import { createBase } from './stage';
import {
  playCombo,
  playDamage,
  playDefeat,
  playKill,
  playPause,
  playResume,
  playTrapWarning,
  playTypo,
  playVictory,
  playWaveStart,
} from './sound';
import { Hud, type HudSnapshot } from './hud';
import { TypingInput } from './typingInput';
import { Feedback } from './feedback';
import { EndScreen, type EndReason } from './endScreen';
import { PauseScreen } from './pauseScreen';
import { WaveRunner } from './waves';
import { TEXT_COLORS } from './theme';

/**
 * Сцена «Печатай и стреляй»: монстры ползут к базе, над каждым — слово.
 * Печатаешь слово — монстр умрёт. Обманки печатать нельзя. Esc — пауза.
 *
 * Логика разбита по модулям:
 *  gameConfig  — параметры баланса и волны
 *  scoring     — очки, комбо, лучший счёт
 *  monsters    — создание, движение, подсветка, удаление монстров
 *  waves       — прогресс волны и условия спавна
 *  hud         — тексты на экране (волна, счёт, жизни, осталось)
 *  typingInput — строка ввода и разбор клавиш
 *  feedback    — всплывающие очки, баннер волны, вспышки камеры
 *  stage       — декорации (линия базы)
 *  pauseScreen — экран паузы
 *  endScreen   — экран победы / поражения
 *  sound       — синтезированные сигналы
 */
export class GameScene extends Phaser.Scene {
  private monsters: Monster[] = [];
  private lives = START_LIVES;
  private gameOver = false;

  /** Пауза замораживает спавн, движение и набор слова. */
  private paused = false;
  private pausedAt = 0;

  private scoreKeeper = new ScoreKeeper();
  private waveRunner = new WaveRunner();
  private hud!: Hud;
  private typing!: TypingInput;
  private feedback!: Feedback;
  private endScreen: EndScreen | null = null;
  private pauseScreen: PauseScreen | null = null;

  constructor() {
    super('GameScene');
  }

  // ── Жизненный цикл сцены ──────────────────────────────────────────

  create(): void {
    this.hud = new Hud(this, { onPause: () => this.togglePause() });
    this.feedback = new Feedback(this);
    this.typing = new TypingInput(this);
    this.typing.onChange = () => this.refreshAllWords();
    createBase(this);
    this.setupInput();
    this.startWave(1);
  }

  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }
    this.input.keyboard.on('keydown', (event: KeyboardEvent) => this.onKeyDown(event));
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.paused) return;
    if (this.waveRunner.tick(delta, this.monsters.length)) {
      this.spawnMonster();
    }
    this.stepMonsters(delta);
  }

  // ── Пауза ─────────────────────────────────────────────────────────

  private togglePause(): void {
    if (this.gameOver) return;
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  private pause(): void {
    this.paused = true;
    this.pausedAt = this.time.now;
    this.pauseScreen = new PauseScreen(this, () => this.resume());
    playPause();
  }

  private resume(): void {
    if (!this.paused) return;

    // Игровое время шло и во время паузы, поэтому сдвигаем момент начала
    // набора, чтобы отдых не съедал бонус за скорость слова.
    shiftTypingStartedAt(this.monsters, this.time.now - this.pausedAt);
    this.closePause();
    playResume();
  }

  /** Снимает флаг и экран паузы, время набора не трогает. */
  private closePause(): void {
    this.paused = false;
    this.pauseScreen?.destroy();
    this.pauseScreen = null;
  }

  // ── Ввод ──────────────────────────────────────────────────────────

  private onKeyDown(event: KeyboardEvent): void {
    if (this.gameOver) return;

    const action = this.typing.readAction(event);
    if (!action) return;

    if (action.kind === 'pause') {
      this.togglePause();
      return;
    }

    // На паузе набор слова недоступен; Esc на экране паузы её снимает.
    if (this.paused) return;

    if (action.kind === 'backspace') {
      this.typing.setValue(this.typing.value.slice(0, -1));
      return;
    }
    if (action.kind === 'clear') {
      this.typing.clear();
      return;
    }

    const attempt = this.typing.value + action.char;
    const trap = findByPrefix(this.monsters, attempt, true);
    const normal = findByPrefix(this.monsters, attempt, false);

    if (trap && !normal) {
      this.triggerTrap(trap);
      return;
    }

    if (normal) {
      this.typing.setValue(attempt);
      if (normal.firstTypedAt === null) normal.firstTypedAt = this.time.now;
      if (attempt === normal.word) {
        this.killMonster(normal);
      }
      return;
    }

    this.wrongLetter();
  }

  // ── Монстры ───────────────────────────────────────────────────────

  private spawnMonster(): void {
    const monster = createMonster(this, this.waveRunner.config, this.monsters.map(m => m.word));
    if (monster.isTrap) playTrapWarning();
    this.monsters.push(monster);
    this.waveRunner.onSpawned();
  }

  private stepMonsters(delta: number): void {
    const reached: Monster[] = [];
    for (const m of this.monsters) {
      stepMonster(m, delta);
      if (m.y >= BASE_Y) reached.push(m);
    }
    for (const m of reached) this.monsterReachedBase(m);
  }

  private killMonster(monster: Monster): void {
    const award = this.scoreKeeper.awardWord(this.time.now, monster.firstTypedAt);
    this.feedback.floatingText(
      monster.x,
      monster.y,
      `+${award.points}${award.comboBonus > 0 ? `  комбо +${award.comboBonus}` : ''}`,
      TEXT_COLORS.success,
    );
    playKill();
    if (award.comboBonus > 0) playCombo();

    this.typing.clear();
    this.removeMonster(monster);
  }

  private triggerTrap(monster: Monster): void {
    this.scoreKeeper.breakCombo();
    this.typing.clear();
    this.feedback.dangerFlash();
    playDamage();
    this.feedback.floatingText(monster.x, monster.y, 'Обманка! −1 жизнь', TEXT_COLORS.danger);
    this.lives -= 1;
    this.removeMonster(monster);
    if (this.lives <= 0) {
      this.endGame('lose');
    }
  }

  private wrongLetter(): void {
    this.scoreKeeper.breakCombo();
    this.typing.clear();
    this.feedback.errorFlash();
    playTypo();
  }

  private monsterReachedBase(monster: Monster): void {
    if (matchesTyped(monster, this.typing.value)) {
      this.typing.clear();
    }

    if (monster.isTrap) {
      this.feedback.floatingText(monster.x, BASE_Y - 20, 'Обманка прошла', TEXT_COLORS.muted);
      this.removeMonster(monster);
      return;
    }

    this.scoreKeeper.breakCombo();
    this.lives -= 1;
    this.feedback.dangerFlash();
    playDamage();
    this.feedback.floatingText(monster.x, BASE_Y - 20, '−1 жизнь', TEXT_COLORS.danger);
    this.removeMonster(monster);

    if (this.lives <= 0) {
      this.endGame('lose');
    }
  }

  private removeMonster(monster: Monster): void {
    this.monsters = this.monsters.filter(m => m !== monster);
    destroyMonster(monster);
    this.waveRunner.onResolved();
    this.hud.update(this.takeSnapshot());
    this.checkWaveEnd();
  }

  // ── Волны ─────────────────────────────────────────────────────────

  private startWave(wave: number): void {
    this.waveRunner.start(wave);
    this.typing.clear();
    this.hud.update(this.takeSnapshot());
    this.feedback.waveBanner(`Волна ${wave}`);
    playWaveStart();
  }

  /** Полный сброс партии: вызывается кнопкой «Ещё» на экране итогов. */
  private resetAndRestart(): void {
    this.endScreen?.destroy();
    this.endScreen = null;
    this.closePause();

    for (const monster of this.monsters) {
      destroyMonster(monster);
    }
    this.monsters = [];

    this.gameOver = false;
    this.scoreKeeper.reset();
    this.lives = START_LIVES;
    this.startWave(1);
  }

  private checkWaveEnd(): void {
    if (this.gameOver) return;
    if (this.lives <= 0) return;
    if (!this.waveRunner.isFinished(this.monsters.length)) return;

    if (this.waveRunner.wave >= FINAL_WAVE) {
      this.endGame('win');
    } else {
      this.startWave(this.waveRunner.wave + 1);
    }
  }

  // ── Конец игры ────────────────────────────────────────────────────

  private endGame(reason: EndReason): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.closePause();
    rememberBestScore(this.scoreKeeper.score);
    if (reason === 'win') playVictory();
    else playDefeat();
    this.endScreen = new EndScreen(this, {
      reason,
      score: this.scoreKeeper.score,
      bestScore: getBestScore(),
      onRestart: () => this.resetAndRestart(),
    });
  }

  // ── Вспомогательные ───────────────────────────────────────────────

  private refreshAllWords(): void {
    const typed = this.typing.value;
    for (const m of this.monsters) refreshWord(m, typed);
  }

  private takeSnapshot(): HudSnapshot {
    return {
      wave: this.waveRunner.wave,
      remaining: this.waveRunner.remaining(),
      lives: this.lives,
      score: this.scoreKeeper.score,
    };
  }
}
