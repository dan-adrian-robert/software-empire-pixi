/**
 * SchedulePopup
 *
 * Floating panel anchored to the right of the left sidebar.
 * Lets the player configure:
 *   - Work-day start time (slider across a 6am–midnight timeline)
 *   - Work duration: 8 / 10 / 12 / 14 hours
 *
 * Displays derived WorkLoad status: Normal → Crowded → Full → Workaholic.
 *
 * Usage:
 *   popup.open(company, screenW, screenH)
 *   popup.close()
 *   popup.refresh(company)    – re-draw after external schedule change
 */
import { Container, Graphics, Text } from 'pixi.js';
import { LEFT_SIDEBAR_WIDTH } from './LeftSidebar.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';

// ── Layout constants ─────────────────────────────────────────────────────────
const W = 320;
const PAD = 16;
const CONTENT_W = W - PAD * 2;

const TIMELINE_START_H = 6;   // 6 am
const TIMELINE_END_H = 24;    // midnight
const TIMELINE_RANGE = TIMELINE_END_H - TIMELINE_START_H; // 18 h
const TL_H = 10;               // bar height
const TL_LABEL_H = 14;         // hour-label row height
const TICK_HOURS = [6, 9, 12, 15, 18, 21, 24]; // ticks to label

const BTN_H = 30;
const DURATION_OPTIONS = [8, 10, 12, 14];

// Section heights used to compute total popup height
const TITLE_SECTION = 14 + 20;          // top-pad + title
const TL_SECTION = 12 + TL_LABEL_H + 4 + TL_H + 6 + 14 + 12; // header + labels + bar + times + gap
const DUR_SECTION = 16 + 14 + 8 + BTN_H + 12;
const WL_SECTION = 14 + 14 + 8 + 36 + 16;
const POPUP_H = TITLE_SECTION + TL_SECTION + DUR_SECTION + WL_SECTION;

// ── Colours ──────────────────────────────────────────────────────────────────
const BG = 0x0d1526;
const BORDER = 0x1e3050;
const DIVIDER = 0x1a2a44;
const SECTION_LABEL = 0x7a86a3;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const TL_TRACK = 0x1a2336;
const TL_WINDOW = 0x2a4a8a;
const TL_WINDOW_BORDER = 0x4a7aff;
const BTN_NORMAL = 0x131929;
const BTN_ACTIVE = 0x1e3a6e;
const BTN_HOVER = 0x1c2d48;
const BTN_BORDER = 0x1e3050;
const BTN_ACTIVE_BORDER = 0x4a7aff;

const WORKLOAD_INFO = {
  8:  { label: 'Normal',      color: 0x4ade80, desc: 'Standard 8-hour day' },
  10: { label: 'Crowded',     color: 0xfbbf24, desc: 'Extended 10-hour shift' },
  12: { label: 'Full',        color: 0xf97316, desc: 'Heavy 12-hour workload' },
  14: { label: 'Workaholic',  color: 0xf87171, desc: 'Maximum effort — 14 hours' },
};

