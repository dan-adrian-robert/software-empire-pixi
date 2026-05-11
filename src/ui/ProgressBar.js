/**
 * ProgressBar - a horizontal progress bar with optional label.
 * Used for project requirements tracking.
 */
import { Container, Graphics, Text } from 'pixi.js';

const DEFAULT_STYLE = Object.freeze({
  width: 200,
  height: 14,
  radius: 4,
  trackColor: 0x1a2336,
  fillColor: 0x4a9eff,
  labelColor: 0xa0aec0,
  fontSize: 11,
  showLabel: true,
});

export class ProgressBar extends Container {
  /**
   * @param {Partial<typeof DEFAULT_STYLE>} [style]
   */
  constructor(style = {}) {
    super();
    this.style = { ...DEFAULT_STYLE, ...style };
    this._value = 0; // 0..1

    this._track = new Graphics();
    this._fill = new Graphics();
    this.addChild(this._track);
    this.addChild(this._fill);

    if (this.style.showLabel) {
      this._label = new Text({
        text: '',
        style: {
          fill: this.style.labelColor,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: this.style.fontSize,
        },
      });
      this._label.anchor.set(0, 0.5);
      this._label.position.set(0, -10);
      this.addChild(this._label);
    }

    this._drawTrack();
    this._drawFill();
  }

  /** @param {number} value  0..1 */
  setValue(value) {
    this._value = Math.max(0, Math.min(1, value));
    this._drawFill();
  }

  setLabel(text) {
    if (this._label) this._label.text = text;
  }

  _drawTrack() {
    const s = this.style;
    this._track
      .clear()
      .roundRect(0, 0, s.width, s.height, s.radius)
      .fill({ color: s.trackColor });
  }

  _drawFill() {
    const s = this.style;
    const fillW = Math.max(0, s.width * this._value);
    this._fill.clear();
    if (fillW > 0) {
      this._fill
        .roundRect(0, 0, fillW, s.height, s.radius)
        .fill({ color: s.fillColor });
    }
  }
}
