/**
 * TopBarHUD
 *
 * Two-row fixed top bar.
 *
 * Row 1 — primary info + controls:
 *   Company Name | Money | Daily P/L | Day | Time    [Start Day] [⏸ 1× 2× 4× 8×]
 *
 * Row 2 — secondary info:
 *   Projects | Staff | R&D points | Weather
 */
import { Container, Graphics, Text } from 'pixi.js';
import { dailySalaryCost, usedDesks } from '../state/Company.js';

const ROW1_H = 44;
const ROW2_H = 38;
const H = ROW1_H + ROW2_H; // 82

const ROW1_CY = ROW1_H / 2;       // vertical centre of row 1
const ROW2_CY = ROW1_H + ROW2_H / 2; // vertical centre of row 2

const BG_COLOR     = 0x0d1526;
const BG_ROW2      = 0x0a1020;
const BORDER_COLOR = 0x1e2d47;
const DIVIDER_COLOR = 0x162035;

const TEXT_DIM    = 0x6b7fa3;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_GREEN  = 0x4ade80;
const TEXT_RED    = 0xf87171;
const TEXT_WARN   = 0xfbbf24;
const TEXT_CYAN   = 0x38bdf8;
const TEXT_YELLOW = 0xfbbf24;

const WEATHER_ICONS = {
  very_bad:  '⛈',
  bad:       '☁',
  neutral:   '⛅',
  good:      '🌤',
  very_good: '☀',
};

const WEATHER_COLORS = {
  bad:     TEXT_RED,
  neutral: TEXT_DIM,
  good:    TEXT_YELLOW,
};

// Speed button styling
const BTN_W            = 54;
const BTN_H            = 30;
const BTN_R            = 6;
const BTN_GAP          = 6;
const BTN_RIGHT_MARGIN = 14;
const START_BTN_W      = 100;
const END_BTN_W        = 100;
const BTN_NORMAL       = 0x1c2740;
const BTN_ACTIVE       = 0x2a4a8a;
const BTN_HOVER        = 0x253352;
const BTN_BORDER       = 0x2e4070;
const BTN_ACTIVE_BORDER = 0x4a7aff;
const BTN_TEXT         = 0xc8d4ed;
const BTN_TEXT_ACTIVE  = 0xffffff;

// Row each field belongs to — drives y-position assignment.
const FIELD_ROW = {
  name:      1,
  money:     1,
  pl:        1,
  day:       1,
  time:      1,
  projects:  2,
  employees: 2,
  rdPoints:  2,
  weather:   2,
};

const SPEED_DEFS = [
  { speed: 0, label: '⏸' },
  { speed: 1, label: '1×' },
  { speed: 2, label: '2×' },
  { speed: 4, label: '4×' },
  { speed: 8, label: '8×' },
];

