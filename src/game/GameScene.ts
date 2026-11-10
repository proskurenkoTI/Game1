import Phaser from 'phaser';
import { randomWord } from './words';
import { playTone } from './sound';

// --- Параметры игры ---
const START_LIVES = 3;
const SCORE_WORD = 10;
const SCORE_SPEED = 5; // бонус за слово, набранное быстрее 2 секунд
const SPEED_BONUS_MS = 2000;
const SCORE_COMBO = 15; // разовый бонус за серию
const COMBO_STREAK = 3;

const MONSTER_SPAWN_Y = 100;
const BASE_Y = 520; // монстр дошёл до базы
const SPAWN_COOLDOWN_MS = 900;
const MONSTER_EMOJIS = ['👾', '🧟', '👻', '🦇', '👽', '💀', '🕷️', '🐍', '🐙'];

interface WaveConfig {
  totalMonsters: number;
  maxConcurrent: number;
  minWordLen: number;
  maxWordLen: number;
  trapChance: number;
  speed: number;
}

const WAVES: WaveConfig[] = [
  { totalMonsters: 5, maxConcurrent: 1, minWordLen: 3, maxWordLen: 4, trapChance: 0, speed: 40 },
  { totalMonsters: 6, maxConcurrent: 2, minWordLen: 4, maxWordLen: 5, trapChance: 0.15, speed: 50 },
  { totalMonsters: 7, maxConcurrent: 3, minWordLen: 5, maxWordLen: 6, trapChance: 0.2, speed: 60 },
  { totalMonsters: 8, maxConcurrent: 3, minWordLen: 6, maxWordLen: 8, trapChance: 0.2, speed: 75 },
  { totalMonsters: 9, maxConcurrent: 4, minWordLen: 6, maxWordLen: 8, trapChance: 0.3, speed: 85 },
];

function getWaveConfig(wave: number): WaveConfig {
  if (wave <= WAVES.length) return WAVES[wave - 1];
  // Бесконечный режим после волны 5: сложность продолжает расти.
  const extra = wave - WAVES.length;
  return {
    totalMonsters: 9 + extra * 2,
    maxConcurrent: Math.min(4 + extra, 6),
    minWordLen: 6,
    maxWordLen: Math.min(8 + extra, 10),
    trapChance: Math.min(0.3 + extra * 0.05, 0.5),
    speed: 85 + extra * 10,
  };
}

interface Monster {
  word: string;
  isTrap: boolean;
  x: number;
  y: number;
  speed: number;
  container: Phaser.GameObjects.Container;
  wordText: Phaser.GameObjects.Text;
  firstTypedAt: number | null;
}

let bestScore = 0; // лучший счёт за сессию

/**
 * «Печатай и стреляй»: монстры ползут к базе, над каждым — слово.
 * Печатаешь слово — монстр умирает. Обманки печатать нельзя.
 */
export class GameScene extends Phaser.Scene {
  private monsters: Monster[] = [];
  private typed = '';
  private score = 0;
  private lives = START_LIVES;
  private combo = 0;
  private wave = 1;
  private waveConfig = WAVES[0];
  private waveSpawned = 0;
  private waveResolved = 0;
  private spawnCooldown = 0;
  private gameOver = false;

  private endScreen: Phaser.GameObjects.Container | null = null;

  private waveText!: Phaser.GameObjects.Text;
  private remainingText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private inputText!: Phaser.GameObjects.Text;
  private cursorText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const { width } = this.scale;

    this.createHud();
    this.createBase();
    this.createInputLine();

