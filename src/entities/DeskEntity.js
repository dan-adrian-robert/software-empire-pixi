/**
 * DeskEntity
 *
 * Visual representation of a single office desk occupying a 2×2 tile footprint
 * (128×128 px). Callers set view.position after construction.
 *
 * States:
 *   occupied  – desk surface + monitor visible, interactive employee can sit here
 *   empty     – dimmed outline only
 *   active    – screen glow overlay when the seated employee is producing SP
 */
import { Entity } from './Entity.js';
import { Graphics } from 'pixi.js';

export const DESK_W = 128;
export const DESK_H = 128;

const DESK_COLOR    = 0x2a3a5a;
const DESK_BORDER   = 0x3a5080;
const MONITOR_COLOR = 0x0d1526;
const MONITOR_BORDER = 0x4a7aff;
const EMPTY_COLOR   = 0x1a2336;
const EMPTY_BORDER  = 0x2a3a5a;

export class DeskEntity extends Entity {
  /**
   * @param {boolean} [occupied]
   */
  constructor(occupied = false) {
    super({ x: 0, y: 0, width: DESK_W, height: DESK_H, color: 0x000000 });

    this._placeholder.clear();

    this._occupied  = occupied;
    this._activeGlow = false;

    this._desk        = new Graphics();
    this._monitor     = new Graphics();
    this._screenGlow  = new Graphics();

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
    if (this._activeGlow === active) return;
    this._activeGlow = active;
    this._drawScreenGlow(active);
  }

  // ---------------------------------------------------------------------------

  // Monitor dimensions — on the desk surface, centered
  static get MON_X()  { return 24; }
  static get MON_Y()  { return 38; }
  static get MON_W()  { return 80; }
  static get MON_H()  { return 72; }

  _draw() {
    const col  = this._occupied ? DESK_COLOR  : EMPTY_COLOR;
    const bord = this._occupied ? DESK_BORDER : EMPTY_BORDER;

    // Desk surface — full tile background
    this._desk
      .clear()
      .roundRect(2, 2, DESK_W - 4, DESK_H - 4, 10)
      .fill({ color: col })
      .stroke({ color: bord, width: 2.5 });

    if (this._occupied) {
      // Monitor — sits on the desk surface, centered
      const { MON_X, MON_Y, MON_W, MON_H } = DeskEntity;
      this._monitor
        .clear()
        .roundRect(MON_X, MON_Y, MON_W, MON_H, 6)
        .fill({ color: MONITOR_COLOR })
        .stroke({ color: MONITOR_BORDER, width: 2.5 });
    } else {
      this._monitor.clear();
    }

    this._drawScreenGlow(this._activeGlow);
  }

  _drawScreenGlow(active) {
    this._screenGlow.clear();
    if (active && this._occupied) {
      const { MON_X, MON_Y, MON_W, MON_H } = DeskEntity;
      this._screenGlow
        .roundRect(MON_X + 4, MON_Y + 4, MON_W - 8, MON_H - 8, 4)
        .fill({ color: 0x1a4aff, alpha: 0.45 });
    }
  }
}