export class TopBarHUD extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;

    this._bg = new Graphics();
    this.addChild(this._bg);

    /** @type {Map<string, Text>} */
    this._fields = new Map();
    this._width  = 0;

    this._clockBar = new Graphics();
    this.addChild(this._clockBar);

    /** @type {Array<{speed: number, container: Container, bg: Graphics, label: Text}>} */
    this._speedBtns = [];

    /** @type {Container|null} */
    this._startDayBtn = null;

    /** @type {Container|null} */
    this._endDayBtn = null;

    /** @type {((anchorX: number, anchorY: number) => void)|null} */
    this._onWeatherClick = null;
  }

  /**
   * Register a callback invoked when the player clicks the weather chip.
   * @param {(anchorX: number, anchorY: number) => void} fn
   */
  setWeatherClickHandler(fn) {
    this._onWeatherClick = fn;
  }

  /** Call once after adding to scene to do initial draw. */
  init(screenWidth) {
    this._width = screenWidth;
    this._drawBg();
    this._buildFields();
    this._buildSpeedButtons();
    this._buildStartDayButton();
    this._buildEndDayButton();
    this.refresh();
  }

  resize(screenWidth) {
    this._width = screenWidth;
    this._drawBg();
    this._repositionFields();
    this._repositionSpeedButtons();
    this.refresh();
  }

  /** Pull latest values from company and update text. */
  refresh() {
    const company = this.game.sim?.company;
    if (!company) return;

    // ── Row 1 ──────────────────────────────────────────────────────────────
    const money      = Math.round(company.money);
    const salaries   = dailySalaryCost(company);
    const profitColor = salaries === 0 ? TEXT_GREEN : TEXT_RED;
    const moneyColor  = money < 500 ? TEXT_WARN : money <= 0 ? TEXT_RED : TEXT_BRIGHT;
    const timeStr     = this.game.sim?.time.getCurrentTimeString(company.schedule) ?? '';

    this._set('name',  company.name,                    TEXT_BRIGHT);
    this._set('money', `$${money.toLocaleString()}`,    moneyColor);
    this._set('pl',    `-$${salaries.toLocaleString()}/day`, profitColor);
    this._set('day',   `Day ${company.day}`,            TEXT_BRIGHT);
    this._set('time',  timeStr,                         TEXT_DIM);

    // ── Row 2 ──────────────────────────────────────────────────────────────
    this._set(
      'projects',
      `Projects: ${company.activeProjects.length}/${company.maxActiveProjects}`,
      TEXT_DIM,
    );
    this._set(
      'employees',
      `Staff: ${usedDesks(company)}/${company.office.desks}`,
      TEXT_DIM,
    );
    this._set('rdPoints', `⚗ ${Math.floor(company.rdPoints)} R&D`, TEXT_CYAN);

    const w = company.currentWeather;
    if (w) {
      const icon  = WEATHER_ICONS[w.id] ?? '?';
      const color = WEATHER_COLORS[w.sentiment] ?? TEXT_DIM;
      const pct   = w.modifier >= 1
        ? `+${((w.modifier - 1) * 100).toFixed(1)}%`
        : `${((w.modifier - 1) * 100).toFixed(1)}%`;
      this._set('weather', `${icon} ${w.label} (${pct})`, color);
    } else {
      this._set('weather', '— Weather', TEXT_DIM);
    }

    // ── 15-minute progress bar ─────────────────────────────────────────────
    const dayProgress  = this.game.sim.time.dayProgress;
    const totalMinutes = dayProgress * company.schedule.workHours * 60;
    this._drawClockBar((totalMinutes % 15) / 15);
  }

  /** Called each frame to keep speed button highlight in sync. */
  update() {
    this._updateActiveButton();
    this._updateStartDayButton();
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  _drawBg() {
    this._bg
      .clear()
      // Row 1 background
      .rect(0, 0, this._width, ROW1_H)
      .fill({ color: BG_COLOR })
      // Row 2 background (slightly darker)
      .rect(0, ROW1_H, this._width, ROW2_H)
      .fill({ color: BG_ROW2 })
      // Divider between rows
      .moveTo(0, ROW1_H)
      .lineTo(this._width, ROW1_H)
      .stroke({ color: DIVIDER_COLOR, width: 1 })
      // Bottom border
      .moveTo(0, H)
      .lineTo(this._width, H)
      .stroke({ color: BORDER_COLOR, width: 1 });
  }

  _buildFields() {
    for (const key of Object.keys(FIELD_ROW)) {
      const t = new Text({
        text: '',
        style: {
          fill:       TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   13,
          fontWeight: '600',
        },
      });
      t.anchor.set(0, 0.5);
      t.y = FIELD_ROW[key] === 1 ? ROW1_CY : ROW2_CY;
      this._fields.set(key, t);
      this.addChild(t);
    }

    // Make the weather chip directly interactive — it is already on top of
    // the background so no z-order issues arise.
    const weatherText = this._fields.get('weather');
    weatherText.eventMode = 'static';
    weatherText.cursor = 'pointer';
    weatherText.on('pointerup', () => {
      if (this._onWeatherClick) this._onWeatherClick(weatherText.x, H);
    });

    this._repositionFields();
  }

  _repositionFields() {
    if (this._fields.size === 0) return;
    const W = this._width;

    // Row 1 — leave the right ~42 % free for speed buttons
    const row1 = {
      name:  16,
      money: Math.floor(W * 0.14),
      pl:    Math.floor(W * 0.25),
      day:   Math.floor(W * 0.37),
      time:  Math.floor(W * 0.47),
    };

    // Row 2 — spread across the full width
    const row2 = {
      projects:  16,
      employees: Math.floor(W * 0.18),
      rdPoints:  Math.floor(W * 0.32),
      weather:   Math.floor(W * 0.46),
    };

    const xMap = { ...row1, ...row2 };
    for (const [key, x] of Object.entries(xMap)) {
      const t = this._fields.get(key);
      if (t) t.x = x;
    }

    this._repositionClockBar();
  }

  _repositionClockBar() {
    // Anchors below the time field in row 1
    this._clockBar.x = Math.floor(this._width * 0.47);
    this._clockBar.y = ROW1_H - 6;
  }

  _drawClockBar(fill) {
    const BAR_W = 64;
    const BAR_H = 3;
    const BAR_R = 1.5;
    this._clockBar
      .clear()
      .roundRect(0, 0, BAR_W, BAR_H, BAR_R)
      .fill({ color: 0x1e2d47 })
      .roundRect(0, 0, Math.max(BAR_R * 2, BAR_W * fill), BAR_H, BAR_R)
      .fill({ color: 0x38bdf8 });
  }

  _buildSpeedButtons() {
    for (const { speed, label } of SPEED_DEFS) {
      const entry = this._makeButton(label, () => {
        this.game.sim.setSpeed(speed);
        this._updateActiveButton();
      });
      entry.speed = speed;
      this._speedBtns.push(entry);
      this.addChild(entry.container);
    }
    this._repositionSpeedButtons();
    this._updateActiveButton();
  }

  _repositionSpeedButtons() {
    if (this._speedBtns.length === 0) return;
    const totalW = this._speedBtns.length * (BTN_W + BTN_GAP) - BTN_GAP;
    let x = this._width - BTN_RIGHT_MARGIN - totalW;
    const y = (ROW1_H - BTN_H) / 2;
    for (const entry of this._speedBtns) {
      entry.container.position.set(x, y);
      x += BTN_W + BTN_GAP;
    }
    const speedBlockX = this._width - BTN_RIGHT_MARGIN - totalW;
    if (this._startDayBtn) {
      this._startDayBtn.x = speedBlockX - START_BTN_W - BTN_GAP;
      this._startDayBtn.y = y;
    }
    if (this._endDayBtn) {
      this._endDayBtn.x = speedBlockX - END_BTN_W - BTN_GAP;
      this._endDayBtn.y = y;
    }
  }

  _buildStartDayButton() {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, START_BTN_W, BTN_H, BTN_R)
      .fill({ color: 0x0a2a14 })
      .stroke({ color: 0x4ade80, width: 1 });

    const label = new Text({
      text: '▶ Start Day',
      style: {
        fill:       0x4ade80,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   13,
        fontWeight: '700',
      },
    });
    label.anchor.set(0.5);
    label.position.set(START_BTN_W / 2, BTN_H / 2);

    container.addChild(bg);
    container.addChild(label);

    container.on('pointerup',   () => { this.game.sim.setSpeed(1); this._updateActiveButton(); });
    container.on('pointerover', () => { bg.alpha = 0.8; });
    container.on('pointerout',  () => { bg.alpha = 1; });

    this._startDayBtn = container;
    this.addChild(container);

    this._repositionSpeedButtons();
    this._updateStartDayButton();
  }

  _buildEndDayButton() {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor    = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, END_BTN_W, BTN_H, BTN_R)
      .fill({ color: 0x2a1a0a })
      .stroke({ color: 0xfb923c, width: 1 });

    const label = new Text({
      text: 'End Day \u23ED',
      style: {
        fill:       0xfb923c,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   13,
        fontWeight: '700',
      },
    });
    label.anchor.set(0.5);
    label.position.set(END_BTN_W / 2, BTN_H / 2);

    container.addChild(bg);
    container.addChild(label);
    container.on('pointerup',   () => this.game.sim.endDay());
    container.on('pointerover', () => { bg.alpha = 0.8; });
    container.on('pointerout',  () => { bg.alpha = 1; });

    this._endDayBtn = container;
    this.addChild(container);
    this._repositionSpeedButtons();
    this._updateStartDayButton();
  }

  _updateStartDayButton() {
    const time = this.game.sim?.time;
    if (!time) return;
    const atDayStart = time.dayProgress === 0 && time.gameSpeed === 0;
    if (this._startDayBtn) this._startDayBtn.visible = atDayStart;
    if (this._endDayBtn)   this._endDayBtn.visible   = !atDayStart;
  }

  _makeButton(label, onClick) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics();
    container.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fill:       BTN_TEXT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   13,
        fontWeight: '600',
      },
    });
    text.anchor.set(0.5);
    text.position.set(BTN_W / 2, BTN_H / 2);
    container.addChild(text);

    const drawBg = (hover, active = false) => {
      bg.clear()
        .roundRect(0, 0, BTN_W, BTN_H, BTN_R)
        .fill({ color: active ? BTN_ACTIVE : hover ? BTN_HOVER : BTN_NORMAL })
        .stroke({ color: active ? BTN_ACTIVE_BORDER : BTN_BORDER, width: 1 });
      text.style.fill = active ? BTN_TEXT_ACTIVE : BTN_TEXT;
    };
    drawBg(false, false);

    container.on('pointerover', () => drawBg(true,  this.game.sim?.time.gameSpeed === container._speed));
    container.on('pointerout',  () => drawBg(false, this.game.sim?.time.gameSpeed === container._speed));
    container.on('pointerup',   () => onClick());

    return { container, bg, label: text, speed: -1, _drawBg: drawBg };
  }

  _updateActiveButton() {
    const currentSpeed = this.game.sim?.time.gameSpeed ?? 0;
    for (const entry of this._speedBtns) {
      const isActive = entry.speed === currentSpeed;
      entry.bg
        .clear()
        .roundRect(0, 0, BTN_W, BTN_H, BTN_R)
        .fill({ color: isActive ? BTN_ACTIVE : BTN_NORMAL })
        .stroke({ color: isActive ? BTN_ACTIVE_BORDER : BTN_BORDER, width: 1 });
      entry.label.style.fill = isActive ? BTN_TEXT_ACTIVE : BTN_TEXT;
    }
  }

  _set(key, value, color) {
    const t = this._fields.get(key);
    if (!t) return;
    t.text = value;
    t.style.fill = color;
  }
}

export { H as TOP_BAR_HEIGHT };
