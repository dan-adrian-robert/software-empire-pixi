/**
 * LiveActivityPanel
 *
 * Right sidebar that shows recent notification entries from
 * game.sim.notifications.notifications[].
 * Rebuilt each `refresh()` call (at most a few times per second is fine).
 */
import { Container, Graphics, Text } from 'pixi.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';

export const RIGHT_SIDEBAR_WIDTH = 260;

const BG = 0x0d1526;
const BORDER = 0x1e2d47;
const ROW_H = 36;
const ROW_GAP = 2;
const PADDING = 10;

const TYPE_COLORS = {
  info: 0x6b7fa3,
  success: 0x4ade80,
  warning: 0xfbbf24,
  critical: 0xf87171,
};
const TYPE_BG = {
  info: 0x12192d,
  success: 0x0f1f14,
  warning: 0x1f1800,
  critical: 0x1f0000,
};

export class LiveActivityPanel extends Container {
  /**
   * @param {import('../Game.js').Game} game
   */
  constructor(game) {
    super();
    this.game = game;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._header = null;
    this._rowContainer = new Container();
    this.addChild(this._rowContainer);

    this._height = 600;
    this._lastCount = -1;
  }

  init(screenWidth, screenHeight) {
    this._screenWidth = screenWidth;
    this._height = screenHeight - TOP_BAR_HEIGHT;
    this.x = screenWidth - RIGHT_SIDEBAR_WIDTH;
    this.y = TOP_BAR_HEIGHT;
    this._drawBg();
    this._buildHeader();
    this.refresh(true);
  }

  resize(screenWidth, screenHeight) {
    this._screenWidth = screenWidth;
    this._height = screenHeight - TOP_BAR_HEIGHT;
    this.x = screenWidth - RIGHT_SIDEBAR_WIDTH;
    this._drawBg();
    this.refresh(true);
  }

  /** Call every frame (or on notification events) to keep rows current. */
  refresh(force = false) {
    const notifs = this.game.sim?.notifications.notifications ?? [];
    if (!force && notifs.length === this._lastCount) return;
    this._lastCount = notifs.length;
    this._buildRows(notifs);
  }

  // -----------------------------------------------------------------------

  _drawBg() {
    this._bg
      .clear()
      .rect(0, 0, RIGHT_SIDEBAR_WIDTH, this._height)
      .fill({ color: BG })
      .moveTo(0, 0)
      .lineTo(0, this._height)
      .stroke({ color: BORDER, width: 1 });
  }

  _buildHeader() {
    this._header = new Text({
      text: 'Activity',
      style: {
        fill: 0x7a86a3,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
      },
    });
    this._header.position.set(PADDING, 10);
    this.addChild(this._header);
  }

  _buildRows(notifs) {
    this._rowContainer.removeChildren();
    const maxRows = Math.floor((this._height - 30) / (ROW_H + ROW_GAP));
    const visible = notifs.slice(0, maxRows);

    visible.forEach((n, i) => {
      const y = 28 + i * (ROW_H + ROW_GAP);
      const rowBg = new Graphics()
        .rect(PADDING / 2, 0, RIGHT_SIDEBAR_WIDTH - PADDING, ROW_H)
        .fill({ color: TYPE_BG[n.type] ?? TYPE_BG.info });
      rowBg.y = y;
      this._rowContainer.addChild(rowBg);

      const dot = new Graphics()
        .circle(0, 0, 4)
        .fill({ color: TYPE_COLORS[n.type] ?? TYPE_COLORS.info });
      dot.position.set(PADDING + 4, y + ROW_H / 2);
      this._rowContainer.addChild(dot);

      const label = new Text({
        text: n.text,
        style: {
          fill: 0xc8d4ed,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          wordWrap: true,
          wordWrapWidth: RIGHT_SIDEBAR_WIDTH - PADDING * 2 - 16,
          lineHeight: 14,
        },
      });
      label.position.set(PADDING + 14, y + 4);
      this._rowContainer.addChild(label);
    });
  }
}