    this.add
      .text(
        width / 2,
        88,
        'Печатай слово — монстр умрёт. Мигающие слова — обманки, не печатай!',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#64748b',
        },
      )
      .setOrigin(0.5, 0);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }
    this.input.keyboard.on('keydown', (event: KeyboardEvent) => this.onKeyDown(event));

    this.startWave(1);
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    this.updateSpawn(delta);
    this.updateMonsters(delta);
  }

  // --- HUD ---

  private createHud(): void {
    const { width } = this.scale;

    this.waveText = this.add
      .text(24, 20, 'Волна 1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#e2e8f0',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.remainingText = this.add
      .text(24, 56, 'Осталось: 5', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0, 0);

    this.livesText = this.add
      .text(width / 2, 20, '❤'.repeat(START_LIVES), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
      })
      .setOrigin(0.5, 0);

    this.scoreText = this.add
      .text(width - 24, 20, 'Счёт: 0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#e2e8f0',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);
  }

  private updateHud(): void {
    this.scoreText.setText(`Счёт: ${this.score}`);
    this.livesText.setText(
      '❤'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, START_LIVES - this.lives)),
    );
    this.remainingText.setText(
      `Осталось: ${Math.max(0, this.waveConfig.totalMonsters - this.waveResolved)}`,
    );
  }

  // --- База и строка ввода ---

  private createBase(): void {
    const { width } = this.scale;
    this.add.rectangle(width / 2, BASE_Y, width - 40, 2, 0x334155);
    this.add
      .text(width / 2, 545, '🏠 БАЗА', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
      })
      .setOrigin(0.5);
  }

  private createInputLine(): void {
    const { width } = this.scale;

    this.add.rectangle(width / 2, 590, width - 40, 44, 0x1e293b).setStrokeStyle(1, 0x334155);

    this.inputText = this.add
      .text(28, 590, '> ', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e2e8f0',
      })
      .setOrigin(0, 0.5);

    this.cursorText = this.add
      .text(28 + this.inputText.width, 590, '|', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#fbbf24',
      })
      .setOrigin(0, 0.5);

    this.tweens.add({
      targets: this.cursorText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private updateInputLine(): void {
    this.inputText.setText(`> ${this.typed}`);
    this.cursorText.setX(this.inputText.x + this.inputText.width + 2);
    this.updateMonsterWords();
  }

  // --- Волны ---

  private startWave(wave: number): void {
    this.wave = wave;
    this.waveConfig = getWaveConfig(wave);
    this.waveSpawned = 0;
    this.waveResolved = 0;
    this.spawnCooldown = 600;
    this.typed = '';

    this.waveText.setText(`Волна ${wave}`);
    this.updateHud();
    this.updateInputLine();

    this.showWaveBanner(`Волна ${wave}`);
    playTone(440, 0.12, 'sine');
    playTone(660, 0.15, 'sine', 0.15, 0.12);
  }

  private showWaveBanner(text: string): void {
    const { width, height } = this.scale;
    const banner = this.add
      .text(width / 2, height / 2 - 60, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#fbbf24',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: height / 2 - 100,
      duration: 1200,
      delay: 600,
      onComplete: () => banner.destroy(),
    });
  }

  // --- Спавн и движение ---

  private updateSpawn(delta: number): void {
    this.spawnCooldown -= delta;
    if (this.spawnCooldown > 0) return;
    if (this.waveSpawned >= this.waveConfig.totalMonsters) return;
    if (this.monsters.length >= this.waveConfig.maxConcurrent) return;

    this.spawnCooldown = SPAWN_COOLDOWN_MS;
    this.spawnMonster();
  }

  private spawnMonster(): void {
    const { width } = this.scale;
    const isTrap = Math.random() < this.waveConfig.trapChance;
    const activeWords = this.monsters.map((monster) => monster.word);
    const word = randomWord(this.waveConfig.minWordLen, this.waveConfig.maxWordLen, activeWords);
    const x = Phaser.Math.Between(80, width - 80);
    const speed = this.waveConfig.speed * Phaser.Math.FloatBetween(0.9, 1.1);

    const container = this.add.container(x, MONSTER_SPAWN_Y);
    const emoji = this.add
      .text(0, 0, MONSTER_EMOJIS[Math.floor(Math.random() * MONSTER_EMOJIS.length)], {
        fontSize: '40px',
      })
      .setOrigin(0.5);
    const wordText = this.add
      .text(0, -44, word, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add([emoji, wordText]);

    if (isTrap) {
      wordText.setFontStyle('bold italic');
      wordText.setColor('#fca5a5');
      emoji.setTint(0xffb3b3);
      this.tweens.add({
        targets: wordText,
        alpha: 0.3,
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
      playTone(200, 0.15, 'square', 0.1); // звук-предупреждение
    }

    this.monsters.push({
      word,
      isTrap,
      x,
      y: MONSTER_SPAWN_Y,
      speed,
      container,
      wordText,
      firstTypedAt: null,
    });

    this.waveSpawned += 1;
  }

  private updateMonsters(delta: number): void {
    const reached: Monster[] = [];
    for (const monster of this.monsters) {
      monster.y += (monster.speed * delta) / 1000;
      monster.container.y = monster.y;
      if (monster.y >= BASE_Y) reached.push(monster);
    }
    for (const monster of reached) {
      this.monsterReachedBase(monster);
    }
  }

  // --- Ввод ---

  private onKeyDown(event: KeyboardEvent): void {
    if (this.gameOver) return;

    const key = event.key;

    if (key === 'Backspace') {
      event.preventDefault();
      this.typed = this.typed.slice(0, -1);
      this.updateInputLine();
      return;
    }
    if (key === 'Enter' || key === 'Escape') {
      event.preventDefault();
      this.typed = '';
      this.updateInputLine();
      return;
    }
    if (key.length !== 1) return;

    const char = key.toLowerCase();
    if (!/^[a-zа-я0-9]$/.test(char)) return;
    event.preventDefault();

    const newTyped = this.typed + char;

    // Обманка: начали печатать её слово — взрыв.
    const trap = this.findMonsterByPrefix(newTyped, true);
    const normal = this.findMonsterByPrefix(newTyped, false);

    if (trap && !normal) {
      this.triggerTrap(trap);
      return;
    }

    if (normal) {
      this.typed = newTyped;
      if (normal.firstTypedAt === null) {
        normal.firstTypedAt = this.time.now;
      }
      this.updateInputLine();
      if (this.typed === normal.word) {
        this.killMonster(normal);
      }
      return;
    }

    // Ошибка: буква не подходит ни одному слову.
    this.wrongLetter();
  }

  private findMonsterByPrefix(prefix: string, isTrap: boolean): Monster | undefined {
    return this.monsters.find(
      (monster) => monster.isTrap === isTrap && monster.word.startsWith(prefix),
    );
  }

  private updateMonsterWords(): void {
    for (const monster of this.monsters) {
      if (this.typed && monster.word.startsWith(this.typed)) {
        monster.wordText.setText(monster.word.slice(this.typed.length));
        monster.wordText.setColor('#fbbf24');
      } else {
        monster.wordText.setText(monster.word);
        monster.wordText.setColor(monster.isTrap ? '#fca5a5' : '#ffffff');
      }
    }
  }

  // --- Результаты ---

  private killMonster(monster: Monster): void {
    const now = this.time.now;
    let points = SCORE_WORD;
    if (monster.firstTypedAt !== null && now - monster.firstTypedAt < SPEED_BONUS_MS) {
      points += SCORE_SPEED;
    }

    this.score += points;
    this.combo += 1;

    let comboBonus = 0;
    if (this.combo >= COMBO_STREAK) {
      comboBonus = SCORE_COMBO;
      this.score += comboBonus;
      this.combo = 0;
    }

    this.typed = '';
    this.updateHud();
    this.updateInputLine();
    this.showFloatingText(
      monster.x,
      monster.y,
      `+${points}${comboBonus > 0 ? `  комбо +${comboBonus}` : ''}`,
      '#4ade80',
    );
    playTone(660, 0.12, 'sine');
    if (comboBonus > 0) playTone(880, 0.15, 'sine', 0.15, 0.1);

    this.removeMonster(monster);
  }

  private triggerTrap(monster: Monster): void {
    this.typed = '';
    this.combo = 0;
    this.updateInputLine();

    this.cameras.main.flash(180, 255, 60, 60);
    playTone(150, 0.3, 'sawtooth');

    this.lives -= 1;
    this.updateHud();
    this.showFloatingText(monster.x, monster.y, 'Обманка! −1 жизнь', '#f87171');

    this.removeMonster(monster);

    if (this.lives <= 0) {
      this.endGame('lose');
    }
  }

  private wrongLetter(): void {
    this.typed = '';
    this.combo = 0;
    this.updateInputLine();
    this.cameras.main.flash(80, 255, 200, 200);
    playTone(220, 0.1, 'square', 0.1);
  }

  private monsterReachedBase(monster: Monster): void {
    if (this.typed && monster.word.startsWith(this.typed)) {
      this.typed = '';
      this.updateInputLine();
    }

    // Обманку печатать нельзя, поэтому и урона от неё нет.
    if (monster.isTrap) {
      this.showFloatingText(monster.x, BASE_Y - 20, 'Обманка прошла', '#94a3b8');
      this.removeMonster(monster);
      return;
    }

    this.lives -= 1;
    this.combo = 0;
    this.updateHud();

    this.cameras.main.flash(180, 255, 60, 60);
    playTone(150, 0.3, 'sawtooth');
    this.showFloatingText(monster.x, BASE_Y - 20, '−1 жизнь', '#f87171');

    this.removeMonster(monster);

    if (this.lives <= 0) {
      this.endGame('lose');
    }
  }

  private removeMonster(monster: Monster): void {
    this.monsters = this.monsters.filter((item) => item !== monster);
    this.waveResolved += 1;
    monster.container.destroy();
    this.updateHud();
    this.checkWaveEnd();
  }

  private checkWaveEnd(): void {
    if (this.gameOver) return;
    if (this.lives <= 0) return;
    if (this.waveSpawned < this.waveConfig.totalMonsters) return;
    if (this.monsters.length > 0) return;

    if (this.wave >= 5) {
      this.endGame('win');
    } else {
      this.startWave(this.wave + 1);
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.tweens.add({
      targets: label,
      y: y - 50,
      alpha: 0,
      duration: 700,
      onComplete: () => label.destroy(),
    });
  }

  // --- Конец игры ---

  private endGame(reason: 'win' | 'lose'): void {
    if (this.gameOver) return;
    this.gameOver = true;

    bestScore = Math.max(bestScore, this.score);

    if (reason === 'win') {
      playTone(523, 0.15, 'sine');
      playTone(659, 0.15, 'sine', 0.15, 0.15);
      playTone(784, 0.22, 'sine', 0.15, 0.3);
    } else {
      playTone(200, 0.3, 'sawtooth');
    }

    this.showEndScreen(reason);
  }

  private showEndScreen(reason: 'win' | 'lose'): void {
    const { width, height } = this.scale;

    const title = reason === 'win' ? 'Победа!' : 'Игра окончена';
    const subtitle = reason === 'win' ? 'Все волны пройдены!' : 'Монстры добрались до базы.';

    // Весь экран конца игры держим в одном контейнере, чтобы одним вызовом
    // удалить его при рестарте.
    const endScreen = this.add.container(0, 0).setDepth(50);

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.88)
      .setInteractive();

    const titleText = this.add
      .text(width / 2, height / 2 - 100, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#fbbf24',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const subtitleText = this.add
      .text(width / 2, height / 2 - 40, subtitle, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const scoreText = this.add
      .text(width / 2, height / 2 + 10, `Счёт: ${this.score}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const bestText = this.add
      .text(width / 2, height / 2 + 52, `Лучший: ${bestScore}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    const button = this.add.container(width / 2, height / 2 + 130);
    const buttonBg = this.add
      .rectangle(0, 0, 200, 56, 0x3b82f6)
      .setInteractive({
        useHandCursor: true,
      });
    const buttonLabel = this.add
      .text(0, 0, 'Ещё', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    button.add([buttonBg, buttonLabel]);

    // Порядок имеет значение: overlay рисуется первым (под остальным),
    // а кнопка — последней (поверх него), поэтому получит клик.
    endScreen.add([overlay, titleText, subtitleText, scoreText, bestText, button]);
    this.endScreen = endScreen;

    buttonBg.on('pointerdown', () => this.resetAndRestart());
    buttonBg.on('pointerover', () =>
      this.tweens.add({ targets: button, scale: 1.06, duration: 100 }),
    );
    buttonBg.on('pointerout', () => this.tweens.add({ targets: button, scale: 1, duration: 100 }));
  }

  private resetAndRestart(): void {
    // Уничтожить экран конца игры (оверлей, кнопки и т.д.)
    this.endScreen?.destroy();
    this.endScreen = null;

    // Уничтожить оставшихся монстров, чтобы не двигались
    for (const monster of this.monsters) {
      monster.container.destroy();
    }
    this.monsters = [];

    // Сбросить счёт и состояние
    this.gameOver = false;
    this.score = 0;
    this.lives = START_LIVES;
    this.combo = 0;
    this.startWave(1);
  }
}
