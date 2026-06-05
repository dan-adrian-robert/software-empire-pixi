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
 *
 * Horizontal scrollbar: panels that implement getHorizontalScrollState() get
 * an auto-managed horizontal ScrollBar pinned to the bottom of the body.
 */
import { Container } from 'pixi.js';
import { PanelShell } from './PanelShell.js';
import { ScrollColumn } from '../layouts/ScrollColumn.js';
import { ScrollBar } from '../widgets/ScrollBar.js';
import { TOP_BAR_HEIGHT } from '../TopBarHUD.js';

/** Height of the horizontal scrollbar strip at the bottom of the body. */
const H_BAR_H   = 8;
/** Gap between ScrollColumn content and the scrollbar. */
const H_BAR_GAP = 6;

export class ModalHost extends Container {
  /**
   * @param {() => void} [onClose]  called after the modal hides itself
   */
  constructor(onClose) {
    super();

    this.visible      = false;
    this._onClose     = onClose;
    this._activePanel = null;

    this._shell = new PanelShell({
      topBarHeight: TOP_BAR_HEIGHT,
      onClose: () => this._handleClose(),
    });

    this._scroll = new ScrollColumn({ width: 0, height: 0 });

    // Horizontal scrollbar — hidden until a panel reports overflow
    this._horizontalBar = new ScrollBar({ length: 0, contentSize: 0, viewportSize: 0 });
    this._horizontalBar.visible = false;

    // _bodyRoot is the single child passed to PanelShell.setBody so that
    // the scrollbar can be positioned relative to the body area without
    // touching PanelShell internals.
    this._bodyRoot = new Container();
    this._bodyRoot.addChild(this._scroll);
    this._bodyRoot.addChild(this._horizontalBar);

    this._shell.setBody(this._bodyRoot);
    this.addChild(this._shell);
  }

  // ── Public API (matches legacy Modal) ────────────────────────────────────────

  /**
   * Open the modal hosting the given panel.
   * @param {string} title
   * @param {import('pixi.js').Container} panel  must implement init(x,y,w,h)
   * @param {number} screenWidth
   * @param {number} screenHeight
   * @param {object} [options]
   * @param {'default'|'hiring'} [options.layout]
   */
  open(title, panel, screenWidth, screenHeight, options = {}) {
    this._teardown();

    this._shell.setLayoutPreset(options.layout ?? 'default');
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

    this._syncHorizontalBar(bw, bh);
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

    this._syncHorizontalBar(bw, bh);
  }

  /** Forward wheel events from the canvas into the scroll column. */
  handleWheel(deltaY, deltaX = 0, shiftKey = false) {
    if (!this._shell.visible) return;
    // Panels that implement handleWheel manage their own scroll (e.g. InfoPanel
    // with a nested right-pane scroll column); defer to them when present.
    if (this._activePanel?.handleWheel) {
      this._activePanel.handleWheel(deltaY, deltaX, shiftKey);
      return;
    }
    this._scroll.handleWheel(deltaY);
  }

  /** Refresh the hosted panel (called from the OfficeScene update loop). */
  refresh() {
    if (this._shell.visible && this._activePanel?.refresh) {
      this._activePanel.refresh();
      const bw = this._shell.bodyWidth;
      const bh = this._shell.bodyHeight;
      this._syncHorizontalBar(bw, bh);
    }
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  /**
   * Show/configure the horizontal scrollbar when the active panel reports
   * horizontal overflow, or hide it otherwise.
   * @param {number} bw body width
   * @param {number} bh body height
   */
  _syncHorizontalBar(bw, bh) {
    if (!this._activePanel) {
      this._horizontalBar.visible = false;
      return;
    }

    const state = this._activePanel.getHorizontalScrollState?.();

    if (state) {
      const effectiveH = bh - H_BAR_H - H_BAR_GAP;
      this._scroll.setProps({ width: bw, height: effectiveH });

      this._horizontalBar.setProps({
        length:       bw,
        contentSize:  state.contentWidth,
        viewportSize: state.viewportWidth,
        value:        state.scrollX,
        onChange: (x) => {
          // Always read fresh state so the reference is never stale
          this._activePanel?.getHorizontalScrollState?.()?.setScrollX(x);
          this._horizontalBar.setProps({ value: x });
        },
      });

      this._horizontalBar.position.set(0, bh - H_BAR_H);
      this._horizontalBar.visible = true;
    } else {
      this._scroll.setProps({ width: bw, height: bh });
      this._horizontalBar.visible = false;
    }
  }

  _teardown() {
    this._scroll.clearContent();
    this._activePanel = null;
    this._horizontalBar.visible = false;
    this._shell.setLayoutPreset('default');
  }

  _handleClose() {
    this._teardown();
    this.visible = false;
    if (this._onClose) this._onClose();
  }
}
