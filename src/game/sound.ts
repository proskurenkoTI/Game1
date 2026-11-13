/**
 * Короткие синтезированные звуки через Web Audio API.
 * Заглушка вместо аудиофайлов: никаких ресурсов, только «тыки».
 */

let audioContext: AudioContext | null = null;

/** Общий выключатель всех игровых звуков. По умолчанию звук включён. */
let soundEnabled = true;

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

/**
 * Проигрывает один тон, если звук не выключен в настройках.
 * @param frequency частота в Гц
 * @param duration длительность в секундах
 * @param type форма волны
 * @param volume громкость 0..1
 * @param delay задержка перед началом в секундах
 */
export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  delay = 0,
): void {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

// --- Игровые сигналы: готовые последовательности тонов ---

export function playWaveStart(): void {
  playTone(440, 0.12, 'sine');
  playTone(660, 0.15, 'sine', 0.15, 0.12);
}

/** Звук-предупреждение: появился монстр-обманка. */
export function playTrapWarning(): void {
  playTone(200, 0.15, 'square', 0.1);
}

export function playKill(): void {
  playTone(660, 0.12, 'sine');
}

export function playCombo(): void {
  playTone(880, 0.15, 'sine', 0.15, 0.1);
}

/** Потеря жизни: обманка или монстр дошёл до базы. */
export function playDamage(): void {
  playTone(150, 0.3, 'sawtooth');
}

/** Опечатка. */
export function playTypo(): void {
  playTone(220, 0.1, 'square', 0.1);
}

export function playPause(): void {
  playTone(392, 0.1, 'sine', 0.12);
}

export function playResume(): void {
  playTone(523, 0.1, 'sine', 0.12);
}

export function playVictory(): void {
  playTone(523, 0.15, 'sine');
  playTone(659, 0.15, 'sine', 0.15, 0.15);
  playTone(784, 0.22, 'sine', 0.15, 0.3);
}

export function playDefeat(): void {
  playTone(200, 0.3, 'sawtooth');
}