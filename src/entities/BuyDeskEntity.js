/**
 * BuyDeskEntity
 *
 * A purchasable desk slot rendered in the office grid after all existing desks.
 * Shows a dimmed desk outline, a "+" circle icon, and the price.
 * Brightens on hover when the player can afford it; stays muted otherwise.
 */
import { Container, Graphics, Text } from 'pixi.js';

export const DESK_PRICE = 1000;

const W = 160;  // matches DESK_W
const H = 100;  // matches DESK_H

// ── Can afford ──────────────────────────────────────
const BG_CAN      = 0x0f1a2e;
const BORDER_CAN  = 0x2a4a70;
const ICON_CAN    = 0x3a7aaa;
const PRICE_CAN   = 0x4ade80;

// ── Hover ───────────────────────────────────────────
const BG_HOV      = 0x152840;
const BORDER_HOV  = 0x4a9eff;
const ICON_HOV    = 0x4a9eff;

// ── Can't afford ────────────────────────────────────
const BG_CANT     = 0x0c1018;
const BORDER_CANT = 0x1e2230;
const ICON_CANT   = 0x252a3a;
const PRICE_CANT  = 0x3a3f50;

export class BuyDeskEntity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean} canAfford
   * @param {() => void} onClick
   */
  constructor(x, y, canAfford, onClick) {
    this.view = new Container();
    this.view.position.set(x, y);
    this._canAfford = canAfford;

    this._bg = new Graphics();
    this._icon = new Graphics();
    this.view.addChild(this._bg);
    this.view.addChild(this._icon);

    // "+" text
    this._plus = new Text({
      text: '+',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 36,
        fontWeight: '700',
        fill: canAfford ? ICON_CAN : ICON_CANT,
      },
    });
    this._plus.anchor.set(0.5);
    this._plus.position.set(W / 2, H / 2 + 4);
    this.view.addChild(this._plus);

    // Price label
    const priceText = new Text({
      text: `$${DESK_PRICE.toLocaleString()}`,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '600',
        fill: canAfford ? PRICE_CAN : PRICE_CANT,
      },
    });
    priceText.anchor.set(0.5, 0);
    priceText.position.set(W / 2, H + 12);
    this.view.addChild(priceText);

    this._drawState(canAfford, false);

    if (canAfford) {
      this.view.eventMode = 'static';
      this.view.cursor = 'pointer';
      this.view.on('pointerdown', (e) => e.stopPropagation());
      this.view.on('pointerover', () => {
        this._drawState(true, true);
        this._plus.style.fill = ICON_HOV;
      });
      this.view.on('pointerout', () => {
        this._drawState(true, false);
        this._plus.style.fill = ICON_CAN;
      });
      this.view.on('pointerup', () => onClick());
    }
  }

  destroy() {
    this.view.destroy({ children: true });
  }

  // ── Internal ─────────────────────────────────────

  _drawState(canAfford, hover) {
    const bg     = hover ? BG_HOV     : canAfford ? BG_CAN     : BG_CANT;
    const border = hover ? BORDER_HOV : canAfford ? BORDER_CAN : BORDER_CANT;
    const icon   = hover ? ICON_HOV   : canAfford ? ICON_CAN   : ICON_CANT;

    // Desk outline — uses dashed appearance via three short segments on each side
    this._bg
      .clear()
      .roundRect(0, 16, W, H - 16, 8)
      .fill({ color: bg })
      .stroke({ color: border, width: 3, alpha: canAfford ? 0.8 : 0.35 });

    // Circle icon
    this._icon
      .clear()
      .circle(W / 2, H / 2 + 4, 26)
      .fill({ color: hover ? 0x1a3060 : 0x0b1120 })
      .stroke({ color: icon, width: hover ? 4 : 3 });
  }
}
