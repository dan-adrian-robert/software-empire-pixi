/**
 * CalendarPopup
 *
 * Floating panel anchored to the right of the left sidebar.
 * Shows the current 20-day sheet as a 4×5 grid.
 *
 * Cell states:
 *   - Today / past with event  → event icon + name (no interaction)
 *   - Future with event        → event icon + name + ✕ remove button
 *   - Future eligible          → day number + small + button (opens event picker)
 *   - Future ineligible        → day number only (dimmed)
 *   - Today / past without event → day number, today highlighted
 *
 * Usage:
 *   popup.open(company, screenW, screenH)
 *   popup.close()
 *   popup.refresh(company)
 *   popup.resize(screenW, screenH)
 */
import { Container, Graphics, Text } from 'pixi.js';
import { LEFT_SIDEBAR_WIDTH } from './LeftSidebar.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';
import {
  DAYS_PER_SHEET,
  getSheetIndex,
  getDayForCell,
  getSheetRangeLabel,
} from '../utils/calendar.js';
import { EVENT_TYPES, EVENT_TYPE_MAP } from '../data/eventTypes.js';

// ── Layout ────────────────────────────────────────────────────────────────────
const COLS      = 5;
const ROWS      = 4;
const CELL_SIZE = 50;
const CELL_GAP  = 6;
const PAD       = 16;
const HEADER_H  = 56;  // title + subtitle + divider area
const GRID_W    = COLS * CELL_SIZE + (COLS - 1) * CELL_GAP;
const W         = GRID_W + PAD * 2;
const GRID_H    = ROWS * CELL_SIZE + (ROWS - 1) * CELL_GAP;
const POPUP_H   = HEADER_H + GRID_H + PAD * 2;

// ── Colours ───────────────────────────────────────────────────────────────────
const BG              = 0x0d1526;
const BORDER          = 0x1e3050;
const DIVIDER         = 0x1a2a44;
const TEXT_BRIGHT     = 0xe6e8ef;
const TEXT_DIM        = 0x7a86a3;
const TEXT_LABEL      = 0x7a86a3;
const CELL_NORMAL     = 0x131929;
const CELL_BORDER     = 0x1e2d47;
const CELL_ACTIVE     = 0x1e3a6e;
const CELL_ACTIVE_BORDER = 0x4a7aff;
const CELL_PAST       = 0x0f1720;
const CELL_EVENT      = 0x1a2e14;  // green-tinted for event days
const CELL_EVENT_BORDER  = 0x2a6a3a;
const CELL_EVENT_PAST = 0x111f10;
const CELL_R          = 6;

// + / ✕ buttons
const BTN_ADD_BG      = 0x1e3a6e;
const BTN_ADD_BORDER  = 0x4a7aff;
const BTN_REM_BG      = 0x3a1e1e;
const BTN_REM_BORDER  = 0x7a2a2a;
const BTN_SIZE        = 16;

// Event picker colours
const PICKER_ROW_BG   = 0x131929;
const PICKER_ROW_BOR  = 0x1e3050;
const PICKER_SEL_BG   = 0x1e3a6e;
const PICKER_SEL_BOR  = 0x4a7aff;

// ─────────────────────────────────────────────────────────────────────────────

export class CalendarPopup extends Container {
  /**
   * @param {(day: number, eventTypeId: string) => void} onScheduleEvent
   * @param {(day: number) => void} onRemoveEvent
   * @param {() => import('../state/Company.js').Company|null} getCompany
   */
  constructor(onScheduleEvent, onRemoveEvent, getCompany) {
    super();
    this.visible = false;

    this._onScheduleEvent = onScheduleEvent ?? (() => {});
    this._onRemoveEvent   = onRemoveEvent   ?? (() => {});
    this._getCompany      = getCompany      ?? (() => null);

    // Swallow pointer events so world-click does not immediately close the popup.
    this.eventMode = 'static';
    this.on('pointerdown', (e) => e.stopPropagation());

    this._bg   = new Graphics();
    this._body = new Container();
    this.addChild(this._bg);
    this.addChild(this._body);

    this._company    = null;
    this._screenW    = 0;
    this._screenH    = 0;
    this._pickerDay  = null;  // null = show grid; number = show event picker

    // Track last-seen state to skip needless rebuilds in refresh().
    this._lastDay          = -1;
    this._lastEventsLength = -1;

    this._drawBg();
  }

