/**
 * Grid
 *
 * Arranges children into a fixed number of columns, wrapping into new rows
 * automatically. All cells share the same computed cell width.
 *
 * Props:
 *   columns  {number}         number of columns (default 3)
 *   width    {number|'auto'}  total width; used to derive cell width when provided
 *   height   {number|'auto'}  explicit height (usually 'auto')
 *   gap      {number}         horizontal and vertical gap between cells (default 0)
 *   colGap   {number}         overrides horizontal gap when set separately
 *   rowGap   {number}         overrides vertical gap when set separately
 *   padding  {number|Edges}   inner padding
 *   align    {'start'|'center'|'end'|'stretch'}  cross-axis (vertical) per-cell alignment
 *
 * Cell sizing:
 *   If width is provided: cellW = (innerW - colGap * (columns - 1)) / columns
 *   If width is 'auto':   cellW = widest child measured width
 */
import { Layout } from './Layout.js';
import { isExplicit } from '../utils/layout.js';

export class Grid extends Layout {
  performLayout() {
    const children = this._layoutChildren;
    if (children.length === 0) {
      this._measuredWidth = 0;
      this._measuredHeight = 0;
      return;
    }

    const pad = this._resolvePadding();
    const cols = this.props.columns ?? 3;
    const colGap = this.props.colGap ?? this.props.gap ?? 0;
    const rowGap = this.props.rowGap ?? this.props.gap ?? 0;
    const align = this.props.align ?? 'start';

    const fixedW = isExplicit(this.props.width) ? this.props.width : null;
    const fixedH = isExplicit(this.props.height) ? this.props.height : null;
    const innerW = fixedW !== null ? fixedW - pad.left - pad.right : null;

    // Derive cell width
    const cellW = innerW !== null ? Math.floor((innerW - colGap * (cols - 1)) / cols) : null;

    // Measure all children
    const sizes = children.map((child) => this._measureChild(child, cellW ?? undefined, undefined));

    const resolvedCellW = cellW ?? sizes.reduce((m, sz) => Math.max(m, sz.width), 0);

    // Group into rows
    const rows = [];
    for (let i = 0; i < children.length; i += cols) {
      rows.push(children.slice(i, i + cols));
    }
    const rowSizes = [];
    for (let r = 0; r < rows.length; r++) {
      const rowChildren = rows[r];
      const rowH = rowChildren.reduce((m, _, ci) => {
        const sz = sizes[r * cols + ci];
        return sz ? Math.max(m, sz.height) : m;
      }, 0);
      rowSizes.push(rowH);
    }

    // Position children
    let curY = pad.top;
    for (let r = 0; r < rows.length; r++) {
      const rowH = rowSizes[r];
      const rowChildren = rows[r];
      for (let c = 0; c < rowChildren.length; c++) {
        const child = rowChildren[c];
        const sz = sizes[r * cols + c];
        const curX = pad.left + c * (resolvedCellW + colGap);

        // Stretch child to cell width if requested
        if (align === 'stretch' && typeof child.setProps === 'function') {
          child.setProps({ width: resolvedCellW });
        }

        // Vertical alignment within the row
        let childY = curY;
        if (align === 'center') childY = curY + (rowH - sz.height) / 2;
        else if (align === 'end') childY = curY + rowH - sz.height;

        child.position.set(Math.round(curX), Math.round(childY));
      }
      curY += rowH + rowGap;
    }

    const totalW = resolvedCellW * cols + colGap * (cols - 1) + pad.left + pad.right;
    const totalH = curY - rowGap + pad.bottom;

    this._measuredWidth = fixedW ?? totalW;
    this._measuredHeight = fixedH ?? totalH;
    this._layoutDirty = false;
  }
}
