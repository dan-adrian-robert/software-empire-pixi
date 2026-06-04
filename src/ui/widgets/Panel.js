/**
 * Panel
 *
 * A rounded-rectangle background box. Used as the visual container for
 * cards, sections, and popup windows.
 *
 * Props:
 *   width        {number}  required — panel width in pixels
 *   height       {number}  required — panel height in pixels
 *   bg           {number}  fill color  (default Theme.colors.bgCard)
 *   border       {number}  stroke color (default Theme.colors.border)
 *   borderWidth  {number}  stroke width (default 1)
 *   borderAlpha  {number}  stroke alpha 0-1 (default 1)
 *   radius       {number}  corner radius (default Theme.radius.md)
 *   accentColor  {number}  optional top accent bar color
 *   accentHeight {number}  height of accent bar in pixels (default 3)
 */
import { Graphics } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Theme } from '../foundation/Theme.js';

export class Panel extends Component {
  constructor(props = {}) {
    super({
      bg: Theme.colors.bgCard,
      border: Theme.colors.border,
      borderWidth: 1,
      borderAlpha: 1,
      radius: Theme.radius.md,
      ...props,
    });

    this._bg = new Graphics();
    this._accent = new Graphics();
    this.addChild(this._bg);
    this.addChild(this._accent);

    this.render();
  }

  render() {
    const {
      width = 0,
      height = 0,
      bg,
      border,
      borderWidth,
      borderAlpha,
      radius,
      accentColor,
      accentHeight = 3,
    } = this.props;

    this._bg
      .clear()
      .roundRect(0, 0, width, height, radius)
      .fill({ color: bg })
      .stroke({ color: border, width: borderWidth, alpha: borderAlpha });

    this._accent.clear();
    if (accentColor && width > 0) {
      this._accent.roundRect(0, 0, width, accentHeight, radius).fill({ color: accentColor });
    }

    this._measuredWidth = width;
    this._measuredHeight = height;
  }

  measure() {
    return { width: this.props.width ?? 0, height: this.props.height ?? 0 };
  }
}
