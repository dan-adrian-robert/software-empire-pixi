/**
 * WeatherPopup
 *
 * Floating card that appears when the player clicks the weather indicator
 * in the top bar. Shows today's condition and the full table of possible
 * weather states with their productivity modifiers.
 *
 * Usage:
 *   popup.open(company, anchorX, anchorY, screenW, screenH)
 *   popup.close()
 *   popup.resize(screenW, screenH)
 *   popup.refresh(company)
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { WEATHER_TYPES } from '../data/weatherTypes.js';
import { Column } from './layouts/Column.js';
import { Row } from './layouts/Row.js';
import { Spacer } from './layouts/Spacer.js';
import { Label } from './widgets/Label.js';
import { Avatar } from './widgets/Avatar.js';
import { Divider } from './widgets/Divider.js';
import { Component } from './foundation/Component.js';
import { Theme } from './foundation/Theme.js';
import { getUiLogoTex } from '../utils/uiLogoSprite.js';

// ── dimensions ────────────────────────────────────────────────────────────────
const W   = 304;
const P   = 14;
const ROW_H = 30;
const RADIUS = 8;

// ── helpers ───────────────────────────────────────────────────────────────────

const SENT_COLORS = {
  bad:     0xf87171,
  neutral: Theme.colors.textDim,
  good:    Theme.colors.success,
};

const WEATHER_LOGO_FRAMES = {
  very_bad:  'cloud_rain',
  bad:       'cloud',
  neutral:   'cloud_sun',
  good:      'cloud_sun',
  very_good: 'sun',
};

function fmtMod(modifier) {
  const delta = (modifier - 1) * 100;
  return delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
}

// ── WeatherConditionRow ───────────────────────────────────────────────────────
// Custom Component because it needs a sentiment-colored dot (Graphics) and
// an active-row background highlight — both outside the widget set.

class WeatherConditionRow extends Component {
  constructor({ wt, isActive, width }) {
    super({ width, height: ROW_H });
    this._wt = wt;
    this._isActive = isActive;
    this.render();
  }

  render() {
    this.removeChildren();
    const { wt, isActive } = { wt: this._wt, isActive: this._isActive };
    const color = SENT_COLORS[wt.sentiment] ?? Theme.colors.textDim;
    const w     = this.props.width;

    // Active-row highlight background
    if (isActive) {
      const bg = new Graphics()
        .roundRect(0, 0, w, ROW_H, 4)
        .fill({ color: 0x0e2040 })
        .stroke({ color: Theme.colors.border, width: 1 });
      this.addChild(bg);
    }

    // Sentiment dot
    const dot = new Graphics().circle(4, ROW_H / 2, 4).fill({ color });
    this.addChild(dot);

    // Icon + name row at the left
    const nameRow = new Row({ gap: 4, align: 'center', height: ROW_H });
    const rowIconTex = getUiLogoTex(WEATHER_LOGO_FRAMES[wt.id]);
    nameRow.add(new Avatar({ texture: rowIconTex, size: 15 }));
    nameRow.add(new Label({
      text: wt.label,
      variant: isActive ? 'body' : 'caption',
      ...(isActive ? {} : {}),
    }));
    nameRow.position.set(P + 14, 0);
    this.addChild(nameRow);

    // Modifier (right-aligned)
    const modLabel = new Label({
      text: fmtMod(wt.modifier),
      style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 12, fontWeight: '600' },
    });
    modLabel.render?.();
    // Measure and right-align after first render
    const modW = modLabel._measuredWidth || 48;
    modLabel.position.set(w - P - modW, (ROW_H - (modLabel._measuredHeight || 14)) / 2);
    this.addChild(modLabel);

    // "● today" badge for active row
    if (isActive) {
      const badge = new Label({
        text: '● today',
        style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 9, fontWeight: '600' },
      });
      badge.position.set(w - P - modW - 52, (ROW_H - 10) / 2);
      this.addChild(badge);
    }
  }

  measure() {
    return { width: this.props.width, height: ROW_H };
  }
}

// ── TodaySection ─────────────────────────────────────────────────────────────

class TodaySection extends Component {
  constructor({ current, width }) {
    super({ width, height: current ? 48 : 22 });
    this._current = current;
    this.render();
  }

  render() {
    this.removeChildren();
    const current = this._current;
    const w = this.props.width;

    if (!current) {
      this.add(new Label({ text: 'Not yet rolled — starts on Day 2', variant: 'caption' }));
      return;
    }

    const color = SENT_COLORS[current.sentiment] ?? Theme.colors.textDim;

    const todayIconTex = getUiLogoTex(WEATHER_LOGO_FRAMES[current.id]);
    if (todayIconTex) {
      const iconSprite = new Sprite(todayIconTex);
      const scale = 28 / todayIconTex.height;
      iconSprite.scale.set(scale);
      iconSprite.position.set(0, 0);
      this.addChild(iconSprite);
    }

    const nameLabel = new Label({
      text: current.label,
      style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 16, fontWeight: '700' },
    });
    nameLabel.position.set(42, 4);
    this.addChild(nameLabel);

    const modLabel = new Label({
      text: fmtMod(current.modifier) + ' productivity',
      style: { fill: color, fontFamily: Theme.typography.fontFamily, fontSize: 11 },
    });
    modLabel.position.set(42, 24);
    this.addChild(modLabel);

    void w; // width used by parent layout only
  }

  measure() {
    return { width: this.props.width, height: this._current ? 48 : 22 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export class WeatherPopup extends Container {
  constructor() {
    super();
    this.visible  = false;
    this._company = null;
    this._winBg   = new Graphics();
    this._col     = null;
    this.addChild(this._winBg);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  open(company, anchorX, anchorY, screenW, screenH) {
    this._company = company;
    this._rebuild(company);
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
    this._rebuild(company);
  }

  resize(_screenW, _screenH) {
    // Popup re-opens on the next chip click, so no re-positioning needed.
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  _place(anchorX, anchorY, screenW, screenH) {
    const popupH = this._col?._measuredHeight ?? 200;
    let x = anchorX;
    let y = anchorY + 6;
    if (y + popupH > screenH - 8) y = anchorY - popupH - 6;
    if (x + W > screenW - 8)      x = screenW - W - 8;
    x = Math.max(8, x);
    y = Math.max(8, y);
    this.position.set(x, y);
  }

  _rebuild(company) {
    if (this._col) this.removeChild(this._col);

    const current = company?.currentWeather ?? null;
    const innerW  = W - P * 2;

    const col = new Column({ width: W, gap: 0, padding: P });

    // Header row: title left, subtitle right
    const headerRow = new Row({ width: innerW, gap: 0, align: 'center', height: 20 });
    headerRow.add(new Label({ text: 'WEATHER', variant: 'title' }));
    headerRow.add(new Spacer({ flex: 1 }));
    headerRow.add(new Label({ text: 'Daily productivity modifier', variant: 'caption' }));
    col.add(headerRow);
    col.add(new Divider({ length: innerW, color: Theme.colors.divider }));

    // Today section
    col.add(new Label({ text: 'TODAY', variant: 'sectionHeader' }));
    col.add(new TodaySection({ current, width: innerW }));
    col.add(new Divider({ length: innerW, color: Theme.colors.divider }));

    // All conditions
    col.add(new Label({ text: 'ALL CONDITIONS  ·  Equal 20% chance each', variant: 'sectionHeader' }));
    for (const wt of WEATHER_TYPES) {
      col.add(new WeatherConditionRow({ wt, isActive: current?.id === wt.id, width: innerW }));
    }
    col.add(new Divider({ length: innerW, color: Theme.colors.divider }));

    // Formula section
    col.add(new Label({ text: 'PRODUCTIVITY FORMULA', variant: 'sectionHeader' }));
    const formulaLines = [
      { label: 'Story Points',   value: 'Base SP  ×  Productivity' },
      { label: 'Productivity',   value: 'Employee Trait  ×  Weather' },
      { label: 'Employee Trait', value: '85 % – 105 %  (fixed at hire)' },
      { label: 'Weather',        value: '95 % – 105 %  (re-rolled daily)' },
    ];
    for (const { label, value } of formulaLines) {
      const row = new Row({ width: innerW, gap: 0, align: 'center', height: 16 });
      row.add(new Label({ text: label, variant: 'caption' }));
      row.add(new Spacer({ flex: 1 }));
      row.add(new Label({ text: value, variant: 'body' }));
      col.add(row);
    }

    this._col = col;
    this.addChild(col);

    // Background sized to the measured column height
    const totalH = col._measuredHeight;
    this._winBg
      .clear()
      .roundRect(0, 0, W, totalH, RADIUS)
      .fill({ color: Theme.colors.bg })
      .stroke({ color: Theme.colors.border, width: 1.5 });
  }
}
