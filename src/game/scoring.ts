/**
 * Очки, комбо и лучший результат сессии.
 * Чистая игровая математика без Phaser-объектов.
 */
import {
  COMBO_STREAK,
  SCORE_COMBO,
  SCORE_SPEED,
  SCORE_WORD,
  SPEED_BONUS_MS,
} from './gameConfig';

export interface WordAward {
  /** Очки за сам монстра (с быстрым бонусом). */
  points: number;
  /** Разовый бонус за серию, 0 если серии не было. */
  comboBonus: number;
}

export class ScoreKeeper {
  score = 0;
  combo = 0;

  /** Начисляет очки за убитого монстра и продвигает серию. */
  awardWord(now: number, firstTypedAt: number | null): WordAward {
    let points = SCORE_WORD;
    if (firstTypedAt !== null && now - firstTypedAt < SPEED_BONUS_MS) {
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

    return { points, comboBonus };
  }

  /** Серия прерывается любой ошибкой. */
  breakCombo(): void {
    this.combo = 0;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
  }
}

let bestScore = 0; // лучший счёт за сессию

export function rememberBestScore(score: number): void {
  bestScore = Math.max(bestScore, score);
}

export function getBestScore(): number {
  return bestScore;
}
