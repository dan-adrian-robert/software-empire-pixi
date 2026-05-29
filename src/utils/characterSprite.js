/**
 * characterSprite
 *
 * Shared texture helpers for characterN.png portraits in
 * public/assets/images/characters/.
 * The office bundle must be loaded (via AssetManager.loadBundle('office'))
 * before any of these are called.
 *
 * Two variants per portrait:
 *  - getCharacterTopHalf()   : top 75 % (head + shoulders + badge + torso).
 *                              Used in the world EmployeeEntity.
 *  - getCharacterAvatarTex() : square crop of the upper-centre face region.
 *                              Used in panel card headers and assignment chips.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';

/** Shipped portrait count (character1.png … characterN.png). */
export const CHARACTER_COUNT = 4;

/** @param {number} index  1-based portrait index. */
export function characterAssetAlias(index) {
  return `character-${clampCharacterIndex(index)}`;
}

/**
 * @param {() => number} [rng]
 * @returns {number} 1-based index in [1, CHARACTER_COUNT].
 */
export function pickRandomCharacterIndex(rng = Math.random) {
  return 1 + Math.floor(rng() * CHARACTER_COUNT);
}

function clampCharacterIndex(index) {
  const n = Math.floor(Number(index)) || 1;
  return Math.max(1, Math.min(CHARACTER_COUNT, n));
}

const _topHalfCache = new Map();
const _avatarCache = new Map();

export function getCharacterTopHalf(characterIndex = 1) {
  const idx = clampCharacterIndex(characterIndex);
  if (_topHalfCache.has(idx)) return _topHalfCache.get(idx);
  const base = Assets.get(characterAssetAlias(idx));
  const tex = new Texture({
    source: base.source,
    frame: new Rectangle(0, 0, base.width, Math.floor(base.height * 0.75)),
  });
  _topHalfCache.set(idx, tex);
  return tex;
}

/**
 * A square crop centred horizontally and covering the top 55 % of the image
 * (encompasses head, hair and upper shoulders).
 */
export function getCharacterAvatarTex(characterIndex = 1) {
  const idx = clampCharacterIndex(characterIndex);
  if (_avatarCache.has(idx)) return _avatarCache.get(idx);
  const base = Assets.get(characterAssetAlias(idx));
  const size = Math.min(base.width, Math.floor(base.height * 0.55));
  const xOff = Math.floor((base.width - size) / 2);
  const tex = new Texture({
    source: base.source,
    frame: new Rectangle(xOff, 0, size, size),
  });
  _avatarCache.set(idx, tex);
  return tex;
}
