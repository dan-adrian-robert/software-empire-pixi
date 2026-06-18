/**
 * PauseMenu
 *
 * Full-screen overlay shown when the player presses ESC during the office scene.
 * Pauses time and presents four actions: Resume, Save Game, Load Game, Main Menu.
 *
 * Usage:
 *   const menu = new PauseMenu({ onResume, onSave, onLoad, onMainMenu });
 *   root.addChild(menu);
 *   menu.open(screenW, screenH);
 *   menu.close();
 *   menu.resize(screenW, screenH);
 */
import { Container, Graphics, Text } from 'pixi.js';

const CARD_W = 360;
const PAD    = 20;
const RAD    = 10;

const BG         = 0x0b1422;
const BORDER_COL = 0x1e2d47;
const FONT       = 'Inter, system-ui, sans-serif';
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM    = 0x7a86a3;

const BTN_H   = 44;
const BTN_GAP = 10;

const BUTTONS = [
  { label: 'Resume',    bg: 0x0d2a4a, border: 0x2a6aaa },
  { label: 'Save Game', bg: 0x0d2a1a, border: 0x2a8a50 },
  { label: 'Load Game', bg: 0x1a1a3a, border: 0x3a3a8a },
  { label: 'Main Menu', bg: 0x1a1a2e, border: 0x2e3a55 },
];

export class PauseMenu extends Container {
  /**
   * @param {{ onResume: () => void, onSave: () => void, onLoad: () => void, onMainMenu: () => void }} callbacks
   */
  constructor({ onResume, onSave, onLoad, onMainMenu }) {
    super();
    this.visible = false;

    this._callbacks = [onResume, onSave, onLoad, onMainMenu];
    this._screenW   = 0;
    this._screenH   = 0;

    this._backdrop = new Graphics();
    this._card     = new Graphics();
    this._content  = new Container();

    this._backdrop.eventMode = 'static';
    this._card.eventMode     = 'static';

    this._card.addChild(this._content);
    this.addChild(this._backdrop);
    this.addChild(this._card);

    this._buildContent();
  }

  open(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._drawBackdrop(screenW, screenH);
    this._centerCard(screenW, screenH);
    this.visible = true;
  }

  close() {
    this.visible = false;
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (!this.visible) return;
    this._drawBackdrop(screenW, screenH);
    this._centerCard(screenW, screenH);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _drawBackdrop(w, h) {
    this._backdrop
      .clear()
      .rect(0, 0, w, h)
      .fill({ color: 0x000000, alpha: 0.7 });
  }

  _centerCard(screenW, screenH) {
    this._card.position.set(
      Math.round((screenW - CARD_W) / 2),
      Math.round((screenH - this._cardH) / 2),
    );
  }

  _buildContent() {
    this._content.removeChildren();
    this._card.clear();

    let y = PAD;

    // Title
    const title = new Text({
      text: 'PAUSED',
      style: {
        fill:       TEXT_BRIGHT,
        fontFamily: FONT,
        fontSize:   22,
        fontWeight: '700',
        letterSpacing: 4,
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, y);
    this._content.addChild(title);
    y += 36;

    const hint = new Text({
      text: 'Press ESC to resume',
      style: { fill: TEXT_DIM, fontFamily: FONT, fontSize: 11 },
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(CARD_W / 2, y);
    this._content.addChild(hint);
    y += 20;

    // Divider
    const div = new Graphics()
      .rect(PAD, y, CARD_W - PAD * 2, 1)
      .fill({ color: 0x1e2d47 });
    this._content.addChild(div);
    y += 12;

    // Buttons
    BUTTONS.forEach(({ label, bg, border }, i) => {
      const btnBg = new Graphics()
        .roundRect(PAD, y, CARD_W - PAD * 2, BTN_H, 6)
        .fill({ color: bg })
        .stroke({ color: border, width: 1.5 });
      btnBg.eventMode = 'static';
      btnBg.cursor    = 'pointer';
      btnBg.on('pointerover', () => { btnBg.alpha = 0.8; });
      btnBg.on('pointerout',  () => { btnBg.alpha = 1.0; });
      btnBg.on('pointerup',   () => this._callbacks[i]());

      const lbl = new Text({
        text: label,
        style: { fill: TEXT_BRIGHT, fontFamily: FONT, fontSize: 14, fontWeight: '600' },
      });
      lbl.anchor.set(0.5, 0.5);
      lbl.position.set(CARD_W / 2, y + BTN_H / 2);
      lbl.eventMode = 'none';

      this._content.addChild(btnBg, lbl);
      y += BTN_H + BTN_GAP;
    });

    y += PAD - BTN_GAP;
    this._cardH = y;

    this._card
      .roundRect(0, 0, CARD_W, this._cardH, RAD)
      .fill({ color: BG })
      .stroke({ color: BORDER_COL, width: 1.5 });
  }
}
