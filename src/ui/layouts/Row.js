/**
 * Row
 *
 * Places children horizontally, left-to-right, separated by `gap`.
 *
 * Props (in addition to Layout base):
 *   width    {number|'auto'}  if 'auto', expands to sum of children + gaps + h-padding
 *   height   {number|'auto'}  if 'auto', expands to tallest child + v-padding
 *   gap      {number}         horizontal spacing between children (default 0)
 *   align    {'start'|'center'|'end'|'stretch'}  vertical alignment of children
 *   justify  {'start'|'center'|'end'|'spaceBetween'}  horizontal distribution
 *   padding  {number|Edges}   inner padding
 *
 * Children with layoutFlex=1 share remaining horizontal space after fixed
 * children and gaps are accounted for.
 */
import { Layout } from './Layout.js';
import { isExplicit } from '../utils/layout.js';

export class Row extends Layout {
  performLayout() {
    const children = this._layoutChildren;
    if (children.length === 0) {
      this._measuredWidth = 0;
      this._measuredHeight = 0;
      return;
    }

    const pad = this._resolvePadding();
    const gap = this.props.gap ?? 0;
    const align = this.props.align ?? 'start';
    const justify = this.props.justify ?? 'start';

    const fixedW = isExplicit(this.props.width) ? this.props.width : null;
    const fixedH = isExplicit(this.props.height) ? this.props.height : null;
    const innerH = fixedH !== null ? fixedH - pad.top - pad.bottom : null;

    // First pass: measure all children
    const sizes = children.map((child) => {
      const crossAvail = align === 'stretch' && innerH !== null ? innerH : undefined;
      return this._measureChild(child, undefined, crossAvail);
    });

    // Compute total fixed width consumed by non-flex children + gaps
    let flexCount = 0;
    let fixedWidth = 0;
    for (let i = 0; i < children.length; i++) {
      if (children[i].layoutFlex > 0) {
        flexCount++;
      } else {
        fixedWidth += sizes[i].width;
      }
    }
    const totalGaps = gap * (children.length - 1);
    const availWidth = fixedW !== null ? fixedW - pad.left - pad.right : null;
    const remainWidth = availWidth !== null ? Math.max(0, availWidth - fixedWidth - totalGaps) : 0;
    const flexUnitW = flexCount > 0 ? remainWidth / flexCount : 0;

    // Re-measure flex children with their allocated width
    for (let i = 0; i < children.length; i++) {
      if (children[i].layoutFlex > 0) {
        sizes[i] = this._measureChild(children[i], flexUnitW, sizes[i].height);
        sizes[i].width = flexUnitW;
      }
    }

    const totalContentW = sizes.reduce((s, sz) => s + sz.width, 0) + totalGaps;
    const innerW = availWidth ?? totalContentW;

    // Justify: compute starting X offset
    let startX = pad.left;
    let extraGap = 0;
    if (justify === 'center') {
      startX = pad.left + (innerW - totalContentW) / 2;
    } else if (justify === 'end') {
      startX = pad.left + (innerW - totalContentW);
    } else if (justify === 'spaceBetween' && children.length > 1) {
      extraGap = Math.max(0, (innerW - totalContentW + totalGaps) / (children.length - 1)) - gap;
    }

    // Second pass: position each child
    let curX = startX;
    const maxChildH = sizes.reduce((m, sz) => Math.max(m, sz.height), 0);
    const refH = innerH ?? maxChildH;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const sz = sizes[i];

      // Stretch: override child height
      if (align === 'stretch' && innerH !== null) {
        if (typeof child.setProps === 'function') {
          child.setProps({ height: innerH });
        } else {
          child.height = innerH;
        }
      }

      // Cross-axis (vertical) alignment
      let childY = pad.top;
      if (align === 'center') {
        childY = pad.top + (refH - sz.height) / 2;
      } else if (align === 'end') {
        childY = pad.top + refH - sz.height;
      }

      child.position.set(Math.round(curX), Math.round(childY));
      curX += sz.width + gap + extraGap;
    }

    this._measuredWidth = fixedW ?? totalContentW + pad.left + pad.right;
    this._measuredHeight = fixedH ?? maxChildH + pad.top + pad.bottom;
    this._layoutDirty = false;
  }
}
