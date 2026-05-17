/**
 * EmployeeStatsPopup
 *
 * Small floating card that appears next to an employee when clicked.
 * Shows name, salary, current assignment, and all skill bars.
 *
 * Usage:
 *   popup.open(emp, company, anchorX, anchorY, screenW, screenH)
 *   popup.close()
 *   popup.resize(screenW, screenH)          – keeps backdrop in sync on resize
 *   popup.refresh(company)                  – re-draw content while open
 */
import { Container, Graphics, Text } from 'pixi.js';
import {
  SKILLS,
  SKILL_LABELS_SHORT,
  SKILL_COLORS,
  MAX_SKILL_LEVEL,
} from '../data/skills.js';
import { SCHEDULE_CYCLE } from '../state/Employee.js';

const POPUP_W = 268;
const P = 14;                  // inner padding

const BG = 0x0b1422;
const BORDER = 0x2a4a8a;
const DIVIDER = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const SALARY_COLOR = 0xfbbf24;
const ACTIVE_COLOR = 0x4ade80;

// Skill bar
const BAR_CELL = 10;
const BAR_GAP = 2;
const BAR_TRACK_W = MAX_SKILL_LEVEL * BAR_CELL + (MAX_SKILL_LEVEL - 1) * BAR_GAP;
const BAR_EMPTY_COLOR = 0x1f2a44;
const BAR_EMPTY_BORDER = 0x2a3554;
const LABEL_W = 62;
const SKILL_ROW_H = 20;

const ALL_SKILLS = Object.values(SKILLS);

const SCHEDULE_ICONS = { WORK: '💻', BREAK: '☕', TALK: '💬' };

// Warning colours (shown when employee has no project assignment)
const WARN_BG     = 0x1a1000;
const WARN_BORDER = 0xfbbf24;
const WARN_TEXT   = 0xfbbf24;
const WARN_DIM    = 0x8a7040;

export class EmployeeStatsPopup extends Container {
  constructor() {
    super();
    this.visible = false;
    this._emp = null;
    this._screenW = 0;
    this._screenH = 0;
    this._popupH = 300;

    this._winBg = new Graphics();
    this._content = new Container();

    this.addChild(this._winBg);
    this.addChild(this._content);
  }

  get currentEmp() { return this._emp; }

  // -------------------------------------------------------------------------

  open(emp, company, anchorX, anchorY, screenW, screenH) {
    this._emp = emp;
    this._screenW = screenW;
    this._screenH = screenH;

    // Draw first so _popupH is set before placement.
    this._draw(emp, company);
    this._placeWindow(anchorX, anchorY, screenW, screenH);
    this.visible = true;
  }

  close() {
    this._emp = null;
    this.visible = false;
  }

  resize(screenW, screenH) {
    this._screenW = screenW;
    this._screenH = screenH;
    // No repositioning needed — popup will re-open on next click.
  }

  /** Re-draw skill/status content while popup stays open (e.g. every 0.2s tick). */
  refresh(company) {
    if (!this.visible || !this._emp) return;
    this._draw(this._emp, company);
  }

  // -------------------------------------------------------------------------

  _placeWindow(anchorX, anchorY, screenW, screenH) {
    // Try right of anchor first, then left.
    let x = anchorX + 8;
    if (x + POPUP_W > screenW - 8) x = anchorX - POPUP_W - 8;
    x = Math.max(8, x);

    // Use the last computed content height (set at end of _draw).
    const h = this._popupH ?? 300;
    let y = anchorY;
    if (y + h > screenH - 8) y = screenH - h - 8;
    y = Math.max(8, y);

    this.position.set(x, y);
  }

