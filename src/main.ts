import './style.css';
import { createGame } from './game/config';
import { attachMobileInput } from './game/mobileInput';

const game = createGame('game');

/* ── Мобильная клавиатура ──────────────────────────────────────────── */

// Ждём, пока Phaser создаст canvas первой сцены (MenuScene).
requestAnimationFrame(() => {
  const firstScene = game.scene.scenes[0];
  // Phaser 4: canvas доступен через game.canvas, не через scene.canvas.
  if (firstScene && game.canvas) {
    attachMobileInput(game.canvas, firstScene);
  }
});

/* ── Масштаб при открытии/закрытии клавиатуры ──────────────────────── */

/**
 * Клавиатура телефона не меняет layout viewport, поэтому canvas остался бы
 * под клавиатурой. Пишем в CSS-переменную реальную высоту видимой области —
 * style.css подгоняет #game под неё, а Phaser пересчитывает FIT-масштаб.
 * Всё поле вместе со строкой ввода всегда остаётся над клавиатурой.
 */
function syncViewportHeight(): void {
  const visible = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty(
    '--game-height',
    `${Math.round(visible)}px`,
  );
}

syncViewportHeight();

// Дебаунс: анимация клавиатуры идёт ~150 мс, за это время высота нестабильна.
let resizeTimer: number;
window.visualViewport?.addEventListener('resize', () => {
  syncViewportHeight();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => game.scale.refresh(), 150);
});

// Поворот устройства — тоже меняет доступную область.
window.addEventListener('orientationchange', () => {
  syncViewportHeight();
  setTimeout(() => game.scale.refresh(), 200);
});
