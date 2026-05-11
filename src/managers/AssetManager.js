/**
 * AssetManager
 *
 * Thin wrapper around Pixi v8's `Assets` API. Centralising asset loading
 * here makes it easy to:
 *   - declare asset bundles in one place (see `src/assets/manifest.js`)
 *   - load bundles per-scene with progress reporting
 *   - swap in a different loader later without touching scenes
 *
 * Pixi v8's `Assets` module supports bundles, manifests and parallel loading
 * out of the box, so we lean on it instead of reinventing the wheel.
 */
import { Assets } from 'pixi.js';

import { assetManifest } from '../assets/manifest.js';

export class AssetManager {
  constructor() {
    this._initialized = false;
    /** @type {Set<string>} */
    this._loadedBundles = new Set();
  }

  /** Initialise the underlying Pixi Assets system with our manifest. */
  async init() {
    if (this._initialized) return;
    await Assets.init({ manifest: assetManifest });
    this._initialized = true;
  }

  /**
   * Load a single asset by alias or URL.
   * @param {string} aliasOrUrl
   * @returns {Promise<unknown>}
   */
  async load(aliasOrUrl) {
    if (!this._initialized) await this.init();
    return Assets.load(aliasOrUrl);
  }

  /**
   * Load a declared bundle. Subsequent calls are no-ops.
   * @param {string} bundleName
   * @param {(progress: number) => void} [onProgress] 0..1
   */
  async loadBundle(bundleName, onProgress) {
    if (!this._initialized) await this.init();
    if (this._loadedBundles.has(bundleName)) return;
    await Assets.loadBundle(bundleName, onProgress);
    this._loadedBundles.add(bundleName);
  }

  /** Get a previously loaded asset by alias. */
  get(alias) {
    return Assets.get(alias);
  }

  /** Free a bundle's GPU/CPU memory. */
  async unloadBundle(bundleName) {
    if (!this._loadedBundles.has(bundleName)) return;
    await Assets.unloadBundle(bundleName);
    this._loadedBundles.delete(bundleName);
  }
}
