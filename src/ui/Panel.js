/**
 * Panel - a rounded rectangle background container.
 * Used as the base for sidebars, modals, cards, etc.
 */
import { Container, Graphics } from 'pixi.js';

const DEFAULT_STYLE = Object.freeze({
  width: 300,
  height: 200,
  radius: 10,
  bg: 0x131929,
  border: 0x1e2d47,
  borderWidth: 1,
  alpha: 1,
});

export class Panel extends Container {
  /**
   * @param {Partial<typeof DEFAULT_STYLE>} [style]
   */
  constructor(style = {}) {
    super();
    this.style = { ...DEFAULT_STYLE, ...style };
    this._bg = new Graphics();
    this.addChild(this._bg);
    this._draw();
  }

  resize(width, height) {
    this.style.width = width;
    this.style.height = height;
    this._draw();
  }

  _draw() {
    const s = this.style;
    this._bg
      .clear()
      .roundRect(0, 0, s.width, s.height, s.radius)
      .fill({ color: s.bg, alpha: s.alpha })
      .stroke({ color: s.border, width: s.borderWidth });
  }
}
