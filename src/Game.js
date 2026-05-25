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
import { SoundManager } from './managers/SoundManager.js';
import { SceneManager } from './systems/SceneManager.js';
import { Simulation } from './systems/Simulation.js';
import { EventBus } from './utils/EventBus.js';

import { MainMenuScene } from './scenes/MainMenuScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';
import { saveSlot, loadSlot } from './systems/SaveManager.js';

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
    this.sound = new SoundManager();
    this.scenes = new SceneManager(this);

    /** Gameplay simulation - owns Company state and all systems. */
    this.sim = new Simulation(this.events);

    /** 0-based index of the slot receiving autosaves. New Game always uses 0. */
    this.activeSaveSlot = 0;

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
    this.input.onFirstInteraction(() => this.sound.unlock());

    await this.sound.init();
    this.sound.bindEvents(this.events);

    this._registerScenes();

    window.addEventListener('resize', this._onResize);
    this._onResize();

    this.app.ticker.maxFPS = GameConfig.loop.targetFPS;
    this.app.ticker.add(this._onTick);

    // Autosave at the start of every new day to the active slot.
    this.events.on('day:began', () => {
      this.saveGame({ silent: false, label: 'Autosaved' });
    });

    // Initialise simulation (creates Company from starter seed — not saved yet;
    // the player must press New Game to write the first checkpoint).
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
    this.sound.destroy();

    this.app.destroy(true, { children: true, texture: true });
    this._initialized = false;
  }

  /** Expose current viewport size for scenes that need it. */
  get screen() {
    return this.app.screen;
  }

  // ------------------------------------------------------------------
  // Save / load helpers (called from MainMenuScene)
  // ------------------------------------------------------------------

  /**
   * Write a checkpoint to a slot and notify the player.
   * @param {{ slot?: number, silent?: boolean, label?: string, name?: string }} [opts]
   *   slot:   0-based slot index (defaults to activeSaveSlot)
   *   silent: suppress the notification (default false)
   *   label:  prefix text in the notification (default 'Game saved')
   *   name:   player-supplied save name shown in the Load UI
   */
  saveGame({ slot = this.activeSaveSlot, silent = false, label = 'Game saved', name = undefined } = {}) {
    if (!this.sim.company) return;
    this.activeSaveSlot = slot;
    saveSlot(slot, this.sim, name);
    if (!silent) {
      const day = this.sim.company.day;
      this.events.emit('notification:add', {
        text: `${label} — Slot ${slot + 1}, Day ${day}`,
        type: 'success',
      });
    }
  }

  /**
   * Start a fresh campaign, always bound to slot 0.
   * Writes the initial day-1 checkpoint before entering the office.
   */
  async startNewGame() {
    this.activeSaveSlot = 0;
    this.sim.reset();
    this.saveGame({ silent: true });
    await this.scenes.changeTo(GameConfig.scenes.OFFICE);
  }

  /**
   * Load a saved checkpoint from a specific slot and enter the office paused.
   * Returns false (and emits a warning) if the slot is invalid or corrupt.
   * @param {number} index  0-based slot index.
   * @returns {Promise<boolean>}
   */
  async loadFromSlot(index) {
    const payload = loadSlot(index);
    if (!payload) {
      this.events.emit('notification:add', {
        text: 'Save data is missing or corrupt.',
        type: 'warning',
      });
      return false;
    }
    this.activeSaveSlot = index;
    this.sim.loadFromSave(payload);
    await this.scenes.changeTo(GameConfig.scenes.OFFICE);
    return true;
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
