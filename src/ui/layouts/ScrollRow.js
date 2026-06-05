/**
 * ScrollRow
 *
 * A fixed-size viewport that clips its content and scrolls horizontally.
 * Use handleWheel(delta) to translate the content layer.
 */
import { Container, Graphics } from 'pixi.js';
import { Component } from '../foundation/Component.js';

export class ScrollRow extends Component {
  /**
   * @param {object} props
   * @param {number} props.width   viewport width
   * @param {number} props.height  viewport height
   */
  constructor(props = {}) {
    super({ width: 0, height: 0, ...props });

    this._scrollOffset = 0;

    this._content = new Container();

    this._mask = new Graphics();
    this._content.mask = this._mask;

    this.addChild(this._mask);
    this.addChild(this._content);

    this._updateMask();
  }

  addContent(child) {
    this._content.addChild(child);
    return child;
  }

  clearContent() {
    this._content.removeChildren();
    this._scrollOffset = 0;
    this._applyScroll();
  }

  resetScroll() {
    this._scrollOffset = 0;
    this._applyScroll();
  }

  /**
   * Scroll content horizontally (positive delta = scroll right / content moves left).
   * @param {number} delta
   */
  handleWheel(delta) {
    const viewW = this.props.width ?? 0;
    const contentW = this._measureContentWidth();
    const maxScroll = Math.max(0, contentW - viewW);

    this._scrollOffset = Math.max(-maxScroll, Math.min(0, this._scrollOffset - delta * 0.5));
    this._applyScroll();
  }

  setProps(partial) {
    super.setProps(partial);
    this._updateMask();
    const viewW = this.props.width ?? 0;
    const contentW = this._measureContentWidth();
    const maxScroll = Math.max(0, contentW - viewW);
    this._scrollOffset = Math.max(-maxScroll, Math.min(0, this._scrollOffset));
    this._applyScroll();
  }

  measure() {
    return { width: this.props.width ?? 0, height: this.props.height ?? 0 };
  }

  _applyScroll() {
    this._content.x = this._scrollOffset;
  }

  _updateMask() {
    const w = this.props.width ?? 0;
    const h = this.props.height ?? 0;
    this._mask.clear().rect(0, 0, w, h).fill({ color: 0xffffff });
  }

  _measureContentWidth() {
    if (this._content.children.length === 0) return 0;
    try {
      return this._content.getLocalBounds().width;
    } catch {
      return 0;
    }
  }
}
