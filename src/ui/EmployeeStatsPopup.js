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
import { SCHEDULE_CYCLE, isProgrammer, isTeamLead } from '../state/Employee.js';
import { ROLE_LABELS } from '../data/staffRoles.js';
import { GameConfig } from '../config.js';

const POPUP_W = 240;
const P = 14;                  // inner padding

const BG = 0x0b1422;
const BORDER = 0x2a4a8a;
const DIVIDER = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const SALARY_COLOR = 0xfbbf24;
const ACTIVE_COLOR = 0x4ade80;

// Skill bar
const BAR_CELL = 7;
const BAR_GAP  = 2;
const BAR_TRACK_W   = MAX_SKILL_LEVEL * BAR_CELL + (MAX_SKILL_LEVEL - 1) * BAR_GAP;
const BAR_EMPTY_COLOR  = 0x1f2a44;
const BAR_EMPTY_BORDER = 0x2a3554;
const LABEL_W     = 56;
const SKILL_ROW_H = 16;

const ALL_SKILLS = Object.values(SKILLS);

const SCHEDULE_ICONS = { WORK: '💻', BREAK: '☕', TALK: '💬' };

// EXP bar
const EXP_COLOR       = 0x818cf8;  // indigo
const EXP_EMPTY_COLOR = 0x1a1a3a;

// Skill upgrade section
const UPGRADE_HEADER_COLOR = 0x818cf8;
const UPGRADE_BTN_BG       = 0x12102a;
const UPGRADE_BTN_BORDER   = 0x818cf8;

// Warning colours (shown when employee has no project assignment)
const WARN_BG     = 0x1a1000;
const WARN_BORDER = 0xfbbf24;
const WARN_TEXT   = 0xfbbf24;
const WARN_DIM    = 0x8a7040;

