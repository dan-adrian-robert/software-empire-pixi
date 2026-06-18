/**
 * GameOverPopup
 *
 * Full-screen modal shown when the player triggers the insolvency game-over
 * condition (3 consecutive end-of-day negative cash balances).
 *
 * Usage:
 *   popup.open(snapshot, screenW, screenH, game)
 *   popup.close()
 *   popup.resize(screenW, screenH)
 *
 * snapshot shape (subset of day:report payload):
 *   { day, moneyEnd, company, graceDays }
 */
import { Container, Graphics, Text } from 'pixi.js';
import { GameConfig } from '../config.js';

// ── Dimensions ────────────────────────────────────────────────────────────────
const W   = 460;
const P   = 20;
const R   = 10;

// ── Palette ───────────────────────────────────────────────────────────────────
const BG          = 0x0b1422;
const BORDER      = 0x7a1a1a;
const DIVIDER_COL = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM    = 0x7a86a3;
const RED         = 0xf87171;
const GREEN       = 0x4ade80;
const YELLOW      = 0xfbbf24;

const FONT = 'Inter, system-ui, sans-serif';

function makeText(text, size, color, weight = '400') {
  return new Text({
    text,
    style: {
      fill:       color,
      fontFamily: FONT,
      fontSize:   size,
      fontWeight: weight,
    },
  });
}

function divider(y, parent) {
  const g = new Graphics().rect(P, y, W - P * 2, 1).fill({ color: DIVIDER_COL });
  parent.addChild(g);
  return y + 9;
}

function kvRow(label, value, valueColor, y, parent) {
  const lbl = makeText(label, 11, TEXT_DIM);
  lbl.position.set(P, y);
  parent.addChild(lbl);

  const val = makeText(value, 11, valueColor, '600');
  val.anchor.set(1, 0);
  val.position.set(W - P, y);
  parent.addChild(val);

  return y + 20;
}

export class GameOverPopup extends Container {
  constructor() {
    super();
    this.visible = false;

    this._screenW = 0;
    this._screenH = 0;
    this._game    = null;

    this._backdrop = new Graphics();
    this._card     = new Graphics();
    this._content  = new Container();

    this._backdrop.eventMode = 'static'; // swallows clicks behind the popup
    this._card.eventMode     = 'static';

    this._card.addChild(this._content);
    this.addChild(this._backdrop);
    this.addChild(this._card);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * @param {object} snapshot  day:report payload
   * @param {number} screenW
   * @param {number} screenH
   * @param {import('../Game.js').Game} game
   */
  open(snapshot, screenW, screenH, game) {
    this._screenW = screenW;
    this._screenH = screenH;
    this._game    = game;

    this._drawBackdrop(screenW, screenH);
    this._draw(snapshot);
    this._center(screenW, screenH);
    this.visible = true;
  }

  close() {
    this.visible = false;
    this._game   = null;
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (!this.visible) return;
    this._drawBackdrop(screenW, screenH);
    this._center(screenW, screenH);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _drawBackdrop(w, h) {
    this._backdrop
      .clear()
      .rect(0, 0, w, h)
      .fill({ color: 0x000000, alpha: 0.75 });
  }

  _center(screenW, screenH) {
    this._card.position.set(
      Math.round((screenW - W) / 2),
      Math.round(Math.max(16, (screenH - this._totalH) / 2)),
    );
  }

  _draw(snapshot) {
    this._content.removeChildren();

    const { day, moneyEnd, company, graceDays } = snapshot;
    const graceDaysLabel = graceDays ?? GameConfig.gameplay.NEGATIVE_CASH_GRACE_DAYS;

    let y = P;

    // ── Card background ──────────────────────────────────────────────────────
    // Drawn after we know total height; placeholder cleared at the end.
    this._card.clear();

    // ── Header ──────────────────────────────────────────────────────────────
    const title = makeText('INSOLVENCY', 22, RED, '700');
    title.position.set(P, y);
    this._content.addChild(title);

    y += 30;

    const subtitle = makeText(
      `The company ran out of funds for ${graceDaysLabel} consecutive days.`,
      11,
      TEXT_DIM,
    );
    subtitle.style.wordWrap = true;
    subtitle.style.wordWrapWidth = W - P * 2;
    subtitle.position.set(P, y);
    this._content.addChild(subtitle);

    y += 28;
    y = divider(y, this._content);

    // ── Stats ────────────────────────────────────────────────────────────────
    const dayLabel = makeText('COMPANY SUMMARY', 9, TEXT_DIM, '600');
    dayLabel.position.set(P, y);
    this._content.addChild(dayLabel);
    y += 18;

    y = kvRow('Day reached', `Day ${day}`, TEXT_BRIGHT, y, this._content);

    const balColor = moneyEnd >= 0 ? GREEN : RED;
    y = kvRow('Final cash balance', `$${Math.round(moneyEnd).toLocaleString()}`, balColor, y, this._content);

    const revenue = company?.stats?.totalRevenue ?? 0;
    y = kvRow('Total revenue earned', `$${revenue.toLocaleString()}`, GREEN, y, this._content);

    const projects = company?.stats?.projectsCompleted ?? 0;
    y = kvRow('Projects completed', String(projects), YELLOW, y, this._content);

    const teamSize = company?.employees?.length ?? 0;
    y = kvRow('Team size at shutdown', `${teamSize} employee${teamSize !== 1 ? 's' : ''}`, TEXT_BRIGHT, y, this._content);

    y += 4;
    y = divider(y, this._content);

    // ── Buttons ──────────────────────────────────────────────────────────────
    const BTN_H  = 38;
    const BTN_GAP = 8;

    y = this._addButton('Load Game', 0x1a3060, 0x4a7aff, y, BTN_H, () => {
      const g = this._game;
      this.close();
      g.scenes.changeTo(GameConfig.scenes.MAIN_MENU).then(() => {
        g.events.emit('menu:show_load');
      });
    });

    y += BTN_GAP;

    y = this._addButton('New Game', 0x132210, 0x4ade80, y, BTN_H, () => {
      const g = this._game;
      this.close();
      g.startNewGame();
    });

    y += BTN_GAP;

    y = this._addButton('Main Menu', 0x1a1a2e, 0x7a86a3, y, BTN_H, () => {
      const g = this._game;
      this.close();
      g.scenes.changeTo(GameConfig.scenes.MAIN_MENU);
    });

    y += P;
    this._totalH = y;

    // ── Card background (now that height is known) ───────────────────────────
    this._card
      .roundRect(0, 0, W, this._totalH, R)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }

  _addButton(label, bgColor, borderColor, y, btnH, onClick) {
    const bg = new Graphics()
      .roundRect(P, y, W - P * 2, btnH, 6)
      .fill({ color: bgColor })
      .stroke({ color: borderColor, width: 1.5 });
    bg.eventMode = 'static';
    bg.cursor    = 'pointer';
    this._content.addChild(bg);

    const lbl = makeText(label, 13, TEXT_BRIGHT, '600');
    lbl.anchor.set(0.5, 0.5);
    lbl.position.set(W / 2, y + btnH / 2);
    lbl.eventMode = 'none';
    this._content.addChild(lbl);

    bg.on('pointerup',   () => onClick());
    bg.on('pointerover', () => { bg.alpha = 0.8; });
    bg.on('pointerout',  () => { bg.alpha = 1; });

    return y + btnH;
  }
}
