/**
 * Tooltip
 *
 * A small floating label that appears near its anchor point. In v1 it is
 * shown/hidden manually — there is no global hover manager yet.
 *
 * The Tooltip should be added to a top-level Container (e.g. popup content
 * layer) so it floats above siblings. The caller positions it before calling
 * show().
 *
 * Props:
 *   text       {string}  tooltip body text
 *   maxWidth   {number}  max width before text wraps (default 220)
 *
 * Methods:
 *   show(x, y)  — position at (x, y) and make visible
 *   hide()      — hide the tooltip
 *
 * Usage:
 *   const tip = new Tooltip({ text: 'Scores 80–100 mean strong agreement' });
 *   popupContent.addChild(tip);
 *   target.on('pointerover', () => tip.show(target.x, target.y - 30));
 *   target.on('pointerout',  () => tip.hide());
 */
import { Graphics, Text } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Theme } from '../foundation/Theme.js';

const PAD = 8;

export class Tooltip extends Component {
  constructor(props = {}) {
    super({ maxWidth: 220, ...props });

    this._bg = new Graphics();
    this._text = new Text({ text: '', style: {} });

    this.addChild(this._bg);
    this.addChild(this._text);

    this.visible = false;
    this.render();
  }

  render() {
    const { text = '', maxWidth = 220 } = this.props;

    this._text.text = String(text);
    this._text.style = {
      fill: Theme.colors.textBright,
      fontFamily: Theme.typography.fontFamily,
      fontSize: Theme.typography.sizes.sm,
      fontWeight: Theme.typography.weights.regular,
      wordWrap: true,
      wordWrapWidth: maxWidth - PAD * 2,
    };
    this._text.position.set(PAD, PAD);

    const w = this._text.width + PAD * 2;
    const h = this._text.height + PAD * 2;

    this._bg
      .clear()
      .roundRect(0, 0, w, h, Theme.radius.sm)
      .fill({ color: Theme.colors.bgHeader })
      .stroke({ color: Theme.colors.border, width: 1 });

    this._measuredWidth = w;
    this._measuredHeight = h;
  }

  /**
   * Position and show the tooltip.
   * @param {number} x
   * @param {number} y
   */
  show(x, y) {
    this.position.set(Math.round(x), Math.round(y));
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }
}
