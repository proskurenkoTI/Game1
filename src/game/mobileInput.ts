/**
 * Мобильная клавиатура: скрытый input → проксирует нажатия в Phaser.
 *
 * На телефоне браузер не генерирует keydown с корректными key/code, пока
 * фокус не стоит на текстовом поле. Через hidden-input ловим beforeinput
 * / keydown / compositionend и эмитим события в Phaser-клавиатуру.
 *
 * На десктопе модуль полностью неактивен — игра работает как раньше.
 * Ни одна строка игрового кода не меняется — все обработчики GameScene /
 * AlphabetScene уже подписаны на this.input.keyboard.on('keydown').
 */

import Phaser from 'phaser';

/* ── Глобальная проверка: тач-устройство? ─────────────────────────── */

const isTouchDevice =
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

/* ── Вспомогательные ─────────────────────────────────────────────── */

/** Формирует KeyboardEvent, который принимает preventDefault() без ошибки. */
function makeKeyboardEvent(key: string, code = ''): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    code: code || `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
  });

  // preventDefault() на синтетическом событии — безопасный no-op,
  // но на некоторых движках бросает, поэтому оборачиваем.
  Object.defineProperty(event, 'preventDefault', {
    value: () => {},
    configurable: true,
  });

  return event;
}

/**
 * Эмитит событие в Phaser-клавиатуру.
 * KeyboardPlugin общий для всех сцен, поэтому достаточно одной привязки.
 */
function emitToPhaser(scene: Phaser.Scene, event: KeyboardEvent): void {
  if (!scene.input.keyboard) return;
  scene.input.keyboard.emit('keydown', event);
}

/* ── Основной API ────────────────────────────────────────────────── */

/**
 * Привязывает скрытый ввод к сцене (только на тач-устройствах).
 * @param canvas Phaser-канвас (для pointerdown-обработчика).
 * @param scene  Первая сцена (для привязки к keyboard-эмиттеру).
 * @returns функция очистки — вызывается при остановке сцены.
 */
export function attachMobileInput(
  canvas: HTMLCanvasElement,
  scene: Phaser.Scene,
): () => void {
  // На десктопе — ничего не делаем, игра работает как раньше.
  if (!isTouchDevice) {
    return () => {};
  }

  const input =
    document.getElementById('keyboard-capture') as HTMLInputElement;
  if (!input) return () => {};

  // ── beforeinput: основной источник символов, Backspace, Enter ────
  const onBeforeInput = (e: InputEvent) => {
    e.preventDefault();

    const ie = e as InputEvent & { inputType?: string };

    let key = '';
    let code = '';

    switch (ie.inputType) {
      case 'deleteContentBackward':
        key = 'Backspace';
        code = 'Backspace';
        break;
      case 'insertLineBreak':
      case 'insertParagraph':
        key = 'Enter';
        code = 'Enter';
        break;
      default:
        if (ie.data) {
          key = ie.data;
          code = `Key${ie.data.toUpperCase()}`;
        }
    }

    if (!key) return;
    emitToPhaser(scene, makeKeyboardEvent(key, code));
  };

  // ── keydown: специальные клавиши (Escape и т.п.)
  //    beforeinput их не генерирует.
  const onKeyDown = (e: KeyboardEvent) => {
    // Символы обрабатываются через beforeinput — блокируем всплытие,
    // чтобы нативный keydown не дошёл до Phaser-клавиатуры (дубликат).
    if (e.key.length === 1) {
      e.stopPropagation();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Enter') {
      e.stopPropagation();
      return;
    }

    // Escape и прочее — эмитим вручную.
    e.preventDefault();
    e.stopPropagation();
    emitToPhaser(scene, makeKeyboardEvent(e.key, e.code));
  };

  // ── compositionend: IME-редакторы (на всякий случай) ──────────────
  const onCompositionEnd = (e: CompositionEvent) => {
    const text = e.data;
    if (!text) return;
    for (const ch of text) {
      const code = `Key${ch.toUpperCase()}`;
      emitToPhaser(scene, makeKeyboardEvent(ch, code));
    }
  };

  // ── Подписываемся ───────────────────────────────────────────────
  input.addEventListener('beforeinput', onBeforeInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('compositionend', onCompositionEnd);

  // Фокус на canvas — открывает клавиатуру при нажатии
  const onFocusCanvas = () => {
    input.focus();
  };
  canvas.addEventListener('pointerdown', onFocusCanvas);

  // Открываем клавиатуру сразу при старте сцены
  input.focus();

  // ── Очистка ─────────────────────────────────────────────────────
  return () => {
    input.removeEventListener('beforeinput', onBeforeInput);
    input.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('compositionend', onCompositionEnd);
    canvas.removeEventListener('pointerdown', onFocusCanvas);
    input.blur();
  };
}
