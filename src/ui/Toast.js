/**
 * Toast - an auto-dismissing notification popup.
 * Appears in the top-right corner and fades out after a duration.
 */
import { Container, Graphics, Text } from 'pixi.js';

const TYPE_COLORS = {
  info: 0x1e3a5f,
  success: 0x1a3a2a,
  warning: 0x3a2a00,
  critical: 0x3a0000,
};
const TYPE_BORDER_COLORS = {
  info: 0x4a9eff,
  success: 0x4ade80,
  warning: 0xfbbf24,
  critical: 0xf87171,
};

export class Toast extends Container {
  /**
   * @param {string} message
   * @param {'info'|'success'|'warning'|'critical'} type
   * @param {number} [duration]  seconds before auto-dismiss
   */
  constructor(message, type = 'info', duration = 4) {
    super();

    this._duration = duration;
    this._elapsed = 0;
    this._dismissed = false;

    const W = 340;
    const H = 48;
    const R = 8;

    const bg = new Graphics()
      .roundRect(0, 0, W, H, R)
      .fill({ color: TYPE_COLORS[type] ?? TYPE_COLORS.info })
      .stroke({ color: TYPE_BORDER_COLORS[type] ?? TYPE_BORDER_COLORS.info, width: 1.5 });
    this.addChild(bg);

    const label = new Text({
      text: message,
      style: {
        fill: 0xe6e8ef,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        wordWrap: true,
        wordWrapWidth: W - 24,
      },
    });
    label.anchor.set(0, 0.5);
    label.position.set(12, H / 2);
    this.addChild(label);
  }

  get dismissed() {
    return this._dismissed;
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this._dismissed) return;

    this._elapsed += dt;
    const remaining = this._duration - this._elapsed;

    if (remaining < 0.5) {
      this.alpha = Math.max(0, remaining / 0.5);
    }

    if (this._elapsed >= this._duration) {
      this._dismissed = true;
    }
  }
}
