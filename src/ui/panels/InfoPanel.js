/**
 * InfoPanel
 *
 * Split-pane tutorial panel for the "Game Guide" modal.
 *
 * Layout:
 *   ┌─────────────┬───────────────────────────────┐
 *   │  category   │  title                        │
 *   │  list       │  body text (scrollable)       │
 *   │  (fixed)    │                               │
 *   └─────────────┴───────────────────────────────┘
 *
 * Wheel events are forwarded only into the right-pane scroll, leaving the
 * category list fixed. ModalHost calls panel.handleWheel() because it checks
 * for that method before falling back to the outer ScrollColumn.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { ScrollColumn } from '../layouts/ScrollColumn.js';
import { INFO_CATEGORIES } from '@/data/infoCategories.js';

// ── Palette (matches EmployeesPanel / HiringPanel) ────────────────────────────
const BG_PANEL    = 0x0d1526;
const BG_LEFT     = 0x0b1221;
const CAT_NORMAL  = 0x131929;
const CAT_HOVER   = 0x1c2d48;
const CAT_ACTIVE  = 0x1e3a6e;
const CAT_ACTIVE_BORDER = 0x4a7aff;
const CAT_BORDER  = 0x1e2d47;
const DIVIDER     = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM    = 0x7a86a3;
const TEXT_PRIMARY = 0x4a9eff;

const LEFT_W    = 160;
const PADDING   = 14;
const CAT_H     = 34;
const CAT_GAP   = 4;
const CAT_R     = 6;
const TITLE_GAP = 12;
const LINE_LEAD = 1.55;

export class InfoPanel extends Container {
  /** @param {import('../../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;

    this._activeCategoryId = INFO_CATEGORIES[0].id;
    this._width  = 600;
    this._height = 500;

    // Left column background
    this._leftBg = new Graphics();
    this.addChild(this._leftBg);

    // Divider between columns
    this._divider = new Graphics();
    this.addChild(this._divider);

    // Category button containers (rebuilt once on first init)
    this._catContainer = new Container();
    this.addChild(this._catContainer);

    // Right pane — uses a nested ScrollColumn so only the text scrolls
    this._rightScroll = new ScrollColumn({ width: 0, height: 0 });
    this.addChild(this._rightScroll);

    // Right pane content (rebuilt on category change)
    this._rightContent = new Container();
  }

  // ── Panel contract ───────────────────────────────────────────────────────────

  init(x, y, width, height) {
    this._width  = width;
    this._height = height;
    this.position.set(x, y);
    this._buildCategories();
    this.refresh();
  }

  resize(x, y, width, height) {
    this._width  = width;
    this._height = height;
    this.position.set(x, y);
    this._buildCategories();
    this.refresh();
  }

  refresh() {
    this._drawChrome();
    this._drawContent();
  }

  /**
   * Forward wheel events to the right pane only.
   * ModalHost calls this instead of its outer ScrollColumn when present.
   */
  handleWheel(deltaY) {
    this._rightScroll.handleWheel(deltaY);
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  _rightX() { return LEFT_W + 1; }
  _rightW() { return this._width - LEFT_W - 1; }

  _drawChrome() {
    // Left column background
    this._leftBg
      .clear()
      .rect(0, 0, LEFT_W, this._height)
      .fill({ color: BG_LEFT });

    // Vertical divider
    this._divider
      .clear()
      .moveTo(LEFT_W, 0)
      .lineTo(LEFT_W, this._height)
      .stroke({ color: DIVIDER, width: 1 });

    // Right ScrollColumn viewport
    this._rightScroll.position.set(this._rightX(), 0);
    this._rightScroll.setProps({ width: this._rightW(), height: this._height });
  }

  _buildCategories() {
    this._catContainer.removeChildren();

    const startX = (LEFT_W - (LEFT_W - PADDING * 2)) / 2;
    const btnW   = LEFT_W - PADDING * 2;
    let   y      = PADDING;

    for (const cat of INFO_CATEGORIES) {
      const isActive = () => this._activeCategoryId === cat.id;

      const btn = new Container();
      btn.position.set(startX, y);
      btn.eventMode = 'static';
      btn.cursor = 'pointer';

      const bg = new Graphics();
      btn.addChild(bg);

      const label = new Text({
        text: cat.label,
        style: {
          fill: TEXT_BRIGHT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: '500',
        },
      });
      label.anchor.set(0, 0.5);
      label.position.set(10, CAT_H / 2);
      btn.addChild(label);

      const drawState = (active, hover) => {
        bg.clear()
          .roundRect(0, 0, btnW, CAT_H, CAT_R)
          .fill({ color: active ? CAT_ACTIVE : hover ? CAT_HOVER : CAT_NORMAL })
          .stroke({ color: active ? CAT_ACTIVE_BORDER : CAT_BORDER, width: 1 });
        label.style.fill = active ? TEXT_BRIGHT : TEXT_DIM;
        label.style.fontWeight = active ? '600' : '500';
      };

      drawState(isActive(), false);

      btn.on('pointerover',  () => { if (!isActive()) drawState(false, true); });
      btn.on('pointerout',   () => { drawState(isActive(), false); });
      btn.on('pointerup',    () => {
        if (isActive()) return;
        this._activeCategoryId = cat.id;
        // Redraw all category buttons to update active state
        this._buildCategories();
        this._drawContent();
      });

      // Store drawState for refresh calls
      btn._drawState = drawState;
      btn._catId     = cat.id;

      this._catContainer.addChild(btn);
      y += CAT_H + CAT_GAP;
    }
  }

  _drawContent() {
    const cat = INFO_CATEGORIES.find((c) => c.id === this._activeCategoryId)
      ?? INFO_CATEGORIES[0];

    // Rebuild the right pane content container
    if (this._rightContent.parent) {
      this._rightContent.parent.removeChild(this._rightContent);
    }
    this._rightContent = new Container();

    const rw   = this._rightW();
    const wrap = rw - PADDING * 2;
    let   curY = PADDING;

    // Title
    const titleText = new Text({
      text: cat.title,
      style: {
        fill: TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: '700',
        wordWrap: false,
      },
    });
    titleText.position.set(PADDING, curY);
    this._rightContent.addChild(titleText);
    curY += titleText.height + TITLE_GAP;

    // Divider under title
    const titleLine = new Graphics();
    titleLine
      .moveTo(PADDING, curY)
      .lineTo(rw - PADDING, curY)
      .stroke({ color: DIVIDER, width: 1 });
    this._rightContent.addChild(titleLine);
    curY += 12;

    // Body — split on double-newline to create paragraphs
    const paragraphs = cat.body.split('\n\n');
    for (const para of paragraphs) {
      const bodyText = new Text({
        text: para.trim(),
        style: {
          fill: para.startsWith('  ') || para.startsWith('\t') ? TEXT_DIM : TEXT_BRIGHT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          fontWeight: '400',
          wordWrap: true,
          wordWrapWidth: wrap,
          lineHeight: Math.round(13 * LINE_LEAD),
        },
      });
      bodyText.position.set(PADDING, curY);
      this._rightContent.addChild(bodyText);
      curY += bodyText.height + 10;
    }

    // Add to scroll viewport and reset position
    this._rightScroll.clearContent();
    this._rightScroll.addContent(this._rightContent);
  }
}
