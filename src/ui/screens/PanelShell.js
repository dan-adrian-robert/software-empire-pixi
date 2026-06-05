/**
 * PanelShell
 *
 * A dynamically-sized modal shell aware of the HUD height, matching the sizing
 * logic of the legacy Modal.js. Provides a backdrop (below the top bar),
 * a rounded window with a title header, and a swappable body slot.
 *
 * Unlike PopupShell, the window dimensions are computed from the screen size on
 * each open() / resize() call rather than fixed at construction time.
 *
 * Usage:
 *   const shell = new PanelShell({ onClose: () => {}, topBarHeight: 82 });
 *   scene.addChild(shell);
 *   shell.setBody(myScrollColumn);
 *
 *   shell.open(screenW, screenH);   // computes window size, shows
 *   shell.setTitle('Employees');
 *   shell.close();
 *   shell.resize(screenW, screenH); // re-centers and re-sizes
 *
 * After open() / resize(), read bodyWidth / bodyHeight for the usable area.
 *
 * Lifecycle mirrors legacy Modal so OfficeScene callers need no changes.
 */
import { Graphics } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Row } from '../layouts/Row.js';
import { Spacer } from '../layouts/Spacer.js';
import { Label } from '../widgets/Label.js';
import { Button } from '../widgets/Button.js';
import { Theme } from '../foundation/Theme.js';

const HEADER_H = 52;
const PADDING = 16;
const RADIUS = 10;

export class PanelShell extends Component {
  /**
   * @param {object}   [props]
   * @param {Function} [props.onClose]       called after close()
   * @param {number}   [props.topBarHeight]  pixels reserved by the top HUD (default 82)
   */
  constructor(props = {}) {
    super({ topBarHeight: 82, ...props });

    this.visible = false;
    this._screenW = 0;
    this._screenH = 0;
    this._bodyW = 0;
    this._bodyH = 0;
    this._body = null;
    /** @type {'default'|'hiring'} */
    this._layoutPreset = 'default';

    this._buildChrome();
  }

  /** @param {'default'|'hiring'} preset */
  setLayoutPreset(preset) {
    this._layoutPreset = preset ?? 'default';
    if (this.visible) this._layout();
  }

  // ── Public lifecycle ─────────────────────────────────────────────────────────

  /** Compute window size from screen, show the shell. */
  open(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._layout();
    this.visible = true;
  }

  close() {
    this.visible = false;
    if (this.props.onClose) this.props.onClose();
  }

  /** Re-center and resize after a screen dimension change. */
  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (this.visible) this._layout();
  }

  // ── Content API ──────────────────────────────────────────────────────────────

  /** Replace the body content. The previous body is removed from the window. */
  setBody(child) {
    if (this._body && this._body.parent === this._win) {
      this._win.removeChild(this._body);
    }
    this._body = child;
    this._win.addChild(this._body);
    this._positionBody();
  }

  /** Update the title text. */
  setTitle(title) {
    this._titleLabel.setProps({ text: title });
  }

  /** Usable body width — valid after the first open() or resize(). */
  get bodyWidth() { return this._bodyW; }

  /** Usable body height — valid after the first open() or resize(). */
  get bodyHeight() { return this._bodyH; }

  // ── Internals ────────────────────────────────────────────────────────────────

  _buildChrome() {
    // Backdrop — covers only the area below the top bar
    this._backdrop = new Graphics();
    this._backdrop.eventMode = 'static';
    this._backdrop.on('pointerup', () => this.close());
    this.addChild(this._backdrop);

    // Window container — blocks pointer events from reaching backdrop
    this._win = new Component();
    this._win.eventMode = 'static';
    this._win.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(this._win);

    // Window background (redrawn on each layout pass)
    this._winBg = new Graphics();
    this._win.addChild(this._winBg);

    // Header divider line (redrawn on each layout pass)
    this._headerLine = new Graphics();
    this._win.addChild(this._headerLine);

    // Title label
    this._titleLabel = new Label({ text: '', variant: 'title' });

    // Close button
    const closeBtn = new Button({
      label: '✕',
      variant: 'ghost',
      width: 32,
      height: 32,
      onClick: () => this.close(),
    });

    // Header row — width is set during _layout()
    this._headerRow = new Row({
      height: HEADER_H,
      gap: Theme.spacing.sm,
      align: 'center',
    });
    this._headerRow.add(this._titleLabel);
    this._headerRow.add(new Spacer({ flex: 1 }));
    this._headerRow.add(closeBtn);
    this._win.addChild(this._headerRow);
  }

  _layout() {
    const topH = this.props.topBarHeight;
    const availH = this._screenH - topH;

    let winW;
    let winH;
    if (this._layoutPreset === 'hiring') {
      winW = Math.max(640, Math.min(920, this._screenW - 120));
      winH = Math.max(320, Math.min(520, Math.round(availH * 0.52)));
    } else {
      winW = Math.max(480, Math.min(860, this._screenW - 160));
      winH = Math.round(availH * 0.86);
    }

    this._bodyW = winW - PADDING * 2;
    this._bodyH = winH - HEADER_H - PADDING * 2;

    const winX = Math.round((this._screenW - winW) / 2);
    const winY = topH + Math.round((availH - winH) / 2);

    // Backdrop — only the area below the HUD strip
    this._backdrop
      .clear()
      .rect(0, topH, this._screenW, this._screenH - topH)
      .fill({ color: Theme.colors.bgOverlay, alpha: Theme.backdropAlpha });

    // Window chrome
    this._winBg
      .clear()
      .roundRect(0, 0, winW, winH, RADIUS)
      .fill({ color: Theme.colors.bg })
      .stroke({ color: Theme.colors.border, width: 1.5 });

    this._headerLine
      .clear()
      .moveTo(0, HEADER_H)
      .lineTo(winW, HEADER_H)
      .stroke({ color: Theme.colors.divider, width: 1 });

    // Header row width drives flex spacer sizing
    this._headerRow.setProps({ width: winW - PADDING * 2 });
    this._headerRow.position.set(PADDING, 0);

    this._win.position.set(winX, winY);
    this._positionBody();
  }

  _positionBody() {
    if (this._body) {
      this._body.position.set(PADDING, HEADER_H + PADDING);
    }
  }
}
