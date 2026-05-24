/**
 * SoundManager
 *
 * Preloads and plays short SFX clips via the browser HTMLAudioElement API.
 * Keeps Pixi out of the audio path — MP3s served from public/ don't need
 * to go through the Pixi Assets system.
 *
 * Browser autoplay policy: audio is blocked until the first user gesture.
 * `unlock()` should be called on the first pointerdown so subsequent plays
 * succeed immediately.
 *
 * Usage:
 *   await soundManager.init()
 *   soundManager.bindEvents(eventBus)
 *   soundManager.play('ui_modal_open')
 *   soundManager.destroy()
 */
import { GameConfig } from '../config.js';
import { SOUNDS } from '../assets/sounds.js';

export class SoundManager {
  constructor() {
    /** @type {Map<string, HTMLAudioElement>} */
    this._clips = new Map();
    this._unlocked = false;

    /** Unsubscribe functions from EventBus bindings. */
    this._offs = [];
  }

  /** Preload all clips declared in SOUNDS. Safe to call multiple times. */
  async init() {
    for (const [id, src] of Object.entries(SOUNDS)) {
      if (this._clips.has(id)) continue;
      const el = new Audio(src);
      el.preload = 'auto';
      this._clips.set(id, el);
    }
  }

  /**
   * Play a clip by its logical ID. Silently swallowed if:
   *   - audio is disabled in config
   *   - the clip does not exist
   *   - the browser blocks autoplay (NotAllowedError) before unlock
   * @param {string} id
   */
  play(id) {
    if (!GameConfig.audio.enabled) return;
    const clip = this._clips.get(id);
    if (!clip) return;

    const volume = GameConfig.audio.masterVolume * GameConfig.audio.sfxVolume;

    // Clone the element so overlapping plays work (e.g. rapid button clicks).
    const instance = clip.cloneNode();
    instance.volume = Math.max(0, Math.min(1, volume));
    instance.play().catch(() => {
      // Autoplay blocked — silently ignored until the user interacts.
    });
  }

  /**
   * Call on the first user pointer interaction to satisfy browser autoplay
   * policy. Plays a silent buffer to unblock subsequent plays.
   */
  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;

    // Play every clip at volume 0 so the browser marks them as user-initiated.
    for (const clip of this._clips.values()) {
      const instance = clip.cloneNode();
      instance.volume = 0;
      instance.play().catch(() => {});
    }
  }

  /**
   * Subscribe to EventBus events that should trigger sounds.
   * Call once after init(). All subscriptions are cleaned up by destroy().
   * @param {import('../utils/EventBus.js').EventBus} bus
   */
  bindEvents(bus) {
    // project:completed fires for both "ready to collect" and "collected".
    // Only play the claim sound for the collected case (isCompleted === true).
    this._offs.push(
      bus.on('project:completed', ({ project }) => {
        if (project.isCompleted) this.play('ui_project_claim');
      }),
    );

    // Day summary modal.
    this._offs.push(
      bus.on('day:report', () => {
        this.play('ui_modal_open');
      }),
    );
  }

  /** Unsubscribe all EventBus handlers. */
  destroy() {
    for (const off of this._offs) off();
    this._offs.length = 0;
  }
}
