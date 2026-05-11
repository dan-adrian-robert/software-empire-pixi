/**
 * Entity
 *
 * Minimal base class for in-world objects (employees, desks, computers,
 * decorations, ...). Each entity owns a Pixi `Container` (`view`) so it can
 * hold sprites, text, particles, etc.
 *
 * This is intentionally tiny - we expect the simulation to grow into an
 * ECS-style system later (components for AI, needs, schedule, ...).
 * Until then, gameplay logic lives directly on subclasses' `update`.
 */
import { Container, Graphics } from 'pixi.js';

let _nextId = 1;

export class Entity {
  /**
   * @param {object} options
   * @param {number} [options.x]
   * @param {number} [options.y]
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @param {number} [options.color]  - Placeholder color until art is added.
   */
  constructor({ x = 0, y = 0, width = 32, height = 32, color = 0xffffff } = {}) {
    this.id = _nextId++;
    this.width = width;
    this.height = height;

    this.view = new Container();
    this.view.label = `entity-${this.id}`;
    this.view.position.set(x, y);

    // Placeholder visual. Subclasses can clear this and add real sprites.
    this._placeholder = new Graphics()
      .roundRect(0, 0, width, height, 6)
      .fill({ color })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.15 });
    this.view.addChild(this._placeholder);
  }

  get x() {
    return this.view.x;
  }
  set x(v) {
    this.view.x = v;
  }

  get y() {
    return this.view.y;
  }
  set y(v) {
    this.view.y = v;
  }

  /** Override in subclasses. `dt` is in seconds. */
  // eslint-disable-next-line no-unused-vars
  update(dt) {}

  destroy() {
    this.view.destroy({ children: true });
  }
}
