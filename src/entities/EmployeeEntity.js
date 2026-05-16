/**
 * EmployeeEntity
 *
 * Visual representation of an employee sitting at a desk.
 *
 * States:
 *   idle   - grey body
 *   typing - blue body
 *
 * The name label is rendered BELOW the desk (offset ~148px below entity origin).
 * Call `setOnClick(cb)` to make the entity interactive.
 */
import { Entity } from './Entity.js';
import { Graphics, Rectangle, Text } from 'pixi.js';

const PERSON_W = 48;
const PERSON_H = 60;

// How far below the entity origin the desk bottom edge sits.
// Entity is spawned 40px above the desk (y - 40), and DESK_H = 100.
const NAME_OFFSET_Y = PERSON_H + 88; // ≈ below desk bottom

const BODY_COLOR = 0x4a5a7a;

export class EmployeeEntity extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} [name]
   */
  constructor(x, y, name = '') {
    super({ x, y, width: PERSON_W, height: PERSON_H, color: 0x000000 });
    this._placeholder.clear();

    this._state = 'idle';
    this._name = name;

    this._hands = new Graphics();
    this._body = new Graphics();
    this._head = new Graphics();

    // Name label — centered below the desk
    this._nameLabel = new Text({
      text: name.split(' ')[0] ?? '',
      style: {
        fill: 0x7a86a3,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
      },
    });
    this._nameLabel.anchor.set(0.5, 0);
    this._nameLabel.position.set(PERSON_W / 2, NAME_OFFSET_Y);

    this.view.addChild(this._body);
    this.view.addChild(this._hands);
    this.view.addChild(this._head);
    this.view.addChild(this._nameLabel);

    // Expand hit area to make the character easier to click.
    this.view.hitArea = new Rectangle(-16, -16, PERSON_W + 32, PERSON_H + 32);

    this._draw();
  }

  // -------------------------------------------------------------------------

  /**
   * Make this entity clickable. The callback fires on pointerup.
   * Pointerdown events are stopped from propagating so the world background
   * handler does not also fire (which would immediately close the popup).
   * @param {() => void} callback
   */
  setOnClick(callback) {
    if (!this._clickBound) {
      this.view.eventMode = 'static';
      this.view.cursor = 'pointer';
      // Block pointerdown from reaching the world so the popup stays open.
      this.view.on('pointerdown', (e) => e.stopPropagation());
      this.view.on('pointerup', () => this._clickCb?.());
      this._clickBound = true;
    }
    this._clickCb = callback;
  }

  /** Highlight the entity to indicate it is currently selected. */
  setSelected(selected) {
    this._selected = selected;
    this._nameLabel.style.fill = selected ? 0x4a9eff : 0x7a86a3;
    this._nameLabel.style.fontWeight = selected ? '700' : '400';
  }

  // -------------------------------------------------------------------------

  /** @param {'idle'|'typing'} state */
  setState(state) {
    if (this._state === state) return;
    this._state = state;
    this._draw();
  }

  update(_dt) {}

  // -------------------------------------------------------------------------

  _draw() {
    this._body
      .clear()
      .roundRect(6, 28, PERSON_W - 12, PERSON_H - 28, 6)
      .fill({ color: BODY_COLOR });

    this._head
      .clear()
      .circle(PERSON_W / 2, 16, 16)
      .fill({ color: 0xc8a882 })
      .stroke({ color: 0x8a6852, width: 2 });

    this._drawHands();
  }

  _drawHands() {
    const color  = 0xc8a882;
    const HAND_R = 9;
    const baseY  = 59;

    this._hands.clear();

    // Left hand
    this._hands
      .moveTo(6 + HAND_R, baseY)
      .arc(6, baseY, HAND_R, 0, Math.PI, true)
      .fill({ color });

    // Right hand
    this._hands
      .moveTo(PERSON_W - 6 + HAND_R, baseY)
      .arc(PERSON_W - 6, baseY, HAND_R, 0, Math.PI, true)
      .fill({ color });
  }
}
