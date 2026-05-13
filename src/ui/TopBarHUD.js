/**
 * TopBarHUD
 *
 * Fixed top bar showing: Company Name | Money | Daily P/L | Day | Projects | Employees
 * and speed-control buttons (⏸ 1× 2× 4× 8×) anchored to the right.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { dailySalaryCost, usedDesks } from '../state/Company.js';

const H = 52;
const BG_COLOR = 0x0d1526;
const BORDER_COLOR = 0x1e2d47;
const TEXT_DIM = 0x6b7fa3;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_GREEN = 0x4ade80;
const TEXT_RED = 0xf87171;
const TEXT_WARN = 0xfbbf24;
const TEXT_CYAN = 0x38bdf8;

// Speed button styling
const BTN_W = 54;
const BTN_H = 34;
const BTN_R = 6;
const BTN_GAP = 6;
const BTN_RIGHT_MARGIN = 14;
const BTN_NORMAL = 0x1c2740;
const BTN_ACTIVE = 0x2a4a8a;
const BTN_HOVER = 0x253352;
const BTN_BORDER = 0x2e4070;
const BTN_ACTIVE_BORDER = 0x4a7aff;
const BTN_TEXT = 0xc8d4ed;
const BTN_TEXT_ACTIVE = 0xffffff;

const SPEED_DEFS = [
  { speed: 0, label: '⏸' },
  { speed: 1, label: '1×' },
  { speed: 2, label: '2×' },
  { speed: 4, label: '4×' },
  { speed: 8, label: '8×' },
];

export class TopBarHUD extends Container {
  /**
   * @param {import('../Game.js').Game} game
   */
  constructor(game) {
    super();
    this.game = game;

    this._bg = new Graphics();
    this.addChild(this._bg);

    /** @type {Map<string, Text>} */
    this._fields = new Map();
    this._width = 0;

    /** @type {Array<{speed: number, container: Container, bg: Graphics, label: Text, bgNormal: number, bgHover: number}>} */
    this._speedBtns = [];
  }

  /** Call once after adding to scene to do initial draw. */
  init(screenWidth) {
    this._width = screenWidth;
    this._drawBg();
    this._buildFields();
    this._buildSpeedButtons();
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

    const money = Math.round(company.money);
    const salaries = dailySalaryCost(company);
    const profitColor = salaries === 0 ? TEXT_GREEN : TEXT_RED;
    const moneyColor =
      money < 500 ? TEXT_WARN : money <= 0 ? TEXT_RED : TEXT_BRIGHT;

    const timeStr = this.game.sim?.time.getCurrentTimeString(company.schedule) ?? '';

    this._set('name', company.name, TEXT_BRIGHT);
    this._set('money', `$${money.toLocaleString()}`, moneyColor);
    this._set('pl', `-$${salaries.toLocaleString()}/day`, profitColor);
    this._set('day', `Day ${company.day}`, TEXT_BRIGHT);
    this._set('time', timeStr, TEXT_DIM);
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
  }

  /** Called each frame to keep speed button highlight in sync. */
  update() {
    this._updateActiveButton();
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  _drawBg() {
    this._bg
      .clear()
      .rect(0, 0, this._width, H)
      .fill({ color: BG_COLOR })
      .moveTo(0, H)
      .lineTo(this._width, H)
      .stroke({ color: BORDER_COLOR, width: 1 });
  }

  _buildFields() {
    const labels = ['name', 'money', 'pl', 'day', 'time', 'projects', 'employees', 'rdPoints'];
    for (const key of labels) {
      const t = new Text({
        text: '',
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14,
          fontWeight: '600',
        },
      });
      t.anchor.set(0, 0.5);
      t.y = H / 2;
      this._fields.set(key, t);
      this.addChild(t);
    }
    this._repositionFields();
  }

  _repositionFields() {
    if (this._fields.size === 0) return;
    const W = this._width;
    const positions = [
      16,
      Math.floor(W * 0.14),
      Math.floor(W * 0.24),
      Math.floor(W * 0.34),
      Math.floor(W * 0.43),
      Math.floor(W * 0.53),
      Math.floor(W * 0.62),
      Math.floor(W * 0.72),
    ];
    const keys = ['name', 'money', 'pl', 'day', 'time', 'projects', 'employees', 'rdPoints'];
    keys.forEach((k, i) => {
      const t = this._fields.get(k);
      if (t) t.x = positions[i];
    });
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
    const y = (H - BTN_H) / 2;
    for (const entry of this._speedBtns) {
      entry.container.position.set(x, y);
      x += BTN_W + BTN_GAP;
    }
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
        fill: BTN_TEXT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
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

    container.on('pointerover', () => {
      const isActive = this.game.sim?.time.gameSpeed === container._speed;
      drawBg(true, isActive);
    });
    container.on('pointerout', () => {
      const isActive = this.game.sim?.time.gameSpeed === container._speed;
      drawBg(false, isActive);
    });
    container.on('pointerup', () => {
      onClick();
    });

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
