/**
 * Avatar
 *
 * A fixed-size sprite for character portraits. Accepts a Pixi Texture directly
 * so the widget itself has no knowledge of game-specific texture loading —
 * the parent screen or view-model resolves the texture and passes it in.
 *
 * Props:
 *   texture  {import('pixi.js').Texture}  the Pixi Texture to display (required)
 *   size     {number}  uniform width & height in pixels (default 48)
 *   width    {number}  explicit width override
 *   height   {number}  explicit height override
 *   radius   {number}  corner rounding — 0 = square (default 0)
 *
 * Usage (in a screen file):
 *   const tex = getCharacterAvatarTex(emp.characterIndex);
 *   const av  = new Avatar({ texture: tex, size: 52 });
 *   headerRow.add(av);
 */
import { Sprite, Graphics, Container } from 'pixi.js';
import { Component } from '../foundation/Component.js';

export class Avatar extends Component {
  constructor(props = {}) {
    super({ size: 48, radius: 0, ...props });

    this._container = new Container();
    this._sprite = new Sprite();
    this._mask = new Graphics();

    this._container.addChild(this._sprite);
    this.addChild(this._container);

    this.render();
  }

  render() {
    const { texture, size = 48, radius = 0 } = this.props;
    const w = this.props.width ?? size;
    const h = this.props.height ?? size;

    if (texture) {
      this._sprite.texture = texture;
    }
    this._sprite.width = w;
    this._sprite.height = h;

    // Apply corner mask when radius > 0
    if (radius > 0) {
      this._mask.clear().roundRect(0, 0, w, h, radius).fill({ color: 0xffffff });
      this._container.addChild(this._mask);
      this._container.mask = this._mask;
    } else {
      this._container.mask = null;
    }

    this._measuredWidth = w;
    this._measuredHeight = h;
  }

  measure() {
    const size = this.props.size ?? 48;
    return {
      width: this.props.width ?? size,
      height: this.props.height ?? size,
    };
  }
}
