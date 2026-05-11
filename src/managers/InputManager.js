/**
 * InputManager
 *
 * Centralised low-level input state (keyboard + pointer). Game code can ask
 * "is this key held?" / "was it just pressed?" without subscribing to DOM
 * events directly.
 *
 * Designed to be polled from a single place per frame. The Game calls
 * `postUpdate()` at the end of each tick to clear "just pressed/released"
 * state for the next frame.
 */
export class InputManager {
  constructor() {
    /** @type {Set<string>} */
    this._keysDown = new Set();
    /** @type {Set<string>} */
    this._keysPressed = new Set();
    /** @type {Set<string>} */
    this._keysReleased = new Set();

    this.pointer = {
      x: 0,
      y: 0,
      isDown: false,
      justPressed: false,
      justReleased: false,
    };

    /** @type {HTMLElement | null} */
    this._target = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
  }

  /**
   * Attach DOM listeners. Keyboard listens on window so it works regardless
   * of focus on the canvas.
   * @param {HTMLElement} target
   */
  attach(target) {
    this._target = target;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    target.addEventListener('pointermove', this._onPointerMove);
    target.addEventListener('pointerdown', this._onPointerDown);
    target.addEventListener('pointerup', this._onPointerUp);
    target.addEventListener('pointercancel', this._onPointerUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);

    if (this._target) {
      this._target.removeEventListener('pointermove', this._onPointerMove);
      this._target.removeEventListener('pointerdown', this._onPointerDown);
      this._target.removeEventListener('pointerup', this._onPointerUp);
      this._target.removeEventListener('pointercancel', this._onPointerUp);
      this._target = null;
    }
  }

  // ------------------------------------------------------------------
  // Public query API
  // ------------------------------------------------------------------

  isDown(code) {
    return this._keysDown.has(code);
  }

  wasPressed(code) {
    return this._keysPressed.has(code);
  }

  wasReleased(code) {
    return this._keysReleased.has(code);
  }

  /** Called by Game at end of each frame. */
  postUpdate() {
    this._keysPressed.clear();
    this._keysReleased.clear();
    this.pointer.justPressed = false;
    this.pointer.justReleased = false;
  }

  // ------------------------------------------------------------------
  // Internal handlers
  // ------------------------------------------------------------------

  _onKeyDown(e) {
    if (e.repeat) return;
    this._keysDown.add(e.code);
    this._keysPressed.add(e.code);
  }

  _onKeyUp(e) {
    this._keysDown.delete(e.code);
    this._keysReleased.add(e.code);
  }

  _onPointerMove(e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
  }

  _onPointerDown(e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.isDown = true;
    this.pointer.justPressed = true;
  }

  _onPointerUp(e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.isDown = false;
    this.pointer.justReleased = true;
  }

  _onBlur() {
    this._keysDown.clear();
    this._keysPressed.clear();
    this._keysReleased.clear();
    this.pointer.isDown = false;
  }
}
