/**
 * BuildToggleButton
 *
 * A floating "Build" button shown in the bottom-left of the office floor
 * (above the sidebar's save button area). Toggles build mode on/off.
 *
 * Usage:
 *   btn.init(screenWidth, screenHeight)
 *   btn.resize(screenWidth, screenHeight)
 *   btn.setActive(bool)
 *   btn.setOnToggle(() => …)
 */
import { Container, Graphics, Text } from 'pixi.js';
import { LEFT_SIDEBAR_WIDTH } from './LeftSidebar.js';

const BTN_W = 72;
const BTN_H = 36;
const BTN_R = 8;

const BG_NORMAL  = 0x0d1a2e;
const BG_ACTIVE  = 0x1a3a6a;
const BG_HOVER   = 0x152840;
const BORDER_NORMAL = 0x2a4060;
const BORDER_ACTIVE = 0x4a9eff;
const TEXT_NORMAL   = 0x8090b0;
const TEXT_ACTIVE   = 0xe6e8ef;

export class BuildToggleButton extends Container {
  constructor() {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this._active = false;
    this._onToggle = null;

    this._screenW = 800;
    this._screenH = 600;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._icon = new Text({
      text: '🔨',
      style: { fontSize: 14 },
    });
    this._icon.anchor.set(0.5, 0.5);
    this._icon.position.set(18, BTN_H / 2);
    this.addChild(this._icon);

    this._label = new Text({
      text: 'Build',
      style: {
        fill: TEXT_NORMAL,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
      },
    });
    this._label.anchor.set(0, 0.5);
    this._label.position.set(32, BTN_H / 2);
    this.addChild(this._label);

    this._drawBg(false);

    this.on('pointerover',  () => { if (!this._active) this._drawBg(true); });
    this.on('pointerout',   () => { if (!this._active) this._drawBg(false); });
    this.on('pointerup',    () => { this._onToggle?.(); });
  }

  // ---------------------------------------------------------------------------

  /** @param {() => void} fn */
  setOnToggle(fn) { this._onToggle = fn; }

  setActive(active) {
    this._active = active;
    this._drawBg(false);
    this._label.style.fill = active ? TEXT_ACTIVE : TEXT_NORMAL;
  }

  init(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._reposition();
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._reposition();
  }

  // ---------------------------------------------------------------------------

  _reposition() {
    this.position.set(LEFT_SIDEBAR_WIDTH + 12, this._screenH - BTN_H - 12);
  }

  _drawBg(hover) {
    const bg   = this._active ? BG_ACTIVE   : hover ? BG_HOVER  : BG_NORMAL;
    const bord = this._active ? BORDER_ACTIVE : BORDER_NORMAL;
    this._bg
      .clear()
      .roundRect(0, 0, BTN_W, BTN_H, BTN_R)
      .fill({ color: bg })
      .stroke({ color: bord, width: 1.5 });
  }
}
