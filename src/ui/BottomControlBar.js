/**
 * BottomControlBar
 *
 * Fixed bottom strip with time-control buttons and a day-progress bar.
 * Buttons: Pause | 1x | 4x | 16x | End Day
 */
import { Container, Graphics, Text } from 'pixi.js';
import { GameConfig } from '../config.js';

export const BOTTOM_BAR_HEIGHT = 56;

const BG = 0x0d1526;
const BORDER = 0x1e2d47;
const BTN_W = 72;
const BTN_H = 36;
const BTN_R = 6;
const BTN_NORMAL = 0x1c2740;
const BTN_ACTIVE = 0x2a4a8a;
const BTN_HOVER = 0x253352;
const BTN_END = 0x1a3a1a;
const BTN_END_HOVER = 0x254a25;
const BTN_SAVE = 0x1a2d4a;
const BTN_SAVE_HOVER = 0x25405a;
const BTN_SAVE_W = 88;
const BTN_BORDER = 0x2e4070;
const BTN_ACTIVE_BORDER = 0x4a7aff;
const TEXT_COLOR = 0xc8d4ed;
const TEXT_ACTIVE = 0xffffff;
const PROGRESS_TRACK = 0x1a2336;
const PROGRESS_FILL = 0x3b82f6;

export class BottomControlBar extends Container {
  /**
   * @param {import('../Game.js').Game} game
   */
  constructor(game) {
    super();
    this.game = game;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._progressTrack = new Graphics();
    this._progressFill = new Graphics();
    this.addChild(this._progressTrack);
    this.addChild(this._progressFill);

    /** @type {Array<{speed: number, btn: Container, bg: Graphics, label: Text}>} */
    this._speedBtns = [];
    this._endDayBtn = null;
    this._saveBtn   = null;

    this._screenWidth = 0;
  }

  init(screenWidth, screenHeight) {
    this._screenWidth = screenWidth;
    this._screenHeight = screenHeight;
    this.y = screenHeight - BOTTOM_BAR_HEIGHT;
    this._drawBg();
    this._buildButtons();
    this._drawProgress(0);
  }

  resize(screenWidth, screenHeight) {
    this._screenWidth = screenWidth;
    this._screenHeight = screenHeight;
    this.y = screenHeight - BOTTOM_BAR_HEIGHT;
    this._drawBg();
    this._repositionButtons();
    this._drawProgress(this.game.sim?.time.dayProgress ?? 0);
  }

  /** Called each frame. */
  update() {
    const progress = this.game.sim?.time.dayProgress ?? 0;
    this._drawProgress(progress);
    this._updateActiveButton();
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  _drawBg() {
    const W = this._screenWidth;
    this._bg
      .clear()
      .rect(0, 0, W, BOTTOM_BAR_HEIGHT)
      .fill({ color: BG })
      .moveTo(0, 0)
      .lineTo(W, 0)
      .stroke({ color: BORDER, width: 1 });
  }

  _drawProgress(value) {
    const W = this._screenWidth;
    const PH = 4;
    const PY = BOTTOM_BAR_HEIGHT - PH;

    this._progressTrack.clear().rect(0, PY, W, PH).fill({ color: PROGRESS_TRACK });

    const fillW = Math.max(0, W * value);
    this._progressFill.clear();
    if (fillW > 0) {
      this._progressFill.rect(0, PY, fillW, PH).fill({ color: PROGRESS_FILL });
    }
  }

  _buildButtons() {
    const speeds = [
      { speed: 0, label: '⏸' },
      { speed: 1, label: '1×' },
      { speed: 4, label: '4×' },
      { speed: 16, label: '16×' },
    ];

    for (const { speed, label } of speeds) {
      const entry = this._makeButton(label, () => {
        this.game.sim.setSpeed(speed);
        this._updateActiveButton();
      });
      entry.speed = speed;
      this._speedBtns.push(entry);
      this.addChild(entry.container);
    }

    const endEntry = this._makeButton('End Day', () => {
      this.game.sim.endDay();
    }, BTN_END, BTN_END_HOVER, 88);
    this._endDayBtn = endEntry;
    this.addChild(endEntry.container);

    const saveEntry = this._makeButton('💾 Save', () => {
      this.game.saveGame();
    }, BTN_SAVE, BTN_SAVE_HOVER, BTN_SAVE_W);
    this._saveBtn = saveEntry;
    this.addChild(saveEntry.container);

    this._repositionButtons();
  }

  _makeButton(label, onClick, bgNormal = BTN_NORMAL, bgHover = BTN_HOVER, width = BTN_W) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics();
    container.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fill: TEXT_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '600',
      },
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, BTN_H / 2);
    container.addChild(text);

    const drawBg = (hover) => {
      bg.clear()
        .roundRect(0, 0, width, BTN_H, BTN_R)
        .fill({ color: hover ? bgHover : bgNormal })
        .stroke({ color: BTN_BORDER, width: 1 });
    };
    drawBg(false);

    container.on('pointerover', () => drawBg(true));
    container.on('pointerout', () => drawBg(false));
    container.on('pointerup', () => {
      drawBg(false);
      onClick();
    });

    return { container, bg, label: text, bgNormal, bgHover, speed: -1, width };
  }

  _repositionButtons() {
    const centerX = this._screenWidth / 2;
    const totalSpeedW = this._speedBtns.length * (BTN_W + 8) - 8;
    const endW = 88;
    const gap = 16;
    const totalW = totalSpeedW + gap + endW;
    let x = centerX - totalW / 2;
    const y = (BOTTOM_BAR_HEIGHT - BTN_H) / 2 - 2;

    for (const entry of this._speedBtns) {
      entry.container.position.set(x, y);
      x += BTN_W + 8;
    }

    x += gap - 8;
    if (this._endDayBtn) {
      this._endDayBtn.container.position.set(x, y);
    }

    // Save button: pinned to the right edge.
    if (this._saveBtn) {
      this._saveBtn.container.position.set(
        this._screenWidth - BTN_SAVE_W - 14,
        y,
      );
    }
  }

  _updateActiveButton() {
    const currentSpeed = this.game.sim?.time.gameSpeed ?? 0;
    for (const entry of this._speedBtns) {
      const isActive = entry.speed === currentSpeed;
      entry.bg
        .clear()
        .roundRect(0, 0, BTN_W, BTN_H, BTN_R)
        .fill({ color: isActive ? BTN_ACTIVE : entry.bgNormal })
        .stroke({ color: isActive ? BTN_ACTIVE_BORDER : BTN_BORDER, width: 1 });
      entry.label.style.fill = isActive ? TEXT_ACTIVE : TEXT_COLOR;
    }
  }
}
