/**
 * uiLogoSprite
 *
 * Helpers for creating Sprites from the logos.json / logos.png spritesheet.
 * The `office` bundle must be loaded before any of these helpers are called
 * (OfficeScene.loadBundle('office') wires this in automatically).
 *
 * Pixi v8 registers each frame alias globally when the spritesheet loads, so
 * `Assets.get('laptop')` etc. are available after the bundle is ready.
 */
import { Assets, Sprite, Text } from 'pixi.js';

/** Native frame height used as the scale reference (matches most frames). */
const NATIVE_H = 164;

/**
 * Returns the Pixi Texture for a logo frame, or null if it is not loaded.
 * @param {string} frameId  Frame name from logos.json (e.g. 'laptop', 'sun').
 * @returns {import('pixi.js').Texture | null}
 */
export function getUiLogoTex(frameId) {
  try {
    const tex = Assets.get(frameId);
    return tex ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates a Sprite for the given frame, scaled so its height equals `size` px.
 * Anchor is set to (0.5, 0.5) for easy centering.
 * Returns null when the frame is not loaded.
 *
 * @param {string} frameId
 * @param {number} size   Desired display size in pixels (applied to height).
 * @returns {Sprite | null}
 */
export function createLogoSprite(frameId, size) {
  const tex = getUiLogoTex(frameId);
  if (!tex) return null;
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5, 0.5);
  const scale = size / NATIVE_H;
  sprite.scale.set(scale);
  return sprite;
}

/**
 * Returns a Sprite when the frame exists, otherwise a Text node with the
 * emoji fallback. In both cases the child is anchored to (0.5, 0.5).
 *
 * Use this for nav buttons and anywhere a sprite is preferred but an emoji
 * fallback is acceptable (e.g. sidebar items without a dedicated frame).
 *
 * @param {string | null} frameId   Logo frame name, or null to force emoji.
 * @param {number}        size      Desired sprite display height in pixels.
 * @param {string}        emoji     Fallback emoji string.
 * @param {number}        [fontSize=22]  Font size for the emoji Text node.
 * @returns {Sprite | Text}
 */
export function createLogoOrEmoji(frameId, size, emoji, fontSize = 22) {
  if (frameId) {
    const sprite = createLogoSprite(frameId, size);
    if (sprite) return sprite;
  }
  const text = new Text({ text: emoji, style: { fontSize } });
  text.anchor.set(0.5, 0.5);
  return text;
}
