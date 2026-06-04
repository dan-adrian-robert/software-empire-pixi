/**
 * Stack
 *
 * Places all children at the same position (overlapping), aligned within
 * the stack's bounds. Useful for layering a background behind content.
 *
 * Props:
 *   width    {number|'auto'}  explicit width, or 'auto' to use widest child
 *   height   {number|'auto'}  explicit height, or 'auto' to use tallest child
 *   padding  {number|Edges}   inner padding applied to all children's origin
 *   align    {'start'|'center'|'end'}  horizontal child alignment (default 'start')
 *   vAlign   {'start'|'center'|'end'}  vertical child alignment (default 'start')
 */
import { Layout } from './Layout.js';
import { isExplicit } from '../utils/layout.js';

export class Stack extends Layout {
  performLayout() {
    const children = this._layoutChildren;
    if (children.length === 0) {
      this._measuredWidth = 0;
      this._measuredHeight = 0;
      return;
    }

    const pad = this._resolvePadding();
    const align = this.props.align ?? 'start';
    const vAlign = this.props.vAlign ?? 'start';

    const fixedW = isExplicit(this.props.width) ? this.props.width : null;
    const fixedH = isExplicit(this.props.height) ? this.props.height : null;
    const innerW = fixedW !== null ? fixedW - pad.left - pad.right : null;
    const innerH = fixedH !== null ? fixedH - pad.top - pad.bottom : null;

    const sizes = children.map((child) =>
      this._measureChild(child, innerW ?? undefined, innerH ?? undefined),
    );

    const maxW = innerW ?? sizes.reduce((m, sz) => Math.max(m, sz.width), 0);
    const maxH = innerH ?? sizes.reduce((m, sz) => Math.max(m, sz.height), 0);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const sz = sizes[i];

      let x = pad.left;
      if (align === 'center') x = pad.left + (maxW - sz.width) / 2;
      else if (align === 'end') x = pad.left + maxW - sz.width;

      let y = pad.top;
      if (vAlign === 'center') y = pad.top + (maxH - sz.height) / 2;
      else if (vAlign === 'end') y = pad.top + maxH - sz.height;

      child.position.set(Math.round(x), Math.round(y));
    }

    this._measuredWidth = fixedW ?? maxW + pad.left + pad.right;
    this._measuredHeight = fixedH ?? maxH + pad.top + pad.bottom;
    this._layoutDirty = false;
  }
}
