/**
 * Game - top-level orchestrator.
 *
 * Owns the PixiJS Application, the global managers (assets, input, scene),
 * and drives the main game loop via Pixi's Ticker.
 *
 * Scenes do their own per-frame logic in `update(dt)`; this class only wires
 * everything together.
 */
import { Application, Container } from 'pixi.js';

import { GameConfig } from './config.js';
import { AssetManager } from './managers/AssetManager.js';
import { InputManager } from './managers/InputManager.js';
import { SceneManager } from './systems/SceneManager.js';
import { Simulation } from './systems/Simulation.js';
import { EventBus } from './utils/EventBus.js';

import { MainMenuScene } from './scenes/MainMenuScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';

export class Game {
  constructor() {
    /** @type {Application} */
    this.app = new Application();

    /** @type {Container} */
    this.root = new Container();
    this.root.label = 'root';

    /** Global event bus for loose coupling between systems. */
    this.events = new EventBus();

    /** Managers - lazily wired in `init`. */
    this.assets = new AssetManager();
    this.input = new InputManager();
    this.scenes = new SceneManager(this);

    /** Gameplay simulation - owns Company state and all systems. */
    this.sim = new Simulation(this.events);

    this._onResize = this._onResize.bind(this);
    this._onTick = this._onTick.bind(this);

    this._initialized = false;
  }

  /**
   * Initialise the Pixi Application and start the game loop.
   * @param {HTMLElement} container DOM element to mount the canvas into.
   */
  async init(container) {
    if (this._initialized) return;

    await this.app.init({
      backgroundColor: GameConfig.renderer.backgroundColor,
      antialias: GameConfig.renderer.antialias,
      autoDensity: GameConfig.renderer.autoDensity,
      resolution: GameConfig.renderer.resolution,
      powerPreference: GameConfig.renderer.powerPreference,
      resizeTo: window,
    });

    container.appendChild(this.app.canvas);

    this.app.stage.addChild(this.root);

    this.input.attach(this.app.canvas);

    this._registerScenes();

    window.addEventListener('resize', this._onResize);
    this._onResize();

    this.app.ticker.maxFPS = GameConfig.loop.targetFPS;
    this.app.ticker.add(this._onTick);

    // Initialise simulation (creates Company from starter seed).
    this.sim.reset();

    await this.scenes.changeTo(GameConfig.scenes.MAIN_MENU);

    this._initialized = true;
    this.events.emit('game:ready');

    if (GameConfig.debug.enabled) {
      console.info(
        `[${GameConfig.meta.name}] v${GameConfig.meta.version} ready ` +
          `(renderer: ${this.app.renderer.type === 1 ? 'WebGL' : 'WebGPU'})`,
      );
    }
  }

  /** Tear everything down. */
  destroy() {
    if (!this._initialized) return;

    window.removeEventListener('resize', this._onResize);
    this.app.ticker.remove(this._onTick);

    this.scenes.destroy();
    this.input.detach();

    this.app.destroy(true, { children: true, texture: true });
    this._initialized = false;
  }

  /** Expose current viewport size for scenes that need it. */
  get screen() {
    return this.app.screen;
  }

  // ------------------------------------------------------------------
  // Internal
  // ------------------------------------------------------------------

  _registerScenes() {
    this.scenes.register(GameConfig.scenes.MAIN_MENU, MainMenuScene);
    this.scenes.register(GameConfig.scenes.OFFICE, OfficeScene);
  }

  _onResize() {
    const { width, height } = this.app.screen;
    this.scenes.resize(width, height);
    this.events.emit('resize', { width, height });
  }

  _onTick(ticker) {
    // Pixi v8 passes the Ticker itself; deltaMS is real elapsed time in ms.
    const dtSeconds = (ticker.deltaMS / 1000) * GameConfig.loop.timeScale;
    this.sim.update(dtSeconds);
    this.scenes.update(dtSeconds);
    this.input.postUpdate();
  }
}
