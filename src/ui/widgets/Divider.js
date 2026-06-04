/**
 * Divider
 *
 * A thin horizontal or vertical rule. Reduces boilerplate when separating
 * sections in Column or Row layouts.
 *
 * Props:
 *   orientation  {'horizontal'|'vertical'}  default 'horizontal'
 *   length       {number}  explicit length along the main axis; required
 *   thickness    {number}  line thickness (default 1)
 *   color        {number}  line color (default Theme.colors.divider)
 *   alpha        {number}  opacity 0-1 (default 1)
 */
import { Graphics } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Theme } from '../foundation/Theme.js';

export class Divider extends Component {
  constructor(props = {}) {
    super({
      orientation: 'horizontal',
      thickness: 1,
      color: Theme.colors.divider,
      alpha: 1,
      ...props,
    });

    this._g = new Graphics();
    this.addChild(this._g);
    this.render();
  }

  render() {
    const { orientation = 'horizontal', length = 0, thickness = 1, color, alpha = 1 } = this.props;

    this._g.clear();

    if (orientation === 'horizontal') {
      this._g
        .moveTo(0, 0)
        .lineTo(length, 0)
        .stroke({ color: color ?? Theme.colors.divider, width: thickness, alpha });
      this._measuredWidth = length;
      this._measuredHeight = thickness;
    } else {
      this._g
        .moveTo(0, 0)
        .lineTo(0, length)
        .stroke({ color: color ?? Theme.colors.divider, width: thickness, alpha });
      this._measuredWidth = thickness;
      this._measuredHeight = length;
    }
  }

  measure() {
    const { orientation = 'horizontal', length = 0, thickness = 1 } = this.props;
    return orientation === 'horizontal'
      ? { width: length, height: thickness }
      : { width: thickness, height: length };
  }
}
