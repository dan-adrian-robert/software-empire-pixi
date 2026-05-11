/**
 * SceneManager
 *
 * Owns the registry of scene classes and the currently active scene
 * instance. Handles transitions (preload -> swap -> enter) so that scenes
 * never have to know about each other.
 *
 * Only ONE scene is active at a time. For overlay UIs (pause menu, modals)
 * use a UI layer added to the active scene rather than stacking scenes.
 */
export class SceneManager {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    this.game = game;
    /** @type {Map<string, new (game: import('../Game.js').Game) => import('../scenes/BaseScene.js').BaseScene>} */
    this._registry = new Map();
    /** @type {import('../scenes/BaseScene.js').BaseScene | null} */
    this.current = null;
    /** @type {string | null} */
    this.currentName = null;
    this._transitioning = false;
  }

  /**
   * Register a scene class under a string id.
   * @param {string} name
   * @param {new (game: import('../Game.js').Game) => import('../scenes/BaseScene.js').BaseScene} SceneClass
   */
  register(name, SceneClass) {
    this._registry.set(name, SceneClass);
  }

  /**
   * Switch to a new scene. Safe against concurrent calls.
   * @param {string} name
   */
  async changeTo(name) {
    if (this._transitioning) {
      console.warn(`[SceneManager] changeTo("${name}") ignored - transition in progress.`);
      return;
    }
    const SceneClass = this._registry.get(name);
    if (!SceneClass) {
      throw new Error(`[SceneManager] Unknown scene: "${name}"`);
    }

    this._transitioning = true;
    try {
      if (this.current) {
        await this.current._shutdown();
        this.current = null;
        this.currentName = null;
      }

      const next = new SceneClass(this.game);
      await next.preload();

      this.game.root.addChild(next.root);
      this.current = next;
      this.currentName = name;

      await next.enter();

      const { width, height } = this.game.screen;
      next.resize(width, height);

      this.game.events.emit('scene:changed', { name });
    } finally {
      this._transitioning = false;
    }
  }

  update(dt) {
    if (this.current) this.current.update(dt);
  }

  resize(width, height) {
    if (this.current) this.current.resize(width, height);
  }

  async destroy() {
    if (this.current) {
      await this.current._shutdown();
      this.current = null;
      this.currentName = null;
    }
    this._registry.clear();
  }
}
