/**
 * BaseScene
 *
 * Abstract base class all scenes extend. A scene is a self-contained chunk of
 * gameplay (Main Menu, Office, World Map, ...) with its own root container,
 * lifecycle and per-frame update.
 *
 * Lifecycle:
 *   constructor(game)   - cheap. Avoid heavy work here.
 *   async preload()     - load any required assets/bundles. Show loading UI.
 *   async enter()       - build the scene graph. Subscribe to events.
 *   update(dt)          - called every frame while the scene is active.
 *   resize(w, h)        - called on window resize and on enter.
 *   async exit()        - tear down listeners, free resources.
 *
 * Subclasses should add their display objects to `this.root`.
 */
import { Container } from 'pixi.js';

export class BaseScene {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    /** @type {import('../Game.js').Game} */
    this.game = game;
    /** @type {Container} */
    this.root = new Container();
    this.root.label = this.constructor.name;

    /** Stored unsubscribe handlers - drained on exit. */
    this._subscriptions = [];
  }

  /** Override to load assets before `enter()` runs. */
  async preload() {}

  /** Override to build the scene graph. */
  async enter() {}

  /** Override to run per-frame logic. `dt` is in seconds. */
  // eslint-disable-next-line no-unused-vars
  update(dt) {}

  /** Override to react to window/canvas resizes. */
  // eslint-disable-next-line no-unused-vars
  resize(width, height) {}

  /** Override to clean up listeners / external resources. */
  async exit() {}

  // ------------------------------------------------------------------
  // Helpers for subclasses
  // ------------------------------------------------------------------

  /**
   * Subscribe to the game event bus and auto-unsubscribe on exit.
   * @param {string} event
   * @param {(payload?: unknown) => void} handler
   */
  listen(event, handler) {
    const off = this.game.events.on(event, handler);
    this._subscriptions.push(off);
    return off;
  }

  /** Internal: invoked by SceneManager. Do not override. */
  async _shutdown() {
    for (const off of this._subscriptions) off();
    this._subscriptions.length = 0;
    await this.exit();
    this.root.removeFromParent();
    this.root.destroy({ children: true });
  }
}
