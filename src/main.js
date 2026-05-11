/**
 * Application entry point.
 *
 * Responsibilities:
 *  - Wait for the DOM to be ready.
 *  - Bootstrap the `Game` singleton.
 *  - Hide the HTML loading overlay once the game has booted.
 *  - Handle uncaught errors so they surface in the UI during development.
 */
import { Game } from './Game.js';

async function bootstrap() {
  const container = document.getElementById('game');
  const loading = document.getElementById('loading');

  if (!container) {
    throw new Error('Missing #game container in index.html');
  }

  const game = new Game();
  await game.init(container);

  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 600);
  }

  // Expose the game on window for easier debugging in dev tools.
  if (import.meta.env?.DEV) {
    window.__GAME__ = game;
  }
}

window.addEventListener('error', (event) => {
  console.error('[Software Empire] Uncaught error:', event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Software Empire] Unhandled rejection:', event.reason);
});

bootstrap().catch((err) => {
  console.error('[Software Empire] Failed to start:', err);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.textContent = 'Failed to start. See console for details.';
  }
});
