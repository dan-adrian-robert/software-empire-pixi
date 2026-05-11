/**
 * Modal
 *
 * A floating popup that sits over the office world without replacing it.
 * Hosts any panel (ProjectsPanel, EmployeesPanel, HiringPanel) inside a
 * scrollable, masked content area.
 *
 * Usage:
 *   modal.open(title, panel, screenWidth, screenHeight)  – shows
 *   modal.close()                                        – hides
 *   modal.resize(w, h)                                   – on screen resize
 *   modal.handleWheel(deltaY)                            – from canvas wheel event
 *   modal.refresh()                                      – forward to active panel
 */
import { Container, Graphics, Text } from 'pixi.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';

const TITLE_H = 46;
const PADDING = 16;
const RADIUS = 10;

const BG = 0x0d1526;
const BORDER = 0x1e3050;
const DIVIDER = 0x1a2a44;
const BACKDROP_COLOR = 0x000000;
const BACKDROP_ALPHA = 0.6;

const TITLE_COLOR = 0xe6e8ef;
const CLOSE_BG = 0x151f35;
const CLOSE_HOVER = 0x2a3a5a;
const CLOSE_ICON = 0x8090b0;
const CLOSE_ICON_HOVER = 0xe6e8ef;

export class Modal extends Container {
  /**
   * @param {() => void} onClose  Called after the modal hides itself (backdrop/X click).
   */
  constructor(onClose) {
    super();
    this.onClose = onClose;
    this.visible = false;
    this.sortableChildren = false;

    // --- Backdrop ---
    this._backdrop = new Graphics();
    this._backdrop.eventMode = 'static';
    this._backdrop.cursor = 'default';
    this._backdrop.on('pointerdown', () => this.close());
    this.addChild(this._backdrop);

    // --- Modal window ---
    this._win = new Container();
    // Block backdrop pointerdown from firing when clicking inside the window.
    this._win.eventMode = 'static';
    this._win.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(this._win);

    this._winBg = new Graphics();
    this._win.addChild(this._winBg);

    // Title text
    this._titleLabel = new Text({
      text: '',
      style: {
        fill: TITLE_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 15,
        fontWeight: '700',
      },
    });
    this._titleLabel.anchor.set(0, 0.5);
    this._win.addChild(this._titleLabel);

    // Close button
    this._closeBtn = this._buildCloseButton();
    this._win.addChild(this._closeBtn);

    // Scrollable content
    this._contentContainer = new Container();
    this._contentMask = new Graphics();
    this._win.addChild(this._contentMask);
    this._win.addChild(this._contentContainer);
    this._contentContainer.mask = this._contentMask;

    this._scrollOffset = 0;
    this._activePanel = null;
    this._modalW = 0;
    this._modalH = 0;
    this._contentW = 0;
    this._contentH = 0;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Open the modal showing the given panel.
   * @param {string} title
   * @param {import('pixi.js').Container} panel  Must implement init(x, y, w, h).
   * @param {number} screenWidth
   * @param {number} screenHeight
   */
  open(title, panel, screenWidth, screenHeight) {
    this._teardown();
    this._titleLabel.text = title;
    this._activePanel = panel;
    this._scrollOffset = 0;

    this._layout(screenWidth, screenHeight);
    panel.init(0, 0, this._contentW, this._contentH);
    this._contentContainer.addChild(panel);
    this._applyScroll();

    this.visible = true;
  }

  close() {
    if (!this.visible) return;
    this._teardown();
    this.visible = false;
    this.onClose?.();
  }

  resize(screenWidth, screenHeight) {
    if (!this.visible) return;
    this._layout(screenWidth, screenHeight);
    if (this._activePanel?.resize) {
      this._activePanel.resize(0, 0, this._contentW, this._contentH);
    }
    this._applyScroll();
  }

  /** Forward scroll-wheel delta to the content area. */
  handleWheel(deltaY) {
    if (!this.visible) return;
    this._scrollOffset = Math.min(0, this._scrollOffset - deltaY * 0.5);
    this._applyScroll();
  }

  /** Refresh the hosted panel (called from OfficeScene update loop). */
  refresh() {
    if (this.visible && this._activePanel?.refresh) {
      this._activePanel.refresh();
    }
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  _teardown() {
    this._contentContainer.removeChildren();
    this._activePanel = null;
    this._scrollOffset = 0;
  }

  _layout(screenW, screenH) {
    const availH = screenH - TOP_BAR_HEIGHT;

    this._modalW = Math.max(480, Math.min(860, screenW - 160));
    this._modalH = Math.round(availH * 0.86);

    const winX = Math.round((screenW - this._modalW) / 2);
    const winY = TOP_BAR_HEIGHT + Math.round((availH - this._modalH) / 2);

    this._contentW = this._modalW - PADDING * 2;
    this._contentH = this._modalH - TITLE_H - PADDING * 2;

    // Backdrop
    this._backdrop
      .clear()
      .rect(0, TOP_BAR_HEIGHT, screenW, screenH - TOP_BAR_HEIGHT)
      .fill({ color: BACKDROP_COLOR, alpha: BACKDROP_ALPHA });

    // Window position
    this._win.position.set(winX, winY);

    // Window background + title divider
    this._winBg
      .clear()
      .roundRect(0, 0, this._modalW, this._modalH, RADIUS)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 })
      .moveTo(0, TITLE_H)
      .lineTo(this._modalW, TITLE_H)
      .stroke({ color: DIVIDER, width: 1 });

    // Title label
    this._titleLabel.position.set(PADDING + 4, TITLE_H / 2);

    // Close button (top-right)
    this._closeBtn.position.set(this._modalW - 36 - 8, (TITLE_H - 30) / 2);

    // Content mask
    this._contentMask
      .clear()
      .rect(PADDING, TITLE_H + PADDING, this._contentW, this._contentH)
      .fill({ color: 0xffffff });

    // Content container X is fixed; Y is controlled by _applyScroll
    this._contentContainer.x = PADDING;
  }

  _applyScroll() {
    this._contentContainer.y = TITLE_H + PADDING + this._scrollOffset;
  }

  _buildCloseButton() {
    const W = 30;
    const H = 30;
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, W, H, 6)
      .fill({ color: CLOSE_BG });
    container.addChild(bg);

    const icon = new Text({
      text: '✕',
      style: {
        fill: CLOSE_ICON,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: '700',
      },
    });
    icon.anchor.set(0.5);
    icon.position.set(W / 2, H / 2);
    container.addChild(icon);

    container.on('pointerover', () => {
      bg.clear().roundRect(0, 0, W, H, 6).fill({ color: CLOSE_HOVER });
      icon.style.fill = CLOSE_ICON_HOVER;
    });
    container.on('pointerout', () => {
      bg.clear().roundRect(0, 0, W, H, 6).fill({ color: CLOSE_BG });
      icon.style.fill = CLOSE_ICON;
    });
    container.on('pointerup', () => this.close());

    return container;
  }
}
