import Phaser from 'phaser';
import { BOMB_RADIUS, BASE_Y, MAX_LIVES, START_LIVES } from './gameConfig';
import {
  attachShield,
  createMonster,
  destroyMonster,
  detachProtectedTarget,
  findByPrefix,
  isShielded,
  matchesTyped,
  refreshWord,
  releaseShield,
  shiftTypingStartedAt,
  stepMonster,
  type Monster,
} from './monsters';
import { getBestScore, rememberBestScore, ScoreKeeper, type WordAward } from './scoring';
import { createBase } from './stage';
import {
  playCombo,
  playDamage,
  playDefeat,
  playExplosion,
  playHeal,
  playKill,
  playPause,
  playResume,
  playShieldBlock,
  playTrapWarning,
  playTypo,
  playWaveStart,
} from './sound';
import { Hud, type HudSnapshot } from './hud';
import { TypingInput } from './typingInput';
import { Feedback } from './feedback';
import { EndScreen, type EndReason } from './endScreen';
import { HowToPlayScreen } from './howToPlayScreen';
import { PauseScreen } from './pauseScreen';
import { WaveRunner } from './waves';
import { TEXT_COLORS, applyCanvasTheme } from './theme';

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
 *  howToPlayScreen — стартовая инструкция
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
  private introScreen: HowToPlayScreen | null = null;
  private waitingForStart = false;
  private skipIntro = false;

  constructor() {
    super('GameScene');
  }

  // ── Жизненный цикл сцены ──────────────────────────────────────────

  /**
   * Phaser вызывает init() перед каждым запуском сцены — и при первом
   * старте из меню, и при рестарте. Инициализаторы полей конструктора
   * повторно не отрабатывают, поэтому состояние партии сбрасываем здесь.
   */
  init(data?: { skipIntro?: boolean }): void {
    this.monsters = [];
    this.lives = START_LIVES;
    this.gameOver = false;
    this.paused = false;
    this.pausedAt = 0;
    this.skipIntro = data?.skipIntro === true;
    this.waitingForStart = false;
    this.scoreKeeper.reset();
    this.endScreen = null;
    this.pauseScreen = null;
    this.introScreen = null;
  }

  create(): void {
    applyCanvasTheme(this);
    this.hud = new Hud(this, {
      onPause: () => this.togglePause(),
      onHome: () => this.goToMenu(),
    });
    this.feedback = new Feedback(this);
    this.typing = new TypingInput(this, { allowSpace: true });
    this.typing.onChange = () => this.refreshAllWords();
    createBase(this);
    this.setupInput();
    // Рестарт партии («Ещё» на экране итогов) не должен показывать инструкцию.
    if (this.skipIntro) {
      this.startGame();
    } else {
      this.showIntro();
    }
  }

  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }
    this.input.keyboard.on('keydown', (event: KeyboardEvent) => this.onKeyDown(event));
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.paused || this.waitingForStart) return;
    if (this.waveRunner.tick(delta, this.monsters.length)) {
      this.spawnMonster();
    }
    this.stepMonsters(delta);
  }

  // ── Стартовая инструкция ──────────────────────────────────────────

  /**
   * Показывает правила и морозит партию: спавн, движение и набор слова
   * недоступны, пока игрок не нажмёт «В бой».
   */
  private showIntro(): void {
    this.waitingForStart = true;
    this.introScreen = new HowToPlayScreen(this, () => this.startGame());
  }

  /** Убирает инструкцию и запускает первую волну. */
  private startGame(): void {
    this.waitingForStart = false;
    this.introScreen?.destroy();
    this.introScreen = null;
    this.startWave(1);
  }

  // ── Пауза ─────────────────────────────────────────────────────────

  private togglePause(): void {
    if (this.gameOver || this.waitingForStart) return;
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
    if (this.gameOver || this.waitingForStart) return;

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
        // Щит не даёт убить прикрываемого: набираем, но не засчитываем.
        if (isShielded(normal)) {
          this.blockedByShield(normal);
        } else {
          this.killMonster(normal, false);
        }
      }
      return;
    }

    this.wrongLetter();
  }

  // ── Монстры ───────────────────────────────────────────────────────

  private spawnMonster(): void {
    const monster = createMonster(this, this.waveRunner.config, this.monsters);

    if (monster.isTrap) {
      playTrapWarning();
    } else if (monster.kind === 'shield') {
      attachShield(monster, this.monsters);
    }

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

  /**
   * Уничтожает монстра.
   * @param chained true — монстра снял чужой взрыв (цепь не запускаем).
   */
  private killMonster(monster: Monster, chained: boolean): void {
    const award = chained
      ? this.scoreKeeper.awardChainKill()
      : this.scoreKeeper.awardWord(this.time.now, monster.firstTypedAt);

    this.showAward(monster, award, chained);
    this.applyKillEffect(monster, award);
    if (!chained) this.typing.clear();
    this.removeMonster(monster);

    if (monster.kind === 'bomb' && !chained) {
      this.detonate(monster);
    }
  }

  /** Начисленные очки + отдельная строка за комбо/лечение. */
  private showAward(monster: Monster, award: WordAward, chained: boolean): void {
    const parts = [`+${award.points}`];
    if (award.comboBonus > 0) parts.push(`комбо +${award.comboBonus}`);
    if (award.lifeBonus) parts.push('серия 5: +1 жизнь');

    this.feedback.floatingText(
      monster.x,
      monster.y,
      parts.join('  '),
      chained ? TEXT_COLORS.muted : TEXT_COLORS.success,
    );
    playKill();
    if (award.comboBonus > 0) playCombo();
  }

  /** Эффект от смерти конкретного типа. */
  private applyKillEffect(monster: Monster, award: WordAward): void {
    if (monster.kind === 'healer') {
      this.gainLife();
      playHeal();
    } else if (award.lifeBonus) {
      this.gainLife();
      playHeal();
    }
  }

  /** Взрыв бомбы: снимает всех живых целей в радиусе, кроме обманок. */
  private detonate(bomb: Monster): void {
    const caught = this.monsters.filter(
      (m) =>
        !m.isTrap &&
        m.kind !== 'bomb' &&
        Phaser.Math.Distance.Between(bomb.x, bomb.y, m.x, m.y) <= BOMB_RADIUS,
    );

    this.feedback.explosion(bomb.x, bomb.y, BOMB_RADIUS);
    playExplosion();

    for (const target of caught) {
      // Взрыв не пробивает щит — прикрываемый уходит под защиту.
      if (isShielded(target)) continue;
      this.killMonster(target, true);
    }
  }

  /** Возврат жизни: лечебный монстр или серия из 5 точных убийств. */
  private gainLife(): void {
    if (this.lives >= MAX_LIVES) {
      this.feedback.floatingText(
        this.scale.width / 2,
        BASE_Y - 60,
        'Жизней уже максимум',
        TEXT_COLORS.muted,
      );
      return;
    }
    this.lives += 1;
    this.feedback.healFlash();
    this.hud.update(this.takeSnapshot());
  }

  /** Слово набрано, но монстра прикрывает щит — набор сгорает, серия целая. */
  private blockedByShield(monster: Monster): void {
    this.typing.clear();
    this.feedback.shieldFlash();
    playShieldBlock();
    this.feedback.floatingText(monster.x, monster.y, '🛡️ Щит держит!', TEXT_COLORS.accent);
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
    // Погиб щит — сосед снова уязвим. Погиб прикрываемый — щит теряет цель.
    if (monster.protectedMonster) releaseShield(monster);
    else detachProtectedTarget(monster);

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
    this.scene.restart({ skipIntro: true });
  }

  /** Возврат в главное меню кнопкой «Домой» на HUD. */
  private goToMenu(): void {
    this.scene.start('MenuScene');
  }

  /**
   * Волны бесконечны: игра заканчивается только когда кончатся жизни.
   * Каждая следующая волна чуть плотнее предыдущей.
   */
  private checkWaveEnd(): void {
    if (this.gameOver) return;
    if (this.lives <= 0) return;
    if (!this.waveRunner.isFinished(this.monsters.length)) return;

    this.startWave(this.waveRunner.wave + 1);
  }

  // ── Конец игры ────────────────────────────────────────────────────

  private endGame(reason: EndReason): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.closePause();
    rememberBestScore(this.scoreKeeper.score);
    playDefeat();
    this.endScreen = new EndScreen(this, {
      reason,
      score: this.scoreKeeper.score,
      wave: this.waveRunner.wave,
      bestScore: getBestScore(),
      onRestart: () => this.resetAndRestart(),
      onHome: () => this.goToMenu(),
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
      maxLives: MAX_LIVES,
      combo: this.scoreKeeper.combo,
      score: this.scoreKeeper.score,
    };
  }
}
