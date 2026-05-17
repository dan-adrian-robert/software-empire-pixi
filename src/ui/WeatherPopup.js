/**
 * WeatherPopup
 *
 * Floating card that appears when the player clicks the weather indicator
 * in the top bar. Shows today's condition and the full table of possible
 * weather states with their productivity modifiers.
 *
 * Usage (mirrors EmployeeStatsPopup):
 *   popup.open(company, anchorX, anchorY, screenW, screenH)
 *   popup.close()
 *   popup.resize(screenW, screenH)
 *   popup.refresh(company)
 */
import { Container, Graphics, Text } from 'pixi.js';
import { WEATHER_TYPES } from '../data/weatherTypes.js';

// ── dimensions ────────────────────────────────────────────────────────────
const W  = 304;
const P  = 14;

const ROW_H        = 30;
const SECTION_GAP  = 10;

// ── palette ───────────────────────────────────────────────────────────────
const BG           = 0x0b1422;
const BORDER       = 0x2a4a8a;
const DIVIDER      = 0x1a2a44;
const ROW_ACTIVE   = 0x0e2040;
const ROW_BORDER   = 0x2a4a8a;

const TEXT_BRIGHT  = 0xe6e8ef;
const TEXT_DIM     = 0x7a86a3;
const TEXT_LABEL   = 0x4a6080;

const SENT_COLORS  = {
  bad:     0xf87171,
  neutral: 0x7a86a3,
  good:    0x4ade80,
};

const WEATHER_ICONS = {
  very_bad:  '⛈',
  bad:       '☁',
  neutral:   '⛅',
  good:      '🌤',
  very_good: '☀',
};

// ── helpers ───────────────────────────────────────────────────────────────
function fmtMod(modifier) {
  const delta = (modifier - 1) * 100;
  return delta >= 0
    ? `+${delta.toFixed(1)}%`
    : `${delta.toFixed(1)}%`;
}

function sectionLabel(text, y, container) {
  const t = new Text({
    text,
    style: {
      fill:       TEXT_LABEL,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize:   9,
      fontWeight: '700',
    },
  });
  t.position.set(P, y);
  container.addChild(t);
  return y + 14;
}

function divider(y, container) {
  const g = new Graphics()
    .moveTo(8, y)
    .lineTo(W - 8, y)
    .stroke({ color: DIVIDER, width: 1 });
  container.addChild(g);
  return y + SECTION_GAP;
}

export class WeatherPopup extends Container {
  constructor() {
    super();
    this.visible  = false;
    this._company = null;

    this._winBg   = new Graphics();
    this._content = new Container();
    this.addChild(this._winBg);
    this.addChild(this._content);
  }

  // ── public API ────────────────────────────────────────────────────────

  open(company, anchorX, anchorY, screenW, screenH) {
    this._company = company;
    this._draw(company);
    this._place(anchorX, anchorY, screenW, screenH);
    this.visible = true;
  }

  close() {
    this._company = null;
    this.visible  = false;
  }

  refresh(company) {
    if (!this.visible) return;
    this._company = company;
    this._draw(company);
  }

  resize(_screenW, _screenH) {
    // No reposition needed — popup re-opens on next click.
  }

  // ── internal ──────────────────────────────────────────────────────────

  _place(anchorX, anchorY, screenW, screenH) {
    // Compute total height so we can clamp.
    const popupH = this._totalH;

    // Prefer appearing below the anchor; flip up if it overflows.
    let x = anchorX;
    let y = anchorY + 6;
    if (y + popupH > screenH - 8) y = anchorY - popupH - 6;
    if (x + W > screenW - 8)      x = screenW - W - 8;
    x = Math.max(8, x);
    y = Math.max(8, y);

    this.position.set(x, y);
  }