export class EmployeeStatsPopup extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;
    this.visible = false;
    this._emp = null;
    this._screenW = 0;
    this._screenH = 0;
    this._popupH = 300;
    this._anchorX = 0;
    this._anchorY = 0;

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
    this._anchorX = anchorX;
    this._anchorY = anchorY;

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
    if (this.visible) {
      this._placeWindow(this._anchorX, this._anchorY, screenW, screenH);
    }
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

    if (isProgrammer(emp)) {
      this._drawProgrammer(emp, company);
    } else {
      this._drawOtherStaff(emp, company);
    }
  }

  _drawOtherStaff(emp, company) {
    let y = P;

    // Name
    const nameText = new Text({
      text: emp.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: '700' },
    });
    nameText.position.set(P, y);
    this._content.addChild(nameText);

    const salaryText = new Text({
      text: `$${emp.salary}/day`,
      style: { fill: SALARY_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: '600' },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(POPUP_W - P, y + 2);
    this._content.addChild(salaryText);
    y += 22;

    // Role badge
    const roleText = new Text({
      text: ROLE_LABELS[emp.role] ?? emp.role,
      style: { fill: EXP_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
    });
    roleText.position.set(P, y);
    this._content.addChild(roleText);
    y += 20;

    // Activity — role-specific
    if (isTeamLead(emp)) {
      // Level row
      const levelText = new Text({
        text: `Level ${emp.level}`,
        style: { fill: 0x818cf8, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
      });
      levelText.position.set(P, y);
      this._content.addChild(levelText);
      y += 18;

      // EXP buff row
      const buffPct = Math.round(emp.level * 5);
      const buffText = new Text({
        text: `EXP buff: +${buffPct}%`,
        style: { fill: 0x4ade80, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
      });
      buffText.position.set(P, y);
      this._content.addChild(buffText);
      y += 18;

      // Team row
      const team = this.game?.sim?.teamSystem?.getTeamForEmployee(company, emp.id);
      const teamStr = team
        ? `${team.name} (${team.memberIds.length} member${team.memberIds.length !== 1 ? 's' : ''})`
        : 'No team yet';
      const teamText = new Text({
        text: teamStr,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      });
      teamText.position.set(P, y);
      this._content.addChild(teamText);
      y += 20;
    } else {
      const hasProjects = company.activeProjects.length > 0;
      const statusText = new Text({
        text: hasProjects ? 'Monitoring projects' : 'Idle — no active projects',
        style: {
          fill: hasProjects ? ACTIVE_COLOR : TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: hasProjects ? '600' : '400',
        },
      });
      statusText.position.set(P, y);
      this._content.addChild(statusText);
      y += 20;
    }

    // Divider
    this._content.addChild(new Graphics()
      .moveTo(8, y).lineTo(POPUP_W - 8, y)
      .stroke({ color: DIVIDER, width: 1 }));
    y += 8;

    // Schedule
    const schedLabel = new Text({
      text: 'SCHEDULE',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    schedLabel.position.set(P, y);
    this._content.addChild(schedLabel);
    y += 16;

    const schedRow = this._makeScheduleRow();
    schedRow.position.set(P, y);
    this._content.addChild(schedRow);
    y += 20 + P;

    y = this._appendMuteButton(emp, company, y);

    this._popupH = y;
    this._winBg
      .clear()
      .roundRect(0, 0, POPUP_W, y, 8)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }

  _drawProgrammer(emp, company) {
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
    y += 18;

    // ── Level + EXP bar ──────────────────────────────────
    const { EXP_PER_LEVEL } = GameConfig.gameplay;
    const expFrac = Math.min(1, (emp.exp ?? 0) / EXP_PER_LEVEL);

    const levelLabel = new Text({
      text: `Lv. ${emp.level ?? 0}`,
      style: {
        fill: EXP_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '700',
      },
    });
    levelLabel.position.set(P, y);
    this._content.addChild(levelLabel);

    const expBarW = POPUP_W - P * 2 - 46;  // reserve left for "Lv. N"
    const expBarX = P + 40;
    const expBarH = 6;

    const expBg = new Graphics()
      .roundRect(0, 0, expBarW, expBarH, 2)
      .fill({ color: EXP_EMPTY_COLOR });
    expBg.position.set(expBarX, y + 2);
    this._content.addChild(expBg);

    if (expFrac > 0) {
      const expFill = new Graphics()
        .roundRect(0, 0, Math.max(0, expBarW * expFrac), expBarH, 2)
        .fill({ color: EXP_COLOR, alpha: 0.85 });
      expFill.position.set(expBarX, y + 2);
      this._content.addChild(expFill);
    }

    const expLabel = new Text({
      text: `${emp.exp ?? 0}/${EXP_PER_LEVEL}`,
      style: {
        fill: TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
      },
    });
    expLabel.anchor.set(1, 0);
    expLabel.position.set(POPUP_W - P, y);
    this._content.addChild(expLabel);
    y += 16;

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

    // ── Skill upgrade section (if pending points) ────────
    if ((emp.pendingSkillPoints ?? 0) > 0) {
      const upgradableSkills = emp.skills.filter(
        (s) => s.level >= 1 && s.level < MAX_SKILL_LEVEL,
      );

      const upgradeHeader = new Text({
        text: `SKILL UPGRADE  (${emp.pendingSkillPoints} available)`,
        style: {
          fill:       UPGRADE_HEADER_COLOR,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   9,
          fontWeight: '700',
        },
      });
      upgradeHeader.position.set(P, y);
      this._content.addChild(upgradeHeader);
      y += 16;

      const BTN_H   = 24;
      const BTN_GAP = 6;
      const BTN_W   = Math.floor((POPUP_W - P * 2 - BTN_GAP * (upgradableSkills.length - 1)) / Math.max(1, upgradableSkills.length));

      upgradableSkills.forEach((sk, i) => {
        const btnX   = P + i * (BTN_W + BTN_GAP);
        const skColor = SKILL_COLORS[sk.skill] ?? 0x4a9eff;
        const btnBg  = new Graphics()
          .roundRect(0, 0, BTN_W, BTN_H, 4)
          .fill({ color: UPGRADE_BTN_BG })
          .stroke({ color: skColor, width: 1, alpha: 0.7 });
        btnBg.position.set(btnX, y);
        btnBg.eventMode = 'static';
        btnBg.cursor = 'pointer';

        const btnLabel = new Text({
          text: `${SKILL_LABELS_SHORT[sk.skill] ?? sk.skill} ${sk.level}→${sk.level + 1}`,
          style: {
            fill:       skColor,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize:   10,
            fontWeight: '600',
          },
        });
        btnLabel.anchor.set(0.5, 0.5);
        btnLabel.position.set(BTN_W / 2, BTN_H / 2);
        btnBg.addChild(btnLabel);

        btnBg.on('pointerup', () => {
          const ok = this.game.sim.upgradeEmployeeSkill(emp, sk.skill);
          if (ok) this._draw(emp, company);
        });
        btnBg.on('pointerover', () => { btnBg.alpha = 0.75; });
        btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

        this._content.addChild(btnBg);
      });
      y += BTN_H + 8;
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
      const boxH = 60;
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

    y = this._appendMuteButton(emp, company, y);

    // ── Background sized to content ──────────────────────
    this._popupH = y;
    this._winBg
      .clear()
      .roundRect(0, 0, POPUP_W, y, 8)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }

  /**
   * Renders a Mute / Unmute logs toggle button spanning the popup width.
   * Returns the updated y cursor.
   */
  _appendMuteButton(emp, company, y) {
    const btnW   = POPUP_W - P * 2;
    const btnH   = 24;
    const muted  = emp.logsMuted;
    const bgColor  = muted ? 0x2a2000 : 0x0d1526;
    const clrColor = muted ? 0xfbbf24 : 0x4a5a7a;

    const btnBg = new Graphics()
      .roundRect(P, y, btnW, btnH, 5)
      .fill({ color: bgColor })
      .stroke({ color: clrColor, width: 1, alpha: 0.8 });
    btnBg.eventMode = 'static';
    btnBg.cursor = 'pointer';

    const label = new Text({
      text: muted ? '🔕 Unmute logs' : '🔔 Mute logs',
      style: {
        fill: clrColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '600',
      },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(P + btnW / 2, y + btnH / 2);
    label.eventMode = 'none';

    btnBg.on('pointerup', () => {
      emp.logsMuted = !emp.logsMuted;
      this._draw(emp, company);
    });
    btnBg.on('pointerover', () => { btnBg.alpha = 0.75; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

    this._content.addChild(btnBg);
    this._content.addChild(label);

    return y + btnH + P;
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

    // Right-align the label so all labels end at the same x,
    // giving every row a consistent gap before the bar track.
    const label = new Text({
      text: SKILL_LABELS_SHORT[skillKey] ?? skillKey,
      style: {
        fill: level > 0 ? TEXT_BRIGHT : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: level > 0 ? '600' : '400',
      },
    });
    label.anchor.set(1, 0.5);
    label.position.set(LABEL_W, SKILL_ROW_H / 2);
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

    // Right-align the level number to the right edge of the row content.
    const NUM_X = POPUP_W - 2 * P;
    const numText = new Text({
      text: level > 0 ? String(level) : '',
      style: {
        fill: color,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '700',
      },
    });
    numText.anchor.set(1, 0.5);
    numText.position.set(NUM_X, SKILL_ROW_H / 2);
    row.addChild(numText);

    return row;
  }
}

export { POPUP_W as STATS_POPUP_W };
