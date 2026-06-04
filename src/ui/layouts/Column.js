/**
 * Column
 *
 * Stacks children vertically, top-to-bottom, separated by `gap`.
 *
 * Props (in addition to Layout base):
 *   width    {number|'auto'}  if 'auto', expands to widest child + h-padding
 *   height   {number|'auto'}  if 'auto', expands to sum of children + gaps + v-padding
 *   gap      {number}         vertical spacing between children (default 0)
 *   align    {'start'|'center'|'end'|'stretch'}  horizontal alignment of children
 *   justify  {'start'|'center'|'end'|'spaceBetween'}  vertical distribution
 *   padding  {number|Edges}   inner padding
 *
 * Children with layoutFlex=1 share any remaining vertical space after
 * fixed-size children and gaps are accounted for.
 */
import { Layout } from './Layout.js';
import { isExplicit } from '../utils/layout.js';

export class Column extends Layout {
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

    // Resolve outer dimensions
    const fixedW = isExplicit(this.props.width) ? this.props.width : null;
    const fixedH = isExplicit(this.props.height) ? this.props.height : null;
    const innerW = fixedW !== null ? fixedW - pad.left - pad.right : null;

    // First pass: measure all children
    const sizes = children.map((child) => {
      const crossAvail = align === 'stretch' && innerW !== null ? innerW : undefined;
      return this._measureChild(child, undefined, crossAvail);
    });

    // Compute total fixed height consumed by non-flex children + gaps
    let flexCount = 0;
    let fixedHeight = 0;
    for (let i = 0; i < children.length; i++) {
      if (children[i].layoutFlex > 0) {
        flexCount++;
      } else {
        fixedHeight += sizes[i].height;
      }
    }
    const totalGaps = gap * (children.length - 1);
    const availHeight = fixedH !== null ? fixedH - pad.top - pad.bottom : null;
    const remainHeight =
      availHeight !== null ? Math.max(0, availHeight - fixedHeight - totalGaps) : 0;
    const flexUnitH = flexCount > 0 ? remainHeight / flexCount : 0;

    // Re-measure flex children with their allocated height
    for (let i = 0; i < children.length; i++) {
      if (children[i].layoutFlex > 0) {
        sizes[i] = this._measureChild(children[i], sizes[i].width, flexUnitH);
        sizes[i].height = flexUnitH;
      }
    }

    // Resolve total content height for justify calculations
    const totalContentH = sizes.reduce((s, sz) => s + sz.height, 0) + totalGaps;
    const innerH = availHeight ?? totalContentH;

    // Justify: compute starting Y offset
    let startY = pad.top;
    let extraGap = 0;
    if (justify === 'center') {
      startY = pad.top + (innerH - totalContentH) / 2;
    } else if (justify === 'end') {
      startY = pad.top + (innerH - totalContentH);
    } else if (justify === 'spaceBetween' && children.length > 1) {
      extraGap = Math.max(0, (innerH - totalContentH + totalGaps) / (children.length - 1)) - gap;
    }

    // Second pass: position each child
    let curY = startY;
    const maxChildW = sizes.reduce((m, sz) => Math.max(m, sz.width), 0);
    const refW = innerW ?? maxChildW;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const sz = sizes[i];

      // Stretch: override child width
      if (align === 'stretch' && innerW !== null) {
        if (typeof child.setProps === 'function') {
          child.setProps({ width: innerW });
        } else {
          child.width = innerW;
        }
      }

      // Cross-axis (horizontal) alignment
      let childX = pad.left;
      if (align === 'center') {
        childX = pad.left + (refW - sz.width) / 2;
      } else if (align === 'end') {
        childX = pad.left + refW - sz.width;
      }

      child.position.set(Math.round(childX), Math.round(curY));
      curY += sz.height + gap + extraGap;
    }

    // Update measured dimensions
    this._measuredWidth = fixedW ?? maxChildW + pad.left + pad.right;
    this._measuredHeight = fixedH ?? totalContentH + pad.top + pad.bottom;
    this._layoutDirty = false;
  }
}