  _draw(company) {
    this._content.removeChildren();

    const current = company?.currentWeather ?? null;
    let y = P;

    // ── Header ────────────────────────────────────────────────────────
    const title = new Text({
      text: '⛅ WEATHER',
      style: {
        fill:       TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   14,
        fontWeight: '700',
      },
    });
    title.position.set(P, y);
    this._content.addChild(title);

    const sub = new Text({
      text: 'Daily productivity modifier',
      style: {
        fill:       TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   11,
      },
    });
    sub.anchor.set(1, 0);
    sub.position.set(W - P, y + 2);
    this._content.addChild(sub);
    y += 26;

    y = divider(y, this._content);

    // ── Today ─────────────────────────────────────────────────────────
    y = sectionLabel('TODAY', y, this._content);

    if (current) {
      const color = SENT_COLORS[current.sentiment] ?? TEXT_DIM;
      const icon  = WEATHER_ICONS[current.id] ?? '?';

      const todayIcon = new Text({
        text: icon,
        style: { fontSize: 28 },
      });
      todayIcon.position.set(P, y);
      this._content.addChild(todayIcon);

      const todayName = new Text({
        text: current.label,
        style: {
          fill:       color,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   16,
          fontWeight: '700',
        },
      });
      todayName.position.set(P + 42, y + 4);
      this._content.addChild(todayName);

      const todayMod = new Text({
        text: fmtMod(current.modifier) + ' productivity',
        style: {
          fill:       color,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   11,
        },
      });
      todayMod.position.set(P + 42, y + 24);
      this._content.addChild(todayMod);

      y += 48;
    } else {
      const noData = new Text({
        text: 'Not yet rolled — starts on Day 2',
        style: {
          fill:       TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   11,
        },
      });
      noData.position.set(P, y);
      this._content.addChild(noData);
      y += 22;
    }

    y += 4;
    y = divider(y, this._content);

    // ── All conditions ────────────────────────────────────────────────
    y = sectionLabel('ALL CONDITIONS  ·  Equal 20% chance each', y, this._content);

    for (const wt of WEATHER_TYPES) {
      const isActive = current?.id === wt.id;
      const color    = SENT_COLORS[wt.sentiment] ?? TEXT_DIM;
      const icon     = WEATHER_ICONS[wt.id] ?? '?';

      if (isActive) {
        const rowBg = new Graphics()
          .roundRect(4, y, W - 8, ROW_H, 4)
          .fill({ color: ROW_ACTIVE })
          .stroke({ color: ROW_BORDER, width: 1 });
        this._content.addChild(rowBg);
      }

      // Sentiment dot
      const dot = new Graphics()
        .circle(0, 0, 4)
        .fill({ color });
      dot.position.set(P + 4, y + ROW_H / 2);
      this._content.addChild(dot);

      // Icon
      const iconText = new Text({
        text: icon,
        style: { fontSize: 15 },
      });
      iconText.anchor.set(0, 0.5);
      iconText.position.set(P + 16, y + ROW_H / 2);
      this._content.addChild(iconText);

      // Label
      const nameText = new Text({
        text: wt.label,
        style: {
          fill:       isActive ? TEXT_BRIGHT : TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   12,
          fontWeight: isActive ? '700' : '400',
        },
      });
      nameText.anchor.set(0, 0.5);
      nameText.position.set(P + 44, y + ROW_H / 2);
      this._content.addChild(nameText);

      // Modifier
      const modText = new Text({
        text: fmtMod(wt.modifier),
        style: {
          fill:       color,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   12,
          fontWeight: '600',
        },
      });
      modText.anchor.set(1, 0.5);
      modText.position.set(W - P, y + ROW_H / 2);
      this._content.addChild(modText);

      // Active badge
      if (isActive) {
        const badge = new Text({
          text: '● today',
          style: {
            fill:       color,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize:   9,
            fontWeight: '600',
          },
        });
        badge.anchor.set(1, 0.5);
        badge.position.set(W - P - 44, y + ROW_H / 2);
        this._content.addChild(badge);
      }

      y += ROW_H;
    }

    y += 4;
    y = divider(y, this._content);

    // ── Formula ───────────────────────────────────────────────────────
    y = sectionLabel('PRODUCTIVITY FORMULA', y, this._content);

    const lines = [
      { label: 'Story Points',  value: 'Base SP  ×  Productivity' },
      { label: 'Productivity',  value: 'Employee Trait  ×  Weather' },
      { label: 'Employee Trait', value: '85 % – 105 %  (fixed at hire)' },
      { label: 'Weather',       value: '95 % – 105 %  (re-rolled daily)' },
    ];

    for (const { label, value } of lines) {
      const lbl = new Text({
        text: label,
        style: {
          fill:       TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   10,
        },
      });
      lbl.position.set(P, y);
      this._content.addChild(lbl);

      const val = new Text({
        text: value,
        style: {
          fill:       TEXT_BRIGHT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   10,
          fontWeight: '600',
        },
      });
      val.anchor.set(1, 0);
      val.position.set(W - P, y);
      this._content.addChild(val);

      y += 16;
    }

    y += P;

    // ── Background sized to content ───────────────────────────────────
    this._totalH = y;
    this._winBg
      .clear()
      .roundRect(0, 0, W, y, 8)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }
}
