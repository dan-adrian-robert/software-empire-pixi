/**
 * Button - simple reusable UI button built from a Graphics + Text.
 *
 * Kept dependency-free of any specific scene so it can be reused in menus,
 * HUDs, modals, etc. Exposes an `onClick` callback and visually responds to
 * hover / press states.
 */
import { Container, Graphics, Text } from 'pixi.js';

const DEFAULT_STYLE = Object.freeze({
  width: 280,
  height: 64,
  radius: 12,
  bg: 0x1c2333,
  bgHover: 0x273349,
  bgPressed: 0x141a27,
  border: 0x3a4a6b,
  textColor: 0xe6e8ef,
  fontSize: 22,
  fontFamily: 'Inter, system-ui, sans-serif',
});

export class Button extends Container {
  /**
   * @param {string} label
   * @param {() => void} onClick
   * @param {Partial<typeof DEFAULT_STYLE>} [style]
   */
  constructor(label, onClick, style = {}) {
    super();

    this.style = { ...DEFAULT_STYLE, ...style };
    this.onClick = onClick;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._label = new Text({
      text: label,
      style: {
        fill: this.style.textColor,
        fontFamily: this.style.fontFamily,
        fontSize: this.style.fontSize,
        fontWeight: '600',
        align: 'center',
      },
    });
    this._label.anchor.set(0.5);
    this._label.position.set(this.style.width / 2, this.style.height / 2);
    this.addChild(this._label);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = null;

    this._hover = false;
    this._pressed = false;

    this.on('pointerover', () => {
      this._hover = true;
      this._redraw();
    });
    this.on('pointerout', () => {
      this._hover = false;
      this._pressed = false;
      this._redraw();
    });
    this.on('pointerdown', () => {
      this._pressed = true;
      this._redraw();
    });
    this.on('pointerup', () => {
      const wasPressed = this._pressed;
      this._pressed = false;
      this._redraw();
      if (wasPressed && this.onClick) this.onClick();
    });
    this.on('pointerupoutside', () => {
      this._pressed = false;
      this._redraw();
    });

    this._redraw();
  }

  setLabel(text) {
    this._label.text = text;
  }

  _redraw() {
    const s = this.style;
    const fill = this._pressed ? s.bgPressed : this._hover ? s.bgHover : s.bg;

    this._bg
      .clear()
      .roundRect(0, 0, s.width, s.height, s.radius)
      .fill({ color: fill })
      .stroke({ color: s.border, width: 2, alignment: 1 });
  }
}
