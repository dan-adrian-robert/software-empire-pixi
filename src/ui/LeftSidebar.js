/**
 * LeftSidebar
 *
 * Vertical nav bar on the left with icon-like nav buttons.
 * Clicking a button calls onNavigate(id) in OfficeScene.
 * The active view is highlighted.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';

export const LEFT_SIDEBAR_WIDTH = 64;

const BG = 0x0d1526;
const BORDER = 0x1e2d47;
const BTN_SIZE = 48;
const BTN_R = 8;
const BTN_NORMAL = 0x131929;
const BTN_HOVER = 0x1c2d48;
const BTN_ACTIVE = 0x1e3a6e;
const BTN_ACTIVE_BORDER = 0x4a7aff;
const BTN_BORDER = 0x1e2d47;

const NAV_ITEMS = [
  { id: 'office', emoji: '🏢', label: 'Office' },
  { id: 'projects', emoji: '📋', label: 'Projects' },
  { id: 'employees', emoji: '👥', label: 'Staff' },
  { id: 'hiring', emoji: '➕', label: 'Hire' },
];

export class LeftSidebar extends Container {
  /**
   * @param {(id: string) => void} onNavigate
   */
  constructor(onNavigate) {
    super();
    this.onNavigate = onNavigate;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._activeView = 'office';
    /** @type {Array<{id:string, container:Container, bg:Graphics}>} */
    this._buttons = [];

    this._height = 600;
  }

  init(screenHeight) {
    this._height = screenHeight - TOP_BAR_HEIGHT;
    this.y = TOP_BAR_HEIGHT;
    this._drawBg();
    this._buildButtons();
  }

  resize(screenWidth, screenHeight) {
    void screenWidth;
    this._height = screenHeight - TOP_BAR_HEIGHT;
    this._drawBg();
    this._repositionButtons();
  }

  setActive(viewId) {
    this._activeView = viewId;
    this._refreshButtonStates();
  }

  // -----------------------------------------------------------------------

  _drawBg() {
    this._bg
      .clear()
      .rect(0, 0, LEFT_SIDEBAR_WIDTH, this._height)
      .fill({ color: BG })
      .moveTo(LEFT_SIDEBAR_WIDTH, 0)
      .lineTo(LEFT_SIDEBAR_WIDTH, this._height)
      .stroke({ color: BORDER, width: 1 });
  }

  _buildButtons() {
    for (const item of NAV_ITEMS) {
      const btn = this._makeButton(item);
      this._buttons.push(btn);
      this.addChild(btn.container);
    }
    this._repositionButtons();
    this._refreshButtonStates();
  }

  _makeButton({ id, emoji, label }) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics();
    container.addChild(bg);

    const icon = new Text({
      text: emoji,
      style: { fontSize: 22 },
    });
    icon.anchor.set(0.5, 0.5);
    icon.position.set(BTN_SIZE / 2, BTN_SIZE / 2 - 5);
    container.addChild(icon);

    const labelText = new Text({
      text: label,
      style: {
        fill: 0x7a86a3,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '600',
      },
    });
    labelText.anchor.set(0.5, 0);
    labelText.position.set(BTN_SIZE / 2, BTN_SIZE - 14);
    container.addChild(labelText);

    const drawBg = (active, hover) => {
      bg.clear()
        .roundRect(0, 0, BTN_SIZE, BTN_SIZE, BTN_R)
        .fill({ color: active ? BTN_ACTIVE : hover ? BTN_HOVER : BTN_NORMAL })
        .stroke({ color: active ? BTN_ACTIVE_BORDER : BTN_BORDER, width: 1 });
    };
    drawBg(false, false);

    container.on('pointerover', () => {
      if (this._activeView !== id) drawBg(false, true);
    });
    container.on('pointerout', () => {
      drawBg(this._activeView === id, false);
    });
    container.on('pointerup', () => {
      this.onNavigate(id);
    });

    return { id, container, bg, drawBg, label: labelText };
  }

  _repositionButtons() {
    const startY = 16;
    const gap = 8;
    this._buttons.forEach((btn, i) => {
      btn.container.position.set(
        (LEFT_SIDEBAR_WIDTH - BTN_SIZE) / 2,
        startY + i * (BTN_SIZE + gap),
      );
    });
  }

  _refreshButtonStates() {
    for (const btn of this._buttons) {
      btn.drawBg(btn.id === this._activeView, false);
      btn.label.style.fill = btn.id === this._activeView ? 0xe6e8ef : 0x7a86a3;
    }
  }
}