function fmtHour(h24) {
  const h = h24 % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${period}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export class SchedulePopup extends Container {
  /**
   * @param {(startHour: number, workHours: number) => void} onChange
   */
  constructor(onChange) {
    super();
    this.onChange = onChange;
    this.visible = false;

    // Swallow all pointer events so clicks inside the popup don't fall through
    // to the world background handler (which would immediately close it).
    this.eventMode = 'static';
    this.on('pointerdown', (e) => e.stopPropagation());

    this._bg = new Graphics();
    this._body = new Container();
    this.addChild(this._bg);
    this.addChild(this._body);

    this._startHour = 8;
    this._workHours = 8;

    // Draw static background outline now; body is rebuilt on open/refresh.
    this._drawBg();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  open(company, screenW, screenH) {
    this._startHour = company.schedule.startHour;
    this._workHours = company.schedule.workHours;
    this._place(screenW, screenH);
    this._rebuild();
    this.visible = true;
  }

  close() {
    this.visible = false;
  }

  refresh(company) {
    if (!this.visible || !company) return;
    this._startHour = company.schedule.startHour;
    this._workHours = company.schedule.workHours;
    this._rebuild();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _place(screenW, screenH) {
    const x = LEFT_SIDEBAR_WIDTH + 8;
    const maxY = screenH - POPUP_H - 8;
    const y = Math.min(Math.max(TOP_BAR_HEIGHT + 8, 0), maxY);
    this.position.set(x, y);
  }

  _drawBg() {
    this._bg
      .clear()
      .roundRect(0, 0, W, POPUP_H, 10)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }

  _rebuild() {
    this._body.removeChildren();
    this._drawBg();

    let y = PAD;

    // ── Title ────────────────────────────────────────────
    const title = new Text({
      text: 'WORK SCHEDULE',
      style: {
        fill: TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
      },
    });
    title.position.set(PAD, y);
    this._body.addChild(title);
    y += 20;

    y = this._buildTimeline(y);
    y = this._buildDurationButtons(y);
    y = this._buildWorkLoad(y);
  }

  // ── Timeline ───────────────────────────────────────────

  _buildTimeline(startY) {
    let y = startY;

    // Section header
    this._body.addChild(this._sectionLabel('TIMELINE', PAD, y));
    y += 20;

    // Hour tick labels
    const pxPerHour = CONTENT_W / TIMELINE_RANGE;
    for (const h of TICK_HOURS) {
      const lx = PAD + (h - TIMELINE_START_H) * pxPerHour;
      const str = h === 24 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`;
      const lbl = new Text({
        text: str,
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 9,
        },
      });
      lbl.anchor.set(0.5, 0);
      lbl.position.set(lx, y);
      this._body.addChild(lbl);
    }
    y += TL_LABEL_H + 2;

    // Track (full bar)
    const track = new Graphics()
      .roundRect(PAD, y, CONTENT_W, TL_H, 3)
      .fill({ color: TL_TRACK });
    this._body.addChild(track);

    // Work window highlight
    const winX = PAD + (this._startHour - TIMELINE_START_H) * pxPerHour;
    const winW = this._workHours * pxPerHour;
    const win = new Graphics()
      .roundRect(winX, y, winW, TL_H, 3)
      .fill({ color: TL_WINDOW })
      .stroke({ color: TL_WINDOW_BORDER, width: 1 });
    this._body.addChild(win);

    // Tick marks
    for (const h of TICK_HOURS) {
      const tx = PAD + (h - TIMELINE_START_H) * pxPerHour;
      const tick = new Graphics()
        .moveTo(tx, y - 3)
        .lineTo(tx, y + TL_H + 3)
        .stroke({ color: DIVIDER, width: 1 });
      this._body.addChild(tick);
    }

    // Invisible hit area for clicking to reposition work window
    const hitArea = new Graphics()
      .rect(PAD, y - 4, CONTENT_W, TL_H + 8)
      .fill({ color: 0x000000, alpha: 0 });
    hitArea.eventMode = 'static';
    hitArea.cursor = 'pointer';
    hitArea.on('pointerdown', (e) => {
      const localX = e.global.x - this.x - PAD;
      const rawHour = TIMELINE_START_H + (localX / CONTENT_W) * TIMELINE_RANGE;
      const snapped = Math.round(rawHour);
      const clamped = Math.max(TIMELINE_START_H, Math.min(TIMELINE_END_H - this._workHours, snapped));
      this._applyChange(clamped, this._workHours);
    });
    this._body.addChild(hitArea);

    y += TL_H + 8;

    // Start / end time labels
    const endHour = this._startHour + this._workHours;
    const startLbl = new Text({
      text: fmtHour(this._startHour),
      style: { fill: TL_WINDOW_BORDER, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '600' },
    });
    startLbl.anchor.set(0, 0);
    startLbl.position.set(winX, y);
    this._body.addChild(startLbl);

    const endLbl = new Text({
      text: fmtHour(endHour),
      style: { fill: TL_WINDOW_BORDER, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '600' },
    });
    endLbl.anchor.set(1, 0);
    endLbl.position.set(winX + winW, y);
    this._body.addChild(endLbl);

    y += 16;
    return y;
  }

  // ── Duration buttons ───────────────────────────────────

  _buildDurationButtons(startY) {
    let y = startY + 4;

    // Divider
    this._body.addChild(this._divider(y));
    y += 12;

    this._body.addChild(this._sectionLabel('DURATION', PAD, y));
    y += 18;

    const btnW = Math.floor((CONTENT_W - 3 * 8) / 4);

    DURATION_OPTIONS.forEach((h, i) => {
      const active = h === this._workHours;
      const bx = PAD + i * (btnW + 8);
      const btn = this._makeDurationBtn(`${h}h`, active, bx, y, btnW, () => {
        this._applyChange(this._startHour, h);
      });
      this._body.addChild(btn);
    });

    y += BTN_H + 12;
    return y;
  }

  // ── WorkLoad status ────────────────────────────────────

  _buildWorkLoad(startY) {
    let y = startY;

    // Divider
    this._body.addChild(this._divider(y));
    y += 12;

    this._body.addChild(this._sectionLabel('WORKLOAD', PAD, y));
    y += 18;

    const info = WORKLOAD_INFO[this._workHours] ?? WORKLOAD_INFO[8];

    // Colored dot + label
    const dot = new Graphics()
      .circle(PAD + 6, y + 9, 6)
      .fill({ color: info.color });
    this._body.addChild(dot);

    const labelText = new Text({
      text: info.label,
      style: {
        fill: info.color,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: '700',
      },
    });
    labelText.position.set(PAD + 18, y + 1);
    this._body.addChild(labelText);

    const descText = new Text({
      text: info.desc,
      style: {
        fill: TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
      },
    });
    descText.position.set(PAD + 18, y + 18);
    this._body.addChild(descText);

    y += 36;
    return y;
  }

  // ── Helpers ────────────────────────────────────────────

  _applyChange(startHour, workHours) {
    const clamped = Math.max(TIMELINE_START_H, Math.min(TIMELINE_END_H - workHours, startHour));
    this._startHour = clamped;
    this._workHours = workHours;
    this._rebuild();
    this.onChange(clamped, workHours);
  }

  _sectionLabel(text, x, y) {
    const t = new Text({
      text,
      style: {
        fill: SECTION_LABEL,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
      },
    });
    t.position.set(x, y);
    return t;
  }

  _divider(y) {
    return new Graphics()
      .moveTo(8, y)
      .lineTo(W - 8, y)
      .stroke({ color: DIVIDER, width: 1 });
  }

  _makeDurationBtn(label, active, x, y, width, onClick) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics();
    const drawBg = (hover) => {
      bg.clear()
        .roundRect(0, 0, width, BTN_H, 6)
        .fill({ color: active ? BTN_ACTIVE : hover ? BTN_HOVER : BTN_NORMAL })
        .stroke({ color: active ? BTN_ACTIVE_BORDER : BTN_BORDER, width: 1 });
    };
    drawBg(false);
    container.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fill: active ? 0xe6e8ef : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: active ? '700' : '500',
      },
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, BTN_H / 2);
    container.addChild(text);

    if (!active) {
      container.on('pointerover', () => drawBg(true));
      container.on('pointerout', () => drawBg(false));
    }
    container.on('pointerup', () => { if (!active) onClick(); });

    container.position.set(x, y);
    return container;
  }
}
