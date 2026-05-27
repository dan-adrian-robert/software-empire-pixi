/**
 * EmployeeEntity
 *
 * Visual representation of an employee sitting at a desk.
 * Uses the character1.png portrait cropped to the top half so that the
 * head/shoulders appear above the desk surface.
 *
 * The name label is rendered BELOW the desk (offset ~148px below entity origin).
 * Call `setOnClick(cb)` to make the entity interactive.
 */
import { Entity } from './Entity.js';
import { Rectangle, Sprite, Text } from 'pixi.js';
import { getCharacterTopHalf } from '../utils/characterSprite.js';

const POINTS_LABEL_START_Y = 70; // below body, floats upward during fade

// Display width for the character sprite. Height is derived from the crop ratio.
const PERSON_W = 56;

// How far below the entity origin the desk bottom edge sits.
// Entity is spawned 40px above the desk (y - 40), and DESK_H = 100.
const NAME_OFFSET_Y = 148; // ≈ below desk bottom

const SCHEDULE_ICONS = { WORK: '💻', BREAK: '☕', TALK: '💬' };
const WARNING_ICON = '⚠️';


export class EmployeeEntity extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} [name]
   */
  constructor(x, y, name = '') {
    super({ x, y, width: PERSON_W, height: PERSON_W, color: 0x000000 });
    this._placeholder.clear();

    this._state = 'idle';
    this._name = name;
    this._hasProject = false;
    this._scheduleState = 'WORK';

    // Character portrait — top half of character1.png
    this._sprite = new Sprite(getCharacterTopHalf());
    this._sprite.anchor.set(0.5, 1);
    // Scale so the display width matches PERSON_W
    const scale = PERSON_W / this._sprite.texture.width;
    this._sprite.scale.set(scale);
    const spriteDisplayH = this._sprite.texture.height * scale;
    // Align sprite bottom with the desk line (~60px from entity origin)
    this._sprite.position.set(PERSON_W / 2, 60);

    // Schedule state icon — shown above the sprite's top
    this._stateIcon = new Text({
      text: SCHEDULE_ICONS.WORK,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 21,
      },
    });
    this._stateIcon.anchor.set(0.5, 1);
    this._stateIcon.position.set(PERSON_W / 2, 60 - spriteDisplayH - 2);

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

    /** @type {Text|null} Floating "+N pts" label shown at end of WORK period. */
    this._pointsLabel = null;

    this.view.addChild(this._sprite);
    this.view.addChild(this._stateIcon);
    this.view.addChild(this._nameLabel);

    // Expand hit area to make the character easier to click.
    this.view.hitArea = new Rectangle(-16, -16, PERSON_W + 32, spriteDisplayH + 32);
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
    this._state = state;
  }

  /** @param {'WORK'|'BREAK'|'TALK'} state */
  setScheduleState(state) {
    this._scheduleState = state;
    this._updateStateIcon();
  }

  /**
   * When false, a warning sign is shown above the employee's head
   * instead of the normal schedule icon.
   * @param {boolean} hasProject
   */
  setHasProject(hasProject) {
    if (this._hasProject === hasProject) return;
    this._hasProject = hasProject;
    this._updateStateIcon();
  }

  _updateStateIcon() {
    const icon = this._hasProject
      ? (SCHEDULE_ICONS[this._scheduleState] ?? '')
      : WARNING_ICON;
    if (this._stateIcon.text === icon) return;
    this._stateIcon.text = icon;
  }

  /**
   * Show a floating "+N pts" label that fades out over ~1 second.
   * @param {number} points
   */
  showPoints(points) {
    // Remove any existing label still animating.
    if (this._pointsLabel) {
      this.view.removeChild(this._pointsLabel);
      this._pointsLabel = null;
    }

    const label = new Text({
      text: `+${Math.round(points)} pts`,
      style: {
        fill:       0x4ade80,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   13,
        fontWeight: '700',
      },
    });
    label.anchor.set(0.5, 0);
    label.position.set(PERSON_W / 2, POINTS_LABEL_START_Y);
    label.alpha = 1;
    this.view.addChild(label);
    this._pointsLabel = label;
  }

  update(dt) {
    if (this._pointsLabel) {
      this._pointsLabel.alpha -= dt / 2;
      this._pointsLabel.y    -= dt * 20;
      if (this._pointsLabel.alpha <= 0) {
        this.view.removeChild(this._pointsLabel);
        this._pointsLabel = null;
      }
    }
  }
}