  // ── Public lifecycle ─────────────────────────────────────────────────────────

  open(company, screenW, screenH) {
    this._company    = company;
    this._screenW    = screenW;
    this._screenH    = screenH;
    this._pickerDay  = null;
    this._lastDay    = -1;  // force rebuild
    this._lastEventsLength = -1;
    this._place();
    this._rebuild();
    this.visible = true;
  }

  close() {
    this.visible = false;
    this._pickerDay = null;
  }

  refresh(company) {
    if (!this.visible || !company) return;
    this._company = company;
    const evLen = company.scheduledEvents?.length ?? 0;
    if (company.day === this._lastDay && evLen === this._lastEventsLength) return;
    this._pickerDay = null;  // reset picker if day advanced or events changed
    this._rebuild();
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    if (this.visible) this._place();
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  _place() {
    const x    = LEFT_SIDEBAR_WIDTH + 8;
    const maxY = this._screenH - POPUP_H - 8;
    const y    = Math.min(Math.max(TOP_BAR_HEIGHT + 8, 0), maxY);
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
    if (!this._company) return;
    this._body.removeChildren();
    this._drawBg();

    this._lastDay          = this._company.day;
    this._lastEventsLength = this._company.scheduledEvents?.length ?? 0;

    if (this._pickerDay !== null) {
      this._buildPicker(this._pickerDay);
    } else {
      this._buildGrid();
    }
  }

  // ── Grid view ────────────────────────────────────────────────────────────────

  _buildGrid() {
    const company    = this._company;
    const sheetIndex = getSheetIndex(company.day);
    let y = PAD;

    // ── Title ─────────────────────────────────────────────────────────────────
    const title = new Text({
      text: 'CALENDAR',
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    });
    title.position.set(PAD, y);
    this._body.addChild(title);
    y += 18;

    const subtitle = new Text({
      text: getSheetRangeLabel(sheetIndex),
      style: { fill: TEXT_LABEL, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '400' },
    });
    subtitle.position.set(PAD, y);
    this._body.addChild(subtitle);
    y += 20;

    // Divider
    const div = new Graphics()
      .moveTo(PAD, 0).lineTo(W - PAD, 0)
      .stroke({ color: DIVIDER, width: 1 });
    div.position.set(0, y - 4);
    this._body.addChild(div);
    y += 2;

    // ── Grid ──────────────────────────────────────────────────────────────────
    for (let cellIndex = 0; cellIndex < DAYS_PER_SHEET; cellIndex++) {
      const col = cellIndex % COLS;
      const row = Math.floor(cellIndex / COLS);
      const day = getDayForCell(sheetIndex, cellIndex);
      const cx  = PAD + col * (CELL_SIZE + CELL_GAP);
      const cy  = y   + row * (CELL_SIZE + CELL_GAP);

      const isToday    = day === company.day;
      const isPast     = day < company.day;
      const isFuture   = day > company.day;
      const event      = company.scheduledEvents?.find((e) => e.day === day) ?? null;
      const isEligible = isFuture && !event && this._isDayEligible(day);

      this._buildCell(cx, cy, day, { isToday, isPast, isFuture, event, isEligible });
    }
  }

  _buildCell(cx, cy, day, { isToday, isPast, isFuture, event, isEligible }) {
    let bgColor, borderColor, borderWidth;
    if (event && isToday)       { bgColor = CELL_EVENT;      borderColor = CELL_EVENT_BORDER; borderWidth = 1.5; }
    else if (event && isPast)   { bgColor = CELL_EVENT_PAST; borderColor = CELL_EVENT_BORDER; borderWidth = 1; }
    else if (event)             { bgColor = CELL_EVENT;      borderColor = CELL_EVENT_BORDER; borderWidth = 1.5; }
    else if (isToday)           { bgColor = CELL_ACTIVE;     borderColor = CELL_ACTIVE_BORDER; borderWidth = 1.5; }
    else if (isPast)            { bgColor = CELL_PAST;       borderColor = CELL_BORDER; borderWidth = 1; }
    else                        { bgColor = CELL_NORMAL;     borderColor = CELL_BORDER; borderWidth = 1; }

    const cellBg = new Graphics()
      .roundRect(0, 0, CELL_SIZE, CELL_SIZE, CELL_R)
      .fill({ color: bgColor })
      .stroke({ color: borderColor, width: borderWidth });
    cellBg.position.set(cx, cy);
    this._body.addChild(cellBg);

    if (event) {
      // Show event icon (large) + abbreviated name
      const typeInfo = EVENT_TYPE_MAP[event.eventTypeId];
      const iconT = new Text({
        text: typeInfo?.icon ?? '📅',
        style: { fontSize: 18, fontFamily: 'Inter, system-ui, sans-serif' },
      });
      iconT.anchor.set(0.5, 0.5);
      iconT.position.set(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2 - 5);
      this._body.addChild(iconT);

      const nameT = new Text({
        text: typeInfo ? this._abbrev(typeInfo.name) : '?',
        style: { fill: isPast ? TEXT_DIM : TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 7, fontWeight: '600' },
      });
      nameT.anchor.set(0.5, 1);
      nameT.position.set(cx + CELL_SIZE / 2, cy + CELL_SIZE - 4);
      this._body.addChild(nameT);

      // ✕ remove button — only for future events
      if (isFuture) {
        this._addBtn(cx + CELL_SIZE - BTN_SIZE + 2, cy, '✕', BTN_REM_BG, BTN_REM_BORDER, () => {
          this._onRemoveEvent(day);
          this._lastEventsLength = -1;
          this._rebuild();
        });
      }
    } else {
      // Day number label
      const label = new Text({
        text: String(day),
        style: {
          fill: isToday ? 0xffffff : (isPast || (!isEligible && isFuture)) ? TEXT_DIM : TEXT_BRIGHT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: isToday ? 14 : 13,
          fontWeight: isToday ? '700' : '500',
        },
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2);
      this._body.addChild(label);

      // + button on eligible future days
      if (isEligible) {
        this._addBtn(cx + CELL_SIZE - BTN_SIZE + 2, cy, '+', BTN_ADD_BG, BTN_ADD_BORDER, () => {
          this._pickerDay = day;
          this._rebuild();
        });
      }
    }
  }

  /** Abbreviated name for tight cells (e.g. "S. Presentation"). */
  _abbrev(name) {
    if (name.length <= 9) return name;
    const words = name.split(' ');
    return words.length > 1
      ? words[0][0] + '. ' + words.slice(1).join(' ')
      : name.slice(0, 9);
  }

  /** Small circular button overlaid at (bx, by) in body space. */
  _addBtn(bx, by, label, bgColor, borderColor, onClick) {
    const SIZE = BTN_SIZE;
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor    = 'pointer';
    btn.position.set(bx, by);

    const bg = new Graphics()
      .roundRect(0, 0, SIZE, SIZE, SIZE / 2)
      .fill({ color: bgColor })
      .stroke({ color: borderColor, width: 1 });
    btn.addChild(bg);

    const t = new Text({
      text: label,
      style: { fill: 0xffffff, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700' },
    });
    t.anchor.set(0.5, 0.5);
    t.position.set(SIZE / 2, SIZE / 2);
    btn.addChild(t);

    btn.on('pointerover', () => { bg.alpha = 0.75; });
    btn.on('pointerout',  () => { bg.alpha = 1; });
    btn.on('pointerup',   onClick);
    this._body.addChild(btn);
  }

  /** Whether a day meets the cooldown distance rule relative to all scheduled events. */
  _isDayEligible(day) {
    const company  = this._company;
    const cooldown = this._getEffectiveCooldown();
    for (const ev of company.scheduledEvents ?? []) {
      if (Math.abs(ev.day - day) < cooldown) return false;
    }
    return true;
  }

  _getEffectiveCooldown() {
    const { DEFAULT_COOLDOWN, COOLDOWN_REDUCTION_PER_NODE } = { DEFAULT_COOLDOWN: 10, COOLDOWN_REDUCTION_PER_NODE: 2 };
    const nodes = ['event_frequency_1', 'event_frequency_2'].filter(
      (id) => this._company?.unlockedResearch?.includes(id),
    ).length;
    return DEFAULT_COOLDOWN - nodes * COOLDOWN_REDUCTION_PER_NODE;
  }

  // ── Event picker view ─────────────────────────────────────────────────────────

  _buildPicker(day) {
    let y = PAD;

    // ── Header row ────────────────────────────────────────────────────────────
    const header = new Text({
      text: `Schedule Event — Day ${day}`,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '700' },
    });
    header.position.set(PAD, y);
    this._body.addChild(header);

    // Back button
    const backBtn = new Container();
    backBtn.eventMode = 'static';
    backBtn.cursor    = 'pointer';
    backBtn.position.set(W - PAD - 60, y - 2);
    const backBg = new Graphics()
      .roundRect(0, 0, 60, 20, 4)
      .fill({ color: CELL_NORMAL })
      .stroke({ color: CELL_BORDER, width: 1 });
    backBtn.addChild(backBg);
    const backT = new Text({
      text: '← Back',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '600' },
    });
    backT.anchor.set(0.5, 0.5);
    backT.position.set(30, 10);
    backBtn.addChild(backT);
    backBtn.on('pointerover', () => { backBg.alpha = 0.7; });
    backBtn.on('pointerout',  () => { backBg.alpha = 1; });
    backBtn.on('pointerup',   () => { this._pickerDay = null; this._rebuild(); });
    this._body.addChild(backBtn);
    y += 24;

    // Divider
    const div = new Graphics()
      .moveTo(PAD, 0).lineTo(W - PAD, 0)
      .stroke({ color: DIVIDER, width: 1 });
    div.position.set(0, y);
    this._body.addChild(div);
    y += 12;

    // ── Event type rows ────────────────────────────────────────────────────────
    const ROW_H = 70;
    const ROW_W = W - PAD * 2;

    for (const evType of EVENT_TYPES) {
      const row = new Container();
      row.eventMode = 'static';
      row.cursor    = 'pointer';
      row.position.set(PAD, y);

      const rowBg = new Graphics()
        .roundRect(0, 0, ROW_W, ROW_H, 8)
        .fill({ color: PICKER_ROW_BG })
        .stroke({ color: PICKER_ROW_BOR, width: 1 });
      row.addChild(rowBg);

      // Icon
      const iconT = new Text({
        text: evType.icon,
        style: { fontSize: 24, fontFamily: 'Inter, system-ui, sans-serif' },
      });
      iconT.anchor.set(0, 0.5);
      iconT.position.set(10, ROW_H / 2);
      row.addChild(iconT);

      // Name
      const nameT = new Text({
        text: evType.name,
        style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '700' },
      });
      nameT.position.set(44, 12);
      row.addChild(nameT);

      // Description
      const descT = new Text({
        text: evType.description,
        style: {
          fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10,
          wordWrap: true, wordWrapWidth: ROW_W - 100,
        },
      });
      descT.position.set(44, 28);
      row.addChild(descT);

      // Select button
      const selBtnW = 52;
      const selBtn = new Container();
      selBtn.eventMode = 'static';
      selBtn.cursor    = 'pointer';
      selBtn.position.set(ROW_W - selBtnW - 8, (ROW_H - 24) / 2);
      const selBg = new Graphics()
        .roundRect(0, 0, selBtnW, 24, 4)
        .fill({ color: PICKER_SEL_BG })
        .stroke({ color: PICKER_SEL_BOR, width: 1 });
      selBtn.addChild(selBg);
      const selT = new Text({
        text: 'Select',
        style: { fill: 0xffffff, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700' },
      });
      selT.anchor.set(0.5, 0.5);
      selT.position.set(selBtnW / 2, 12);
      selBtn.addChild(selT);
      selBtn.on('pointerover', () => { selBg.alpha = 0.75; });
      selBtn.on('pointerout',  () => { selBg.alpha = 1; });
      const capturedTypeId = evType.id;
      const capturedDay    = day;
      selBtn.on('pointerup', () => {
        this._onScheduleEvent(capturedDay, capturedTypeId);
        this._pickerDay = null;
        this._lastEventsLength = -1;
        this._rebuild();
      });
      row.addChild(selBtn);

      // Row hover highlight
      row.on('pointerover', () => { rowBg.stroke({ color: PICKER_SEL_BOR, width: 1 }); });
      row.on('pointerout',  () => { rowBg.stroke({ color: PICKER_ROW_BOR, width: 1 }); });

      this._body.addChild(row);
      y += ROW_H + 8;
    }
  }
}
