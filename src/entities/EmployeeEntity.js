/**
 * EmployeeEntity
 *
 * Visual representation of an employee sitting at a desk.
 * Has simple state-driven "animations" (idle / typing / coffee).
 *
 * States:
 *   idle    - slow bobbing, grey tint
 *   typing  - fast tick marks appear above head, blue tint
 *   coffee  - brief pause, orange indicator
 */
import { Entity } from './Entity.js';
import { Graphics, Text } from 'pixi.js';

const PERSON_W = 24;
const PERSON_H = 30;

const STATE_COLORS = {
  idle: 0x4a5a7a,
  typing: 0x4a9eff,
  coffee: 0xf97316,
};

const TYPING_INTERVAL = 0.3; // seconds between type-tick flashes
const COFFEE_CHANCE = 0.004; // per-frame probability of taking a break
const COFFEE_DURATION = 3; // seconds

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
    this._stateTimer = 0;
    this._typingAcc = 0;
    this._showTick = false;
    this._name = name;

    this._body = new Graphics();
    this._head = new Graphics();
    this._indicator = new Graphics();
    this._nameLabel = new Text({
      text: name.split(' ')[0] ?? '',
      style: {
        fill: 0x7a86a3,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
      },
    });
    this._nameLabel.anchor.set(0.5, 1);
    this._nameLabel.position.set(PERSON_W / 2, -4);

    this.view.addChild(this._body);
    this.view.addChild(this._head);
    this.view.addChild(this._indicator);
    this.view.addChild(this._nameLabel);

    this._draw();
  }

  /**
   * @param {'idle'|'typing'|'coffee'} state
   */
  setState(state) {
    if (this._state === state) return;
    this._state = state;
    this._stateTimer = 0;
    this._typingAcc = 0;
    this._draw();
  }

  update(dt) {
    this._stateTimer += dt;

    if (this._state === 'typing') {
      // Randomly slip into coffee break.
      if (Math.random() < COFFEE_CHANCE) {
        this.setState('coffee');
        return;
      }
      this._typingAcc += dt;
      if (this._typingAcc >= TYPING_INTERVAL) {
        this._typingAcc = 0;
        this._showTick = !this._showTick;
        this._drawIndicator();
      }
    } else if (this._state === 'coffee') {
      if (this._stateTimer >= COFFEE_DURATION) {
        this.setState('typing');
      }
    }
  }

  _draw() {
    const color = STATE_COLORS[this._state] ?? STATE_COLORS.idle;

    this._body
      .clear()
      .roundRect(3, 14, PERSON_W - 6, PERSON_H - 14, 3)
      .fill({ color });

    this._head
      .clear()
      .circle(PERSON_W / 2, 8, 8)
      .fill({ color: 0xc8a882 })
      .stroke({ color: 0x8a6852, width: 1 });

    this._drawIndicator();
  }

  _drawIndicator() {
    this._indicator.clear();

    if (this._state === 'typing' && this._showTick) {
      this._indicator
        .rect(PERSON_W / 2 - 6, -20, 12, 8)
        .fill({ color: 0x1e3a6e })
        .stroke({ color: 0x4a7aff, width: 1 });
      // Draw a simple "..." text using graphics lines.
      for (let i = 0; i < 3; i++) {
        this._indicator
          .circle(PERSON_W / 2 - 4 + i * 4, -16, 1.5)
          .fill({ color: 0x4a9eff });
      }
    } else if (this._state === 'coffee') {
      this._indicator
        .circle(PERSON_W / 2, -14, 7)
        .fill({ color: 0xf97316, alpha: 0.9 });
    }
  }
}
