/**
 * EventDayBanner
 *
 * A fixed card displayed in the HUD layer when the current game day has a
 * scheduled company event. Sits just below the top bar, horizontally centered
 * between the left and right sidebars.
 *
 * Visible only on event days; hidden otherwise.
 *
 * Usage:
 *   banner.init(screenWidth, screenHeight)   // first-time draw
 *   banner.resize(screenWidth, screenHeight) // reposition on resize
 *   banner.refresh(company)                  // show/hide/update each tick
 */
import { Container, Graphics, Text } from 'pixi.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';
import { LEFT_SIDEBAR_WIDTH } from './LeftSidebar.js';
import { RIGHT_SIDEBAR_WIDTH } from './RightWidgetBar.js';
import { EVENT_TYPE_MAP } from '../data/eventTypes.js';

const CARD_W      = 360;
const CARD_H      = 52;
const CARD_R      = 8;
const PAD_V       = 8;   // vertical gap below the top bar

const BG_COLOR    = 0x0d1f12;
const BORDER_COLOR = 0x2a6a3a;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM    = 0x7a86a3;
const TEXT_GREEN  = 0x7dd3aa;

export class EventDayBanner extends Container {
  constructor() {
    super();
    this.visible = false;

    this._bg        = new Graphics();
    this._iconText  = new Text({ text: '', style: { fontSize: 22, fontFamily: 'Inter, system-ui, sans-serif' } });
    this._nameText  = new Text({ text: '', style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' } });
    this._subText   = new Text({ text: '', style: { fill: TEXT_DIM,    fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 } });

    this._iconText.anchor.set(0, 0.5);
    this._nameText.anchor.set(0, 0);
    this._subText.anchor.set(0, 0);

    this.addChild(this._bg);
    this.addChild(this._iconText);
    this.addChild(this._nameText);
    this.addChild(this._subText);

    this._screenW = 0;
    this._screenH = 0;
  }

  // ── Public lifecycle ─────────────────────────────────────────────────────────

  init(screenWidth, screenHeight) {
    this._screenW = screenWidth;
    this._screenH = screenHeight;
    this._drawCard();
    this._place();
  }

  resize(screenWidth, screenHeight) {
    this._screenW = screenWidth;
    this._screenH = screenHeight;
    this._place();
  }

  /**
   * Show/hide and update text based on today's scheduled event.
   * Called every ~0.2 s from OfficeScene's polling block.
   * @param {import('../state/Company.js').Company|null} company
   */
  refresh(company) {
    if (!company) {
      this.visible = false;
      return;
    }
    const todayEvent = company.scheduledEvents?.find((e) => e.day === company.day);
    if (!todayEvent) {
      this.visible = false;
      return;
    }

    const typeInfo = EVENT_TYPE_MAP[todayEvent.eventTypeId];
    const icon = typeInfo?.icon ?? '📅';
    const name = typeInfo?.name ?? 'Company Event';

    this._iconText.text = icon;
    this._nameText.text = name;
    this._subText.text  = 'All staff attending today  ·  +1 potential point at end of day';

    // Layout text inside the card (local coords)
    const iconX = 14;
    const textX = iconX + 30;
    this._iconText.position.set(iconX, CARD_H / 2);
    this._nameText.position.set(textX, 8);
    this._subText.position.set(textX, 28);

    this.visible = true;
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  _drawCard() {
    this._bg
      .clear()
      .roundRect(0, 0, CARD_W, CARD_H, CARD_R)
      .fill({ color: BG_COLOR })
      .stroke({ color: BORDER_COLOR, width: 1.5 });

    // Left accent bar
    this._bg
      .roundRect(0, 0, 4, CARD_H, CARD_R)
      .fill({ color: TEXT_GREEN });
  }

  _place() {
    const usableLeft  = LEFT_SIDEBAR_WIDTH;
    const usableRight = this._screenW - RIGHT_SIDEBAR_WIDTH;
    const centerX     = (usableLeft + usableRight) / 2;
    this.x = Math.round(centerX - CARD_W / 2);
    this.y = TOP_BAR_HEIGHT + PAD_V;
  }
}
