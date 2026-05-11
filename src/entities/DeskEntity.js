/**
 * DeskEntity
 *
 * Visual representation of a single office desk.
 * Renders as a coloured rectangle with a computer monitor on top.
 */
import { Entity } from './Entity.js';
import { Graphics, Text } from 'pixi.js';

const DESK_W = 80;
const DESK_H = 50;
const DESK_COLOR = 0x2a3a5a;
const DESK_BORDER = 0x3a5080;
const MONITOR_COLOR = 0x0d1526;
const MONITOR_BORDER = 0x4a7aff;
const EMPTY_COLOR = 0x1a2336;
const EMPTY_BORDER = 0x2a3a5a;

export { DESK_W, DESK_H };

export class DeskEntity extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean} [occupied]
   */
  constructor(x, y, occupied = false) {
    super({ x, y, width: DESK_W, height: DESK_H, color: 0x000000 });

    // Remove default placeholder graphics.
    this._placeholder.clear();

    this._occupied = occupied;
    this._desk = new Graphics();
    this._monitor = new Graphics();
    this._screenGlow = new Graphics();

    this.view.addChild(this._desk);
    this.view.addChild(this._monitor);
    this.view.addChild(this._screenGlow);

    this._draw();
  }

  setOccupied(occupied) {
    if (this._occupied === occupied) return;
    this._occupied = occupied;
    this._draw();
  }

  setActive(active) {
    this._active = active;
    this._drawScreenGlow(active);
  }

  _draw() {
    const deskColor = this._occupied ? DESK_COLOR : EMPTY_COLOR;
    const deskBorder = this._occupied ? DESK_BORDER : EMPTY_BORDER;

    this._desk
      .clear()
      .roundRect(0, 8, DESK_W, DESK_H - 8, 4)
      .fill({ color: deskColor })
      .stroke({ color: deskBorder, width: 1.5 });

    if (this._occupied) {
      this._monitor
        .clear()
        .roundRect(DESK_W / 2 - 14, -2, 28, 20, 3)
        .fill({ color: MONITOR_COLOR })
        .stroke({ color: MONITOR_BORDER, width: 1.5 });
    } else {
      this._monitor.clear();
    }

    this._drawScreenGlow(false);
  }

  _drawScreenGlow(active) {
    this._screenGlow.clear();
    if (active && this._occupied) {
      this._screenGlow
        .roundRect(DESK_W / 2 - 12, 0, 24, 16, 2)
        .fill({ color: 0x1a4aff, alpha: 0.6 });
    }
  }
}
