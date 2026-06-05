/**
 * ScrollBar
 *
 * A draggable scrollbar widget. Orientation is 'horizontal' by default;
 * 'vertical' is supported as a future extension by swapping x/y axes.
 *
 * Props:
 *   orientation  {'horizontal'}   axis of scroll (default 'horizontal')
 *   length       {number}         track pixel size
 *   contentSize  {number}         total scrollable content size
 *   viewportSize {number}         visible viewport size
 *   value        {number}         current scroll offset 0 … (contentSize - viewportSize)
 *   onChange     {(value) => void} fired on drag or track click
 *
 * When contentSize <= viewportSize the widget hides itself automatically.
 */
import { Container, Graphics } from 'pixi.js';
import { Theme } from '../foundation/Theme.js';

const TRACK_H       = 8;
const THUMB_MIN_W   = 32;
const TRACK_COLOR   = 0x111928;
const THUMB_COLOR   = Theme.colors.border;       // 0x2a4a8a
const THUMB_HOVER   = 0x4a6aaa;

export class ScrollBar extends Container {
  /**
   * @param {object} props
   * @param {number} props.length
   * @param {number} props.contentSize
   * @param {number} props.viewportSize
   * @param {number} [props.value]
   * @param {Function} [props.onChange]
   */
  constructor(props = {}) {
    super();

    this._p = { orientation: 'horizontal', value: 0, ...props };

    this._thumbW     = 0;
    this._trackRange = 0;
    this._hovering   = false;
    this._dragging   = false;

    this._track = new Graphics();
    this._thumb = new Graphics();
    this.addChild(this._track);
    this.addChild(this._thumb);

    this._setupInteraction();
    this._render();
  }

  /**
   * @param {Partial<typeof this._p>} partial
   */
  setProps(partial) {
    this._p = { ...this._p, ...partial };
    this._render();
  }

  // ── Visuals ──────────────────────────────────────────────────────────────────

  _render() {
    const { length = 0, contentSize = 0, viewportSize = 0, value = 0 } = this._p;
    const maxScroll = Math.max(0, contentSize - viewportSize);

    // Track
    this._track
      .clear()
      .roundRect(0, 0, length, TRACK_H, TRACK_H / 2)
      .fill({ color: TRACK_COLOR });

    // Hide thumb when no overflow
    if (maxScroll <= 0 || length <= 0) {
      this._thumb.visible = false;
      this.visible = false;
      return;
    }

    this.visible    = true;
    this._thumb.visible = true;

    this._thumbW     = Math.max(THUMB_MIN_W, Math.round(length * (viewportSize / contentSize)));
    this._trackRange = length - this._thumbW;

    const thumbX = this._trackRange > 0
      ? Math.round(this._trackRange * (value / maxScroll))
      : 0;

    this._thumb
      .clear()
      .roundRect(0, 1, this._thumbW, TRACK_H - 2, (TRACK_H - 2) / 2)
      .fill({ color: this._hovering ? THUMB_HOVER : THUMB_COLOR });

    this._thumb.x = thumbX;
  }

  // ── Interaction ───────────────────────────────────────────────────────────────

  _setupInteraction() {
    this.eventMode = 'static';
    this.cursor    = 'pointer';

    this.on('pointerover', () => { this._hovering = true;  this._render(); });
    this.on('pointerout',  () => {
      if (!this._dragging) { this._hovering = false; this._render(); }
    });

    this.on('pointerdown', (e) => {
      const lx = e.getLocalPosition(this).x;
      const onThumb = lx >= this._thumb.x && lx <= this._thumb.x + this._thumbW;

      if (onThumb) {
        this._startDrag(e.clientX);
      } else {
        this._jumpTo(lx);
      }
    });
  }

  _startDrag(startClientX) {
    this._dragging      = true;
    this._dragStartX    = startClientX;
    this._dragStartVal  = this._p.value ?? 0;
    this.cursor         = 'grabbing';

    const onMove = (e) => {
      if (!this._dragging) return;
      const { contentSize = 0, viewportSize = 0 } = this._p;
      const maxScroll  = Math.max(0, contentSize - viewportSize);
      const dx         = e.clientX - this._dragStartX;
      const delta      = this._trackRange > 0 ? (dx / this._trackRange) * maxScroll : 0;
      this._emitChange(this._dragStartVal + delta);
    };

    const onUp = () => {
      this._dragging = false;
      this._hovering = false;
      this.cursor    = 'pointer';
      this._render();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }

  _jumpTo(clickX) {
    const { contentSize = 0, viewportSize = 0 } = this._p;
    const maxScroll = Math.max(0, contentSize - viewportSize);
    const targetX   = clickX - this._thumbW / 2;
    const ratio     = this._trackRange > 0 ? Math.max(0, Math.min(1, targetX / this._trackRange)) : 0;
    this._emitChange(ratio * maxScroll);
  }

  _emitChange(value) {
    const { contentSize = 0, viewportSize = 0 } = this._p;
    const maxScroll = Math.max(0, contentSize - viewportSize);
    const clamped   = Math.max(0, Math.min(maxScroll, value));
    this._p = { ...this._p, value: clamped };
    this._render();
    this._p.onChange?.(clamped);
  }
}