  _draw(emp, company) {
    this._content.removeChildren();

    let y = P;

    // ── Name ─────────────────────────────────────────────
    const nameText = new Text({
      text: emp.name,
      style: {
        fill: TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '700',
      },
    });
    nameText.position.set(P, y);
    this._content.addChild(nameText);

    const salaryText = new Text({
      text: `$${emp.salary}/day`,
      style: {
        fill: SALARY_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(POPUP_W - P, y + 2);
    this._content.addChild(salaryText);
    y += 26;

    // ── Status ───────────────────────────────────────────
    const proj = emp.activeProjectId
      ? company.activeProjects.find((p) => p.id === emp.activeProjectId)
      : null;
    const statusText = new Text({
      text: proj ? `Working on: ${proj.name}` : 'Idle',
      style: {
        fill: proj ? ACTIVE_COLOR : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: proj ? '600' : '400',
      },
    });
    statusText.position.set(P, y);
    this._content.addChild(statusText);
    y += 22;

    // ── Divider ──────────────────────────────────────────
    const div = new Graphics()
      .moveTo(8, y)
      .lineTo(POPUP_W - 8, y)
      .stroke({ color: DIVIDER, width: 1 });
    this._content.addChild(div);
    y += 8;

    // ── Skills ───────────────────────────────────────────
    const levelBySkill = Object.create(null);
    for (const sk of emp.skills) levelBySkill[sk.skill] = sk.level;

    for (const skillKey of ALL_SKILLS) {
      const level = levelBySkill[skillKey] ?? 0;
      const color = SKILL_COLORS[skillKey] ?? 0x4a9eff;
      const row = this._makeSkillRow(skillKey, level, color);
      row.position.set(P, y);
      this._content.addChild(row);
      y += SKILL_ROW_H;
    }

    // ── Bottom section: warning OR schedule ──────────────
    const div2 = new Graphics()
      .moveTo(8, y)
      .lineTo(POPUP_W - 8, y)
      .stroke({ color: DIVIDER, width: 1 });
    this._content.addChild(div2);
    y += 8;

    if (emp.pinnedProjectId === null) {
      // ── Unassigned warning ──────────────────────────────
      const boxH = 52;
      const warnBox = new Graphics()
        .roundRect(P, y, POPUP_W - P * 2, boxH, 6)
        .fill({ color: WARN_BG })
        .stroke({ color: WARN_BORDER, width: 1 });
      this._content.addChild(warnBox);

      const warnIcon = new Text({
        text: '⚠ Not assigned to a project',
        style: {
          fill:       WARN_TEXT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   12,
          fontWeight: '700',
        },
      });
      warnIcon.position.set(P + 10, y + 10);
      this._content.addChild(warnIcon);

      const warnSub = new Text({
        text: 'Assign via the Assignments panel\nto start producing story points.',
        style: {
          fill:       WARN_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   10,
        },
      });
      warnSub.position.set(P + 10, y + 28);
      this._content.addChild(warnSub);

      y += boxH + P;
    } else {
      // ── Schedule ────────────────────────────────────────
      const schedLabel = new Text({
        text: 'SCHEDULE',
        style: {
          fill:       TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   9,
          fontWeight: '700',
        },
      });
      schedLabel.position.set(P, y);
      this._content.addChild(schedLabel);
      y += 16;

      const schedRow = this._makeScheduleRow();
      schedRow.position.set(P, y);
      this._content.addChild(schedRow);
      y += 20 + P;
    }

    // ── Background sized to content ──────────────────────
    this._popupH = y;
    this._winBg
      .clear()
      .roundRect(0, 0, POPUP_W, y, 8)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }

  _makeScheduleRow() {
    const row = new Container();
    let x = 0;
    SCHEDULE_CYCLE.forEach((state, i) => {
      if (i > 0) {
        const arrow = new Text({
          text: '→',
          style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
        });
        arrow.anchor.set(0, 0.5);
        arrow.position.set(x, 9);
        row.addChild(arrow);
        x += 14;
      }
      const cell = new Container();
      const icon = new Text({ text: SCHEDULE_ICONS[state] ?? '', style: { fontSize: 13 } });
      icon.anchor.set(0, 0.5);
      icon.position.set(0, 9);
      cell.addChild(icon);
      const lbl = new Text({
        text: state[0] + state.slice(1).toLowerCase(),
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
      });
      lbl.anchor.set(0.5, 0);
      lbl.position.set(9, 18);
      cell.addChild(lbl);
      cell.position.set(x, 0);
      row.addChild(cell);
      x += 38;
    });
    return row;
  }

  _makeSkillRow(skillKey, level, color) {
    const row = new Container();
    const filled = Math.max(0, Math.min(MAX_SKILL_LEVEL, level));

    const label = new Text({
      text: SKILL_LABELS_SHORT[skillKey] ?? skillKey,
      style: {
        fill: level > 0 ? TEXT_BRIGHT : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: level > 0 ? '600' : '400',
      },
    });
    label.anchor.set(0, 0.5);
    label.position.set(0, SKILL_ROW_H / 2);
    row.addChild(label);

    const track = new Graphics();
    for (let i = 0; i < MAX_SKILL_LEVEL; i++) {
      const cx = i * (BAR_CELL + BAR_GAP);
      const isFilled = i < filled;
      track
        .roundRect(cx, 0, BAR_CELL, BAR_CELL, 1.5)
        .fill({ color: isFilled ? color : BAR_EMPTY_COLOR })
        .stroke({ color: isFilled ? color : BAR_EMPTY_BORDER, width: 1, alpha: isFilled ? 1 : 0.6 });
    }
    track.position.set(LABEL_W + 8, (SKILL_ROW_H - BAR_CELL) / 2);
    row.addChild(track);

    if (level > 0) {
      const numText = new Text({
        text: String(level),
        style: {
          fill: color,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
          fontWeight: '700',
        },
      });
      numText.anchor.set(0, 0.5);
      numText.position.set(LABEL_W + 8 + BAR_TRACK_W + 6, SKILL_ROW_H / 2);
      row.addChild(numText);
    }

    return row;
  }
}

export { POPUP_W as STATS_POPUP_W };
