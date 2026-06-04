/**
 * PopupShell
 *
 * Generic modal chrome built entirely from framework components — no magic
 * coordinates. Provides backdrop, centered window, header row (title + close
 * button), body slot, and optional footer.
 *
 * The shell mirrors the lifecycle API of existing popups so that future
 * migrations of EmployeeStatsPopup / TeamInfoPopup require minimal change to
 * their callers in OfficeScene.
 *
 * Usage:
 *   const popup = new PopupShell({
 *     width:   920,
 *     height:  660,
 *     title:   'Employee',
 *     onClose: () => { ... },
 *   });
 *   scene.addChild(popup);
 *   popup.open(screenW, screenH);
 *
 *   // Swap body content:
 *   popup.setBody(myColumnLayout);
 *
 *   // Update title:
 *   popup.setTitle('Project — Alpha');
 *
 * Lifecycle:
 *   open(screenW, screenH) — show and center
 *   close()                — hide
 *   resize(screenW, screenH) — re-center after screen resize
 */
import { Graphics } from 'pixi.js';
import { Component } from '../foundation/Component.js';
import { Column } from '../layouts/Column.js';
import { Row } from '../layouts/Row.js';
import { Spacer } from '../layouts/Spacer.js';
import { Label } from '../widgets/Label.js';
import { Button } from '../widgets/Button.js';
import { Panel } from '../widgets/Panel.js';
import { Divider } from '../widgets/Divider.js';
import { Theme } from '../foundation/Theme.js';

const HEADER_H = 52;
const FOOTER_H = 52;

export class PopupShell extends Component {
  /**
   * @param {object} props
   * @param {number}   props.width
   * @param {number}   props.height
   * @param {string}   [props.title]
   * @param {Function} [props.onClose]
   * @param {boolean}  [props.hasFooter]
   */
  constructor(props = {}) {
    super({
      title: '',
      hasFooter: false,
      ...props,
    });

    this.visible = false;
    this._screenW = 0;
    this._screenH = 0;

    this._buildChrome();
  }

  // ── Public lifecycle ─────────────────────────────────────────────────────────

  open(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._center();
    this.visible = true;
  }

  close() {
    this.visible = false;
    if (this.props.onClose) this.props.onClose();
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (this.visible) this._center();
    this._rebuildBackdrop();
  }

  // ── Content API ──────────────────────────────────────────────────────────────

  /**
   * Replace the body content.
   * @param {import('pixi.js').Container} child  any display object
   */
  setBody(child) {
    this._bodySlot.clearChildren();
    this._bodySlot.add(child);
  }

  /**
   * Replace the footer content.
   * @param {import('pixi.js').Container} child
   */
  setFooter(child) {
    if (this._footerSlot) {
      this._footerSlot.clearChildren();
      this._footerSlot.add(child);
    }
  }

  /** Update the popup title text. */
  setTitle(title) {
    this._titleLabel.setProps({ text: title });
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  _buildChrome() {
    const { width, height, title, hasFooter } = this.props;

    // Full-screen dim overlay
    this._backdrop = new Graphics();
    this._backdrop.eventMode = 'static';
    this._backdrop.on('pointerup', () => this.close());
    this.addChild(this._backdrop);

    // Window panel
    this._window = new Panel({
      width,
      height,
      bg: Theme.colors.bg,
      border: Theme.colors.border,
      radius: Theme.radius.lg,
    });
    this._window.eventMode = 'static';
    this._window.on('pointerdown', (e) => e.stopPropagation());
    this.addChild(this._window);

    // Header row: title | spacer | close button
    this._titleLabel = new Label({ text: title ?? '', variant: 'title' });

    const closeBtn = new Button({
      label: '✕',
      variant: 'ghost',
      width: 32,
      height: 32,
      onClick: () => this.close(),
    });

    const headerRow = new Row({
      width: width - Theme.spacing.md * 2,
      height: HEADER_H,
      gap: Theme.spacing.sm,
      align: 'center',
      padding: { horizontal: 0, vertical: 0 },
    });
    headerRow.add(this._titleLabel);
    headerRow.add(new Spacer({ flex: 1 }));
    headerRow.add(closeBtn);
    headerRow.position.set(Theme.spacing.md, 0);
    this._window.addChild(headerRow);

    // Divider under header
    const divider = new Divider({
      length: width,
      color: Theme.colors.border,
    });
    divider.position.set(0, HEADER_H);
    this._window.addChild(divider);

    // Body slot (Column that fills remaining height)
    const bodyH = height - HEADER_H - 1 - (hasFooter ? FOOTER_H + 1 : 0);
    this._bodySlot = new Column({
      width: width - Theme.spacing.md * 2,
      height: bodyH,
      gap: 0,
    });
    this._bodySlot.position.set(Theme.spacing.md, HEADER_H + 1);
    this._window.addChild(this._bodySlot);

    // Optional footer
    if (hasFooter) {
      const footerDivider = new Divider({
        length: width,
        color: Theme.colors.border,
      });
      footerDivider.position.set(0, height - FOOTER_H - 1);
      this._window.addChild(footerDivider);

      this._footerSlot = new Row({
        width: width - Theme.spacing.md * 2,
        height: FOOTER_H,
        gap: Theme.spacing.sm,
        align: 'center',
        justify: 'end',
      });
      this._footerSlot.position.set(Theme.spacing.md, height - FOOTER_H);
      this._window.addChild(this._footerSlot);
    }
  }

  _center() {
    const { width, height } = this.props;
    const x = Math.max(0, Math.round((this._screenW - width) / 2));
    const y = Math.max(0, Math.round((this._screenH - height) / 2));
    this._window.position.set(x, y);
    this._rebuildBackdrop();
  }

  _rebuildBackdrop() {
    this._backdrop
      .clear()
      .rect(0, 0, this._screenW, this._screenH)
      .fill({ color: Theme.colors.bgOverlay, alpha: Theme.backdropAlpha });
  }
}
