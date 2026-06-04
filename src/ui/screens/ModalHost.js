/**
 * ModalHost
 *
 * Drop-in replacement for the legacy Modal.js with the same public API:
 *
 *   host.open(title, panel, screenW, screenH)
 *   host.close()
 *   host.resize(screenW, screenH)
 *   host.handleWheel(deltaY)
 *   host.refresh()
 *
 * Internally it composes PanelShell (chrome + HUD-aware backdrop) and
 * ScrollColumn (masked vertical scroll). Panels still use the legacy
 * init(x, y, w, h) / resize(x, y, w, h) / refresh() contract so they
 * can be migrated one at a time without touching OfficeScene.
 */
import { Container } from 'pixi.js';
import { PanelShell } from './PanelShell.js';
import { ScrollColumn } from '../layouts/ScrollColumn.js';
import { TOP_BAR_HEIGHT } from '../TopBarHUD.js';

export class ModalHost extends Container {
  /**
   * @param {() => void} [onClose]  called after the modal hides itself
   */
  constructor(onClose) {
    super();

    this.visible   = false;
    this._onClose  = onClose;
    this._activePanel = null;

    this._shell = new PanelShell({
      topBarHeight: TOP_BAR_HEIGHT,
      onClose: () => this._handleClose(),
    });

    this._scroll = new ScrollColumn({ width: 0, height: 0 });
    this._shell.setBody(this._scroll);

    this.addChild(this._shell);
  }

  // ── Public API (matches legacy Modal) ────────────────────────────────────────

  /**
   * Open the modal hosting the given panel.
   * @param {string} title
   * @param {import('pixi.js').Container} panel  must implement init(x,y,w,h)
   * @param {number} screenWidth
   * @param {number} screenHeight
   */
  open(title, panel, screenWidth, screenHeight) {
    this._teardown();

    this._shell.setTitle(title);
    this._shell.open(screenWidth, screenHeight);
    this.visible = true;

    const bw = this._shell.bodyWidth;
    const bh = this._shell.bodyHeight;

    this._scroll.setProps({ width: bw, height: bh });
    this._scroll.resetScroll();

    panel.init(0, 0, bw, bh);
    this._scroll.addContent(panel);
    this._activePanel = panel;
  }

  close() {
    if (!this._shell.visible) return;
    this._teardown();
    this._shell.visible = false;  // bypass shell.close() to avoid double-callback
    this.visible = false;
  }

  resize(screenWidth, screenHeight) {
    if (!this._shell.visible) return;
    this._shell.resize(screenWidth, screenHeight);

    const bw = this._shell.bodyWidth;
    const bh = this._shell.bodyHeight;

    this._scroll.setProps({ width: bw, height: bh });

    if (this._activePanel?.resize) {
      this._activePanel.resize(0, 0, bw, bh);
    }
  }

  /** Forward wheel events from the canvas into the scroll column. */
  handleWheel(deltaY) {
    if (!this._shell.visible) return;
    this._scroll.handleWheel(deltaY);
  }

  /** Refresh the hosted panel (called from the OfficeScene update loop). */
  refresh() {
    if (this._shell.visible && this._activePanel?.refresh) {
      this._activePanel.refresh();
    }
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  _teardown() {
    this._scroll.clearContent();
    this._activePanel = null;
  }

  _handleClose() {
    this._teardown();
    this.visible = false;
    if (this._onClose) this._onClose();
  }
}
