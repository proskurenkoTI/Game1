/**
 * Прогресс волны: сколько монстров породили, сколько разобрали,
 * когда можно спавнить следующего и закончена ли волна.
 */
import { FIRST_SPAWN_DELAY_MS, SPAWN_COOLDOWN_MS, getWaveConfig, type WaveConfig } from './gameConfig';

export class WaveRunner {
  wave = 1;
  config: WaveConfig = getWaveConfig(1);
  spawned = 0;
  resolved = 0;

  private cooldown = 0;

  start(wave: number): void {
    this.wave = wave;
    this.config = getWaveConfig(wave);
    this.spawned = 0;
    this.resolved = 0;
    this.cooldown = FIRST_SPAWN_DELAY_MS;
  }

  /**
   * Отсчитывает паузу между спавнами.
   * true — можно породить ещё одного монстра.
   */
  tick(delta: number, aliveCount: number): boolean {
    this.cooldown -= delta;
    if (this.cooldown > 0) return false;
    if (this.spawned >= this.config.totalMonsters) return false;
    if (aliveCount >= this.config.maxConcurrent) return false;

    this.cooldown = SPAWN_COOLDOWN_MS;
    return true;
  }

  onSpawned(): void {
    this.spawned += 1;
  }

  onResolved(): void {
    this.resolved += 1;
  }

  /** Сколько монстров волны осталось разобрать (для HUD). */
  remaining(): number {
    return Math.max(0, this.config.totalMonsters - this.resolved);
  }

  /** Волна закончена, когда все породились и все разобрались. */
  isFinished(aliveCount: number): boolean {
    return this.spawned >= this.config.totalMonsters && aliveCount === 0;
  }
}
