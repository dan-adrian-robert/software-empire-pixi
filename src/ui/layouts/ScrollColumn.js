/**
 * ScrollColumn
 *
 * A fixed-size viewport that clips its content and scrolls vertically.
 * Use handleWheel(deltaY) to translate the content layer.
 *
 * Usage:
 *   const scroll = new ScrollColumn({ width: 800, height: 500 });
 *   scroll.addContent(somePanel);
 *   scroll.handleWheel(event.deltaY);
 *   // On resize:
 *   scroll.setProps({ width: newW, height: newH });
 *   scroll.resetScroll();
 */
import { Container, Graphics } from 'pixi.js';
import { Component } from '../foundation/Component.js';

export class ScrollColumn extends Component {
  /**
   * @param {object} props
   * @param {number} props.width   viewport width
   * @param {number} props.height  viewport height
   */
  constructor(props = {}) {
    super({ width: 0, height: 0, ...props });

    this._scrollOffset = 0;

    // Content layer — translated for scrolling
    this._content = new Container();

    // Mask that clips content to the viewport rectangle
    this._mask = new Graphics();
    this._content.mask = this._mask;

    this.addChild(this._mask);
    this.addChild(this._content);

    this._updateMask();
  }

  // ── Content API ─────────────────────────────────────────────────────────────

  /** Add a display object to the scrollable area. */
  addContent(child) {
    this._content.addChild(child);
    return child;
  }

  /** Remove all content and reset scroll to top. */
  clearContent() {
    this._content.removeChildren();
    this._scrollOffset = 0;
    this._applyScroll();
  }

  /** Scroll to the top without clearing content. */
  resetScroll() {
    this._scrollOffset = 0;
    this._applyScroll();
  }

  // ── Scroll API ───────────────────────────────────────────────────────────────

  /**
   * Scroll content by deltaY pixels (positive = scroll down / content moves up).
   * @param {number} deltaY
   */
  handleWheel(deltaY) {
    const viewH = this.props.height ?? 0;
    const contentH = this._measureContentHeight();
    const maxScroll = Math.max(0, contentH - viewH);

    this._scrollOffset = Math.max(-maxScroll, Math.min(0, this._scrollOffset - deltaY * 0.5));
    this._applyScroll();
  }

  // ── Framework overrides ──────────────────────────────────────────────────────

  setProps(partial) {
    super.setProps(partial);
    this._updateMask();
    // Re-clamp scroll in case viewport shrank
    const viewH = this.props.height ?? 0;
    const contentH = this._measureContentHeight();
    const maxScroll = Math.max(0, contentH - viewH);
    this._scrollOffset = Math.max(-maxScroll, Math.min(0, this._scrollOffset));
    this._applyScroll();
  }

  measure() {
    return { width: this.props.width ?? 0, height: this.props.height ?? 0 };
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  _applyScroll() {
    this._content.y = this._scrollOffset;
  }

  _updateMask() {
    const w = this.props.width ?? 0;
    const h = this.props.height ?? 0;
    this._mask.clear().rect(0, 0, w, h).fill({ color: 0xffffff });
  }

  _measureContentHeight() {
    if (this._content.children.length === 0) return 0;
    try {
      return this._content.getLocalBounds().height;
    } catch {
      return 0;
    }
  }
}
