/**
 * EmployeeEntity
 *
 * Visual representation of an employee sitting at a desk.
 * Uses a characterN.png portrait cropped to the top half so that the
 * head/shoulders appear above the desk surface.
 *
 * The name label is rendered BELOW the desk (offset ~148px below entity origin).
 * Call `setOnClick(cb)` to make the entity interactive.
 */
import { Entity } from './Entity.js';
import { Container, Rectangle, Sprite, Text } from 'pixi.js';
import { getCharacterTopHalf } from '../utils/characterSprite.js';
import { SCHEDULE_LOGO_FRAMES, WARNING_LOGO_FRAME } from '../data/scheduleActivities.js';
import { getUiLogoTex } from '../utils/uiLogoSprite.js';

const POINTS_LABEL_START_Y = 70; // below body, floats upward during fade

// Display width for the character sprite. Height is derived from the crop ratio.
const PERSON_W = 64;

// How far below the entity origin the name label sits.
// Entity origin = py + 52. Desk bottom = py + 128.
// Label offset = 128 - 52 + 16 = 92 → name at 16px below desk bottom.
const NAME_OFFSET_Y = 92;

// Display size of head icon sprites in pixels (height-based scale).
const ICON_SIZE = 18;
// Gap in pixels between adjacent head icons.
const ICON_GAP = 4;


export class EmployeeEntity extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} [name]
   * @param {number} [characterIndex]  1-based portrait index (characterN.png).
   */
  constructor(x, y, name = '', characterIndex = 1) {
    super({ x, y, width: PERSON_W, height: PERSON_W, color: 0x000000 });
    this._placeholder.clear();

    this._state = 'idle';
    this._name = name;
    this._hasProject = false;
    this._scheduleState = 'WORK'; // ScheduleActivity.WORK

    this._sprite = new Sprite(getCharacterTopHalf(characterIndex));
    this._sprite.anchor.set(0.5, 1);
    // Scale so the display width matches PERSON_W
    const scale = PERSON_W / this._sprite.texture.width;
    this._sprite.scale.set(scale);
    const spriteDisplayH = this._sprite.texture.height * scale;
    // Align sprite bottom with the desk line (~60px from entity origin)
    this._sprite.position.set(PERSON_W / 2, 60);

    // Icon bar — horizontally centered row of status icons above the sprite's top.
    // Icons are laid out in a fixed slot order; each slot is a Sprite that can
    // be hidden when it does not apply.  Slots (left → right): noProject, schedule.
    this._iconNoProject = this._makeIconSprite(WARNING_LOGO_FRAME);
    this._iconSchedule  = this._makeIconSprite(SCHEDULE_LOGO_FRAMES.WORK);
    this._headIconBar = new Container();
    this._headIconBar.addChild(this._iconNoProject);
    this._headIconBar.addChild(this._iconSchedule);
    // Baseline Y: same position the old single icon used.
    this._headIconBarY = 60 - spriteDisplayH - 2;
    this._headIconBar.position.set(0, this._headIconBarY);

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
    this.view.addChild(this._headIconBar);
    this.view.addChild(this._nameLabel);

    // Expand hit area to make the character easier to click.
    this.view.hitArea = new Rectangle(-16, -16, PERSON_W + 32, spriteDisplayH + 32);

    // Initial icon layout.
    this._refreshHeadIcons();
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

  /** @param {'WORK'|'BATHROOM_BREAK'|'TALK'} state */
  setScheduleState(state) {
    if (this._scheduleState === state) return;
    this._scheduleState = state;
    this._refreshHeadIcons();
  }

  /**
   * When false, a warning icon is shown above the employee's head alongside
   * the schedule icon.  When true only the schedule icon is shown.
   * @param {boolean} hasProject
   */
  setHasProject(hasProject) {
    if (this._hasProject === hasProject) return;
    this._hasProject = hasProject;
    this._refreshHeadIcons();
  }

  /** Creates a fixed-size Sprite for a logo frame, anchored top-left. */
  _makeIconSprite(frameId) {
    const tex = getUiLogoTex(frameId);
    const sprite = tex ? new Sprite(tex) : new Sprite();
    sprite.anchor.set(0, 1);
    // Scale uniformly so the sprite displays at ICON_SIZE px height.
    if (tex) {
      const scale = ICON_SIZE / tex.height;
      sprite.scale.set(scale);
    }
    return sprite;
  }

  /**
   * Recomputes the head icon bar.
   *
   * Active slots (left → right):
   *   1. noProject  – visible when !_hasProject
   *   2. schedule   – always visible
   *
   * Icons are horizontally centered over the sprite using PERSON_W as the
   * reference width.  Adding future slots only requires extending this method.
   */
  _refreshHeadIcons() {
    const scheduleFrame = SCHEDULE_LOGO_FRAMES[this._scheduleState];
    const scheduleTex   = scheduleFrame ? getUiLogoTex(scheduleFrame) : null;
    if (scheduleTex) {
      this._iconSchedule.texture = scheduleTex;
      const scale = ICON_SIZE / scheduleTex.height;
      this._iconSchedule.scale.set(scale);
    }

    this._iconNoProject.visible = !this._hasProject;
    this._iconSchedule.visible  = true;

    // Collect visible icons in slot order.
    const visible = [this._iconNoProject, this._iconSchedule].filter((t) => t.visible);

    if (visible.length === 0) return;

    // Measure each icon's rendered width (Pixi updates this synchronously).
    const widths = visible.map((t) => t.width);
    const totalW = widths.reduce((s, w) => s + w, 0) + ICON_GAP * (visible.length - 1);

    // Lay out left-to-right, centering the row on PERSON_W / 2.
    let x = PERSON_W / 2 - totalW / 2;
    visible.forEach((icon, i) => {
      icon.position.set(x, 0);
      x += widths[i] + ICON_GAP;
    });
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
