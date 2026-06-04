/**
 * Layout (abstract base)
 *
 * Extends Component to add child-positioning logic. Concrete subclasses
 * (Column, Row, Grid, Stack) implement performLayout() to assign positions.
 *
 * Props shared by all layouts:
 *   width        {number|'auto'}  explicit width or 'auto' to fit content
 *   height       {number|'auto'}  explicit height or 'auto' to fit content
 *   padding      {number|Edges}   uniform padding or { top, right, bottom, left }
 *   gap          {number}         spacing between children (ignored by Stack)
 *   align        {'start'|'center'|'end'|'stretch'}  cross-axis alignment
 *   justify      {'start'|'center'|'end'|'spaceBetween'}  main-axis alignment
 *   flex         {0|1}            whether this layout grows inside its parent
 *
 * Sizing rules:
 *   - Explicit number → fixed box; children clipped to that size logically
 *   - 'auto'          → expand to fit measured children + padding + gaps
 *   - 'stretch' align → pass parent inner dimension to child.measure()
 *
 * Children are added via layout.add(child). After any add() or setProps()
 * call the layout calls performLayout(), which recursively positions all
 * children and updates this._measuredWidth / _measuredHeight.
 */
import { Component } from '../foundation/Component.js';
import { isExplicit } from '../utils/layout.js';

export class Layout extends Component {
  /**
   * @param {Record<string, any>} [props]
   * @param {Array<import('../foundation/Component.js').Component>} [children]
   */
  constructor(props = {}, children = []) {
    super(props);
    this._layoutChildren = [];

    for (const child of children) {
      this.add(child);
    }
  }

  // ── Child management ─────────────────────────────────────────────────────────

  /** @override — track children for layout, then position them. */
  add(child) {
    this._layoutChildren.push(child);
    this.addChild(child);
    this.performLayout();
    return child;
  }

  /** Remove a child from layout tracking and from the display list. */
  remove(child) {
    const idx = this._layoutChildren.indexOf(child);
    if (idx !== -1) this._layoutChildren.splice(idx, 1);
    if (child.parent === this) this.removeChild(child);
    this.performLayout();
    return child;
  }

  /** Remove all layout children. */
  clearChildren() {
    for (const child of [...this._layoutChildren]) {
      if (child.parent === this) this.removeChild(child);
    }
    this._layoutChildren = [];
    this._measuredWidth = 0;
    this._measuredHeight = 0;
  }

  // ── Layout pass ──────────────────────────────────────────────────────────────

  /**
   * Override in subclasses to position children and update
   * this._measuredWidth / this._measuredHeight.
   */
  performLayout() {}

  /** Re-run layout when props change. */
  setProps(partial) {
    super.setProps(partial);
    this.performLayout();
  }

  markLayoutDirty() {
    super.markLayoutDirty();
    // Bubble up only — do not call performLayout here to avoid cycles.
    // Explicit add() / setProps() calls are the triggers.
  }

  // ── Helpers shared by subclasses ─────────────────────────────────────────────

  /**
   * Resolve the padding prop into a { top, right, bottom, left } object.
   * Accepts a number (uniform) or an object with individual sides.
   * @returns {{ top: number, right: number, bottom: number, left: number }}
   */
  _resolvePadding() {
    const p = this.props.padding ?? 0;
    if (typeof p === 'number') return { top: p, right: p, bottom: p, left: p };
    return {
      top: p.top ?? p.vertical ?? 0,
      bottom: p.bottom ?? p.vertical ?? 0,
      left: p.left ?? p.horizontal ?? 0,
      right: p.right ?? p.horizontal ?? 0,
    };
  }

  /**
   * Measure a single child within the available space.
   * @param {Component} child
   * @param {number} [availableMainAxis]
   * @param {number} [availableCrossAxis]
   * @returns {{ width: number, height: number }}
   */
  _measureChild(child, availableMainAxis, availableCrossAxis) {
    if (typeof child.measure === 'function') {
      return child.measure(availableMainAxis, availableCrossAxis);
    }
    return {
      width: child.width ?? 0,
      height: child.height ?? 0,
    };
  }

  /** @override */
  measure() {
    const w = this.props.width;
    const h = this.props.height;
    return {
      width: isExplicit(w) ? w : (this._measuredWidth ?? 0),
      height: isExplicit(h) ? h : (this._measuredHeight ?? 0),
    };
  }
}
