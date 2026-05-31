/**
 * FurnitureEntity
 *
 * Visual representation of a placed furniture item on the office floor.
 * Renders as a colored rounded rectangle (w×h tiles) with a label.
 *
 * In build mode:
 *   - setInteractive(true) makes it clickable/draggable.
 *   - setHighlight(true) shows a hover tint.
 *   - A small ✕ delete button appears on hover.
 *
 * Outside build mode the entity is purely decorative (eventMode = 'none').
 */
import { Container, Graphics, Text } from 'pixi.js';
import { getFurnitureType } from '../data/furnitureTypes.js';

const TILE = 64;
const RADIUS = 6;
const ALPHA_NORMAL   = 0.82;
const ALPHA_HIGHLIGHT = 1.0;
const BORDER_ALPHA   = 0.6;
const DELETE_SIZE    = 18;
const DELETE_BG      = 0x1a0a0a;
const DELETE_COLOR   = 0xf87171;

export class FurnitureEntity {
  /**
   * @param {import('../state/FurnitureItem.js').FurnitureItem} item
   * @param {(item: object) => void} onDelete  Called when the ✕ is pressed in build mode.
   * @param {(item: object, e: PointerEvent) => void} onDragStart  Called on pointerdown in build mode.
   */
  constructor(item, onDelete, onDragStart) {
    this.item = item;
    this._onDelete    = onDelete;
    this._onDragStart = onDragStart;

    const type = getFurnitureType(item.typeId);
    this._type = type;
    this._buildMode = false;

    this.view = new Container();
    this.view.label = `furniture-${item.id}`;

    const pw = type.w * TILE;
    const ph = type.h * TILE;

    // Background rect
    this._bg = new Graphics();
    this._draw(false);
    this.view.addChild(this._bg);

    // Label centered in the tile
    this._label = new Text({
      text: type.label,
      style: {
        fill: 0xffffff,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
      },
    });
    this._label.anchor.set(0.5);
    this._label.position.set(pw / 2, ph / 2);
    this.view.addChild(this._label);

    // Delete button (top-right corner) — hidden until build mode
    this._deleteBtn = this._buildDeleteButton();
    this._deleteBtn.visible = false;
    this.view.addChild(this._deleteBtn);

    this.view.alpha = ALPHA_NORMAL;
    this.view.eventMode = 'none';
  }

  // ---------------------------------------------------------------------------

  setPosition(pixelX, pixelY) {
    this.view.position.set(pixelX, pixelY);
  }

  /** Enter / leave build-mode interactions. */
  setBuildMode(active) {
    this._buildMode = active;
    if (active) {
      this.view.eventMode = 'static';
      this.view.cursor = 'grab';
      this.view.on('pointerover',  () => this._onHover(true));
      this.view.on('pointerout',   () => this._onHover(false));
      this.view.on('pointerdown',  (e) => this._onPointerDown(e));
    } else {
      this.view.eventMode = 'none';
      this.view.cursor = 'default';
      this.view.removeAllListeners();
      this._deleteBtn.visible = false;
      this._draw(false);
      this.view.alpha = ALPHA_NORMAL;
    }
  }

  /** Tint while a drag is hovering over this entity's tile (used externally). */
  setHighlight(on) {
    this._draw(on);
    this.view.alpha = on ? ALPHA_HIGHLIGHT : ALPHA_NORMAL;
  }

  destroy() {
    this.view.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------

  _draw(highlighted) {
    const type = this._type;
    const pw = type.w * TILE;
    const ph = type.h * TILE;
    const col  = type.color;
    const bord = highlighted ? 0xffffff : col;

    this._bg
      .clear()
      .roundRect(2, 2, pw - 4, ph - 4, RADIUS)
      .fill({ color: col, alpha: highlighted ? 0.9 : 0.65 })
      .stroke({ color: bord, width: highlighted ? 2 : 1.5, alpha: BORDER_ALPHA });
  }

  _onHover(over) {
    if (!this._buildMode) return;
    this._deleteBtn.visible = over;
    this._draw(over);
    this.view.alpha = over ? ALPHA_HIGHLIGHT : ALPHA_NORMAL;
  }

  _onPointerDown(e) {
    if (!this._buildMode) return;
    e.stopPropagation();
    this._onDragStart(this.item, e);
  }

  _buildDeleteButton() {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, DELETE_SIZE, DELETE_SIZE, 4)
      .fill({ color: DELETE_BG, alpha: 0.85 });
    btn.addChild(bg);

    const icon = new Text({
      text: '✕',
      style: {
        fill: DELETE_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
      },
    });
    icon.anchor.set(0.5);
    icon.position.set(DELETE_SIZE / 2, DELETE_SIZE / 2);
    btn.addChild(icon);

    const type = this._type;
    btn.position.set(type.w * TILE - DELETE_SIZE - 2, 2);

    btn.on('pointerdown', (e) => {
      e.stopPropagation();
      this._onDelete(this.item);
    });

    return btn;
  }
}
