/**
 * characterSprite
 *
 * Shared texture helpers for character1.png.
 * The office bundle must be loaded (via AssetManager.loadBundle('office'))
 * before any of these are called.
 *
 * Two variants:
 *  - getCharacterTopHalf()   : top 50 % of the portrait (head + shoulders + badge).
 *                              Used in the world EmployeeEntity.
 *  - getCharacterAvatarTex() : square crop of the upper-centre, normalised to the
 *                              face/shoulder region.  Used in panel card headers
 *                              and assignment chips where a compact thumbnail fits better.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';

let _topHalf = null;
let _avatarSquare = null;

export function getCharacterTopHalf() {
  if (_topHalf) return _topHalf;
  const base = Assets.get('character-1');
  _topHalf = new Texture({
    source: base.source,
    frame: new Rectangle(0, 0, base.width, Math.floor(base.height / 2)),
  });
  return _topHalf;
}

/**
 * A square crop centred horizontally and covering the top 55 % of the image
 * (encompasses head, hair and upper shoulders).
 */
export function getCharacterAvatarTex() {
  if (_avatarSquare) return _avatarSquare;
  const base = Assets.get('character-1');
  const size = Math.min(base.width, Math.floor(base.height * 0.55));
  const xOff = Math.floor((base.width - size) / 2);
  _avatarSquare = new Texture({
    source: base.source,
    frame: new Rectangle(xOff, 0, size, size),
  });
  return _avatarSquare;
}
