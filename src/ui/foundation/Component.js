/**
 * Component
 *
 * Base class for all framework UI elements. Extends Pixi Container and adds:
 *
 *   - props / setState API for data-driven rendering
 *   - measure() contract used by parent Layouts to size children
 *   - layout-dirty propagation so Layouts re-run only when needed
 *
 * Subclass rules:
 *   - Override render() to update visuals from this.props / this._state.
 *     render() MUST NOT call position.set() on siblings or parents.
 *   - Override measure() to return { width, height } of intrinsic content size.
 *     The default returns props.width / props.height if provided, otherwise 0.
 *   - Use add(child) instead of addChild(child) so the parent layout learns
 *     about new children and can re-run its layout pass.
 */
import { Container } from 'pixi.js';

export class Component extends Container {
  /**
   * @param {Record<string, any>} [props]
   */
  constructor(props = {}) {
    super();

    /** @type {Record<string, any>} */
    this.props = props;

    /** @type {Record<string, any>} */
    this._state = {};

    // Layout metadata set by parent Layout instances
    this._layoutDirty = false;
    /** Flex growth factor; 0 = fixed, 1 = fill remaining space */
    this.layoutFlex = props.flex ?? 0;
    this._measuredWidth = 0;
    this._measuredHeight = 0;
  }

  // ── Data API ─────────────────────────────────────────────────────────────────

  /**
   * Merge partial props and re-render.
   * @param {Record<string, any>} partial
   */
  setProps(partial) {
    this.props = { ...this.props, ...partial };
    if (partial.flex !== undefined) this.layoutFlex = partial.flex;
    this.render();
    this.markLayoutDirty();
  }

  /**
   * Merge partial state and re-render.
   * @param {Record<string, any>} partial
   */
  setState(partial) {
    this._state = { ...this._state, ...partial };
    this.render();
    this.markLayoutDirty();
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  /** Override in subclasses to rebuild visuals from props / state. */
  render() {}

  // ── Layout contract ──────────────────────────────────────────────────────────

  /**
   * Return the intrinsic size of this component given available space.
   * Layouts call this before positioning children.
   *
   * @param {number} [availableWidth]
   * @param {number} [availableHeight]
   * @returns {{ width: number, height: number }}
   */
  measure(availableWidth, availableHeight) {
    const w = this.props.width ?? this._measuredWidth ?? 0;
    const h = this.props.height ?? this._measuredHeight ?? 0;
    return {
      width: w === 'auto' ? (availableWidth ?? 0) : w,
      height: h === 'auto' ? (availableHeight ?? 0) : h,
    };
  }

  /**
   * Signal that this component's size may have changed.
   * Bubbles up to the nearest Layout ancestor so it can re-run its pass.
   */
  markLayoutDirty() {
    this._layoutDirty = true;
    if (this.parent instanceof Component) {
      this.parent.markLayoutDirty();
    }
  }

  // ── Child management ─────────────────────────────────────────────────────────

  /**
   * Add a child component and mark this layout dirty.
   * Prefer this over addChild() when building framework UIs.
   *
   * @param {Component | import('pixi.js').Container} child
   * @returns {Component | import('pixi.js').Container} The added child
   */
  add(child) {
    this.addChild(child);
    this.markLayoutDirty();
    return child;
  }
}
