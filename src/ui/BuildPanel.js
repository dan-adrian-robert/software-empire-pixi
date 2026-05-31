/**
 * BuildPanel
 *
 * Shown in place of the RightWidgetBar when build mode is active.
 * Occupies the same position and dimensions as the right sidebar.
 * Lists all furniture types as draggable cards.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { FURNITURE_TYPES } from '../data/furnitureTypes.js';
import { RIGHT_SIDEBAR_WIDTH } from './RightWidgetBar.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';

const PADDING    = 10;
const CARD_H     = 52;
const CARD_GAP   = 8;
const CARD_R     = 6;
const TOGGLE_H   = 32;

const BG_COLOR      = 0x0d1526;
const BORDER_COLOR  = 0x1e2d47;
const HEADER_COLOR  = 0x7a86a3;
const CARD_BG       = 0x131929;
const CARD_HOVER_BG = 0x1c2d48;
const CARD_BORDER   = 0x1e2d47;
const TEXT_COLOR    = 0xe6e8ef;
const DIM_COLOR     = 0x7a86a3;

export class BuildPanel extends Container {
  constructor() {
    super();
    this.visible = false;
    this._onDragStart = null;

    this._screenW = 800;
    this._screenH = 600;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._content = new Container();
    this.addChild(this._content);
  }

  // ---------------------------------------------------------------------------

  /** @param {(typeId: string, event: PointerEvent) => void} fn */
  setOnDragStart(fn) { this._onDragStart = fn; }

  init(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._reposition();
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (this.visible) this._reposition();
  }

  show() {
    this.visible = true;
    this._reposition();
  }

  hide() {
    this.visible = false;
  }

  // ---------------------------------------------------------------------------

  _reposition() {
    this.position.set(this._screenW - RIGHT_SIDEBAR_WIDTH, TOP_BAR_HEIGHT);
    this._panelH = this._screenH - TOP_BAR_HEIGHT;
    this._drawBg();
    this._buildContent();
  }

  _drawBg() {
    this._bg
      .clear()
      .rect(0, 0, RIGHT_SIDEBAR_WIDTH, this._panelH)
      .fill({ color: BG_COLOR })
      .moveTo(0, 0)
      .lineTo(0, this._panelH)
      .stroke({ color: BORDER_COLOR, width: 1 });
  }

  _buildContent() {
    this._content.removeChildren();

    // ── Header strip (matches RightWidgetBar toggle header height) ────────────
    const headerSep = new Graphics()
      .rect(0, TOGGLE_H - 1, RIGHT_SIDEBAR_WIDTH, 1)
      .fill({ color: BORDER_COLOR });
    this._content.addChild(headerSep);

    // "BUILD MODE" label centered in the header strip
    const headerLabel = new Text({
      text: 'BUILD MODE',
      style: {
        fill: TEXT_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
      },
    });
    headerLabel.anchor.set(0.5, 0.5);
    headerLabel.position.set(RIGHT_SIDEBAR_WIDTH / 2, TOGGLE_H / 2);
    this._content.addChild(headerLabel);

    // ── Furniture section ─────────────────────────────────────────────────────
    let y = TOGGLE_H + PADDING;

    const sectionLabel = new Text({
      text: 'FURNITURE',
      style: {
        fill: HEADER_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
      },
    });
    sectionLabel.position.set(PADDING, y);
    this._content.addChild(sectionLabel);
    y += 18;

    for (const type of FURNITURE_TYPES) {
      const card = this._makeCard(type, y);
      this._content.addChild(card);
      y += CARD_H + CARD_GAP;
    }
  }

  _makeCard(type, y) {
    const card = new Container();
    card.eventMode = 'static';
    card.cursor = 'grab';
    card.position.set(PADDING, y);

    const cw = RIGHT_SIDEBAR_WIDTH - PADDING * 2;

    const bg = new Graphics()
      .roundRect(0, 0, cw, CARD_H, CARD_R)
      .fill({ color: CARD_BG })
      .stroke({ color: CARD_BORDER, width: 1 });
    card.addChild(bg);

    // Color swatch
    const swatchSize = 28;
    const swatch = new Graphics()
      .roundRect(10, (CARD_H - swatchSize) / 2, swatchSize, swatchSize, 4)
      .fill({ color: type.color, alpha: 0.75 })
      .stroke({ color: type.color, width: 1.5, alpha: 0.9 });
    card.addChild(swatch);

    // Label
    const label = new Text({
      text: type.label,
      style: {
        fill: TEXT_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });
    label.anchor.set(0, 0.5);
    label.position.set(swatchSize + 18, CARD_H / 2 - 6);
    card.addChild(label);

    // Size hint
    const sizeHint = new Text({
      text: `${type.w}×${type.h} tile${type.w * type.h > 1 ? 's' : ''}`,
      style: {
        fill: DIM_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '500',
      },
    });
    sizeHint.anchor.set(0, 0.5);
    sizeHint.position.set(swatchSize + 18, CARD_H / 2 + 8);
    card.addChild(sizeHint);

    // Drag hint (right side)
    const dragHint = new Text({
      text: '⠿',
      style: {
        fill: DIM_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
      },
    });
    dragHint.anchor.set(1, 0.5);
    dragHint.position.set(cw - 10, CARD_H / 2);
    card.addChild(dragHint);

    // Hover interactions
    const drawNormal = () => {
      bg.clear()
        .roundRect(0, 0, cw, CARD_H, CARD_R)
        .fill({ color: CARD_BG })
        .stroke({ color: CARD_BORDER, width: 1 });
    };
    const drawHover = () => {
      bg.clear()
        .roundRect(0, 0, cw, CARD_H, CARD_R)
        .fill({ color: CARD_HOVER_BG })
        .stroke({ color: type.color, width: 1.5, alpha: 0.8 });
    };

    card.on('pointerover',  drawHover);
    card.on('pointerout',   drawNormal);
    card.on('pointerdown',  (e) => {
      e.stopPropagation();
      this._onDragStart?.(type.id, e);
    });

    return card;
  }
}
