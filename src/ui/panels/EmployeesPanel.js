/**
 * EmployeesPanel
 *
 * Lists current employees in a 2-column grid. Each card layout:
 *   Name + level + salary
 *   Activity (working on / idle)
 *   ── divider ──
 *   Skill rows (one per line: label | bar | level)
 *   [SKILL UPGRADE section — only when pendingSkillPoints > 0]
 *   ── divider ──
 *   Schedule
 *   Fire button (bottom-right)
 *
 * Card height is computed dynamically so the optional upgrade section
 * does not leave a blank gap on cards that don't need it.
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Button } from '../framework/index.js';
import { getCharacterAvatarTex } from '@utils/characterSprite.js';
import {
  SKILLS,
  SKILL_LABELS_SHORT,
  SKILL_COLORS,
  MAX_SKILL_LEVEL,
  skillUpgradeCap,
} from '@/data/skills.js';
import { isProgrammer, isTeamLead } from '@/state/Employee.js';
import { SCHEDULE_CYCLE, SCHEDULE_LOGO_FRAMES } from '@/data/scheduleActivities.js';
import { createLogoSprite } from '@utils/uiLogoSprite.js';
import { ROLE_LABELS } from '@/data/staffRoles.js';

const CARD_BG = 0x131929;
const CARD_BORDER = 0x1e3050;
const DIVIDER_COLOR = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const SALARY_COLOR = 0xfbbf24;
const ACTIVITY_COLOR = 0x4ade80;
const SECTION_LABEL_COLOR = 0x7a86a3;
const PADDING = 12;
const INNER = 14;
const COL_COUNT = 2;
const COL_GAP = 8;
const ROW_GAP = 8;

// Character avatar shown in each card header
const AVATAR_SIZE = 36;   // square display size (px) — compact for 2-column grid
const AVATAR_GAP  = 8;    // gap between avatar and text column

// Skill bar cells — sized to fit half-width cards
const BAR_CELL = 10;
const BAR_GAP = 2;
const BAR_EMPTY_COLOR = 0x1f2a44;
const BAR_EMPTY_BORDER = 0x2a3554;

const SKILL_ROW_H = 22;
const LABEL_W = 56;
const LABEL_GAP = 8;

const ALL_SKILLS = Object.values(SKILLS);

const SCHED_SECTION_H = 12 + 4 + 20; // label + gap + icon row

// Fixed-height sections
const NAME_H = 20;
const ACTIVITY_H = 18;
const HEADER_H = 12 + NAME_H + 6 + ACTIVITY_H + 10;
const DIVIDER_H = 1;
const SKILLS_H = ALL_SKILLS.length * SKILL_ROW_H;

// Upgrade section
const UPGRADE_BTN_H = 26;
const UPGRADE_HEADER_COLOR = 0x818cf8;
const UPGRADE_BTN_BG = 0x12102a;
const UPGRADE_BTN_BORDER = 0x818cf8;

export class EmployeesPanel extends Container {
  /** @param {import('../../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;
    this._scroll = new Container();
    this.addChild(this._scroll);
    this._width = 600;
    this._height = 500;
  }

  init(x, y, width, height) {
    this._width = width;
    this._height = height;
    this.position.set(x, y);
    this.refresh();
  }

  resize(x, y, width, height) {
    this._width = width;
    this._height = height;
    this.position.set(x, y);
    this.refresh();
  }

  refresh() {
    this._scroll.removeChildren();
    const company = this.game.sim?.company;
    if (!company) return;

    let y = 0;

    const header = new Text({
      text: `EMPLOYEES — ${company.employees.length}/${company.office.desks} DESKS`,
      style: {
        fill: SECTION_LABEL_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
      },
    });
    header.position.set(PADDING, y);
    this._scroll.addChild(header);
    y += 24;

    if (company.employees.length === 0) {
      const empty = new Text({
        text: 'No employees. Hire someone from the Hiring screen.',
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      });
      empty.position.set(PADDING + 8, y);
      this._scroll.addChild(empty);
      return;
    }

    const cardW = Math.floor((this._width - PADDING * 2 - COL_GAP * (COL_COUNT - 1)) / COL_COUNT);

    for (let i = 0; i < company.employees.length; i += COL_COUNT) {
      let rowH = 0;
      for (let col = 0; col < COL_COUNT && i + col < company.employees.length; col++) {
        const startX = PADDING + col * (cardW + COL_GAP);
        const cardH  = this._buildCard(company.employees[i + col], company, y, startX, cardW);
        rowH = Math.max(rowH, cardH);
      }
      y += rowH + ROW_GAP;
    }
  }

  // -------------------------------------------------------------------------

  /**
   * Build one employee card starting at startY.
   * Returns the actual card height so refresh() can stack cards correctly.
   *
   * @param {object} emp
   * @param {object} company
   * @param {number} startY
   * @param {number} startX
   * @param {number} cardW
   * @returns {number} card height in pixels
   */
  _buildCard(emp, company, startY, startX, cardW) {
    return isProgrammer(emp)
      ? this._buildProgrammerCard(emp, company, startY, startX, cardW)
      : this._buildOtherCard(emp, company, startY, startX, cardW);
  }

  _buildProgrammerCard(emp, company, startY, startX, cardW) {
    const textIndent = INNER + AVATAR_SIZE + AVATAR_GAP;
    const bgIndex = this._scroll.children.length;

    // ── Avatar ────────────────────────────────────────────
    const avatarSprite = new Sprite(getCharacterAvatarTex(emp.characterIndex));
    avatarSprite.width  = AVATAR_SIZE;
    avatarSprite.height = AVATAR_SIZE;
    avatarSprite.position.set(startX + INNER, startY + 10);
    this._scroll.addChild(avatarSprite);

    // ── Name ─────────────────────────────────────────────
    const nameText = new Text({
      text: emp.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: '700' },
    });
    nameText.position.set(startX + textIndent, startY + 12);
    this._scroll.addChild(nameText);

    const levelBadge = new Text({
      text: `Lv. ${emp.level ?? 0}`,
      style: { fill: 0x818cf8, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700' },
    });
    levelBadge.anchor.set(1, 0);
    levelBadge.position.set(startX + cardW - INNER - 62, startY + 13);
    this._scroll.addChild(levelBadge);

    const salaryText = new Text({
      text: `$${emp.salary}/day`,
      style: { fill: SALARY_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(startX + cardW - INNER, startY + 13);
    this._scroll.addChild(salaryText);

    // ── Activity ─────────────────────────────────────────
    const proj = emp.activeProjectId
      ? company.activeProjects.find((p) => p.id === emp.activeProjectId)
      : null;
    const activityText = new Text({
      text: proj ? `Working on: ${proj.name}` : 'Idle',
      style: {
        fill: proj ? ACTIVITY_COLOR : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: proj ? '600' : '400',
        wordWrap: true,
        wordWrapWidth: cardW - textIndent - INNER,
      },
    });
    activityText.position.set(startX + textIndent, startY + 12 + NAME_H + 4);
    this._scroll.addChild(activityText);

    // ── Top divider ──────────────────────────────────────
    const divY1 = startY + HEADER_H;
    this._scroll.addChild(new Graphics()
      .moveTo(startX + 8, divY1).lineTo(startX + cardW - 8, divY1)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));

    // ── Skills ───────────────────────────────────────────
    const levelBySkill = Object.create(null);
    const potentialBySkill = Object.create(null);
    for (const sk of emp.skills) {
      levelBySkill[sk.skill] = sk.level;
      potentialBySkill[sk.skill] = sk.potential;
    }
    const contentW = cardW - INNER * 2;

    const skillStartY = divY1 + 8;
    ALL_SKILLS.forEach((skillKey, i) => {
      const rowY = skillStartY + i * SKILL_ROW_H;
      const level = levelBySkill[skillKey] ?? 0;
      const color = SKILL_COLORS[skillKey] ?? 0x4a9eff;
      const potential = potentialBySkill[skillKey];
      const row = this._makeSkillRow(skillKey, level, color, contentW, potential);
      row.position.set(startX + INNER, rowY);
      this._scroll.addChild(row);
    });

    let y = skillStartY + SKILLS_H + 10;

    // ── Skill upgrade section ─────────────────────────────
    if ((emp.pendingSkillPoints ?? 0) > 0) {
      const upgradable = emp.skills.filter((s) => s.level >= 1 && s.level < skillUpgradeCap(s));

      const upgradeHeader = new Text({
        text: `SKILL UPGRADE  (${emp.pendingSkillPoints} available)`,
        style: { fill: UPGRADE_HEADER_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
      });
      upgradeHeader.position.set(startX + INNER, y);
      this._scroll.addChild(upgradeHeader);
      y += 16;

      const btnCount = Math.max(1, upgradable.length);
      const BTN_GAP = 6;
      const BTN_W = Math.floor((contentW - BTN_GAP * (btnCount - 1)) / btnCount);

      upgradable.forEach((sk, i) => {
        const btnX = startX + INNER + i * (BTN_W + BTN_GAP);
        const skColor = SKILL_COLORS[sk.skill] ?? 0x4a9eff;

        const btnBg = new Graphics()
          .roundRect(0, 0, BTN_W, UPGRADE_BTN_H, 4)
          .fill({ color: UPGRADE_BTN_BG })
          .stroke({ color: skColor, width: 1, alpha: 0.7 });
        btnBg.position.set(btnX, y);
        btnBg.eventMode = 'static';
        btnBg.cursor = 'pointer';

        const btnLabel = new Text({
          text: `${SKILL_LABELS_SHORT[sk.skill] ?? sk.skill} ${sk.level}→${sk.level + 1}`,
          style: { fill: skColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '600' },
        });
        btnLabel.anchor.set(0.5, 0.5);
        btnLabel.position.set(BTN_W / 2, UPGRADE_BTN_H / 2);
        btnLabel.eventMode = 'none';
        btnBg.addChild(btnLabel);

        btnBg.on('pointerup', () => { if (this.game.sim.upgradeEmployeeSkill(emp, sk.skill)) this.refresh(); });
        btnBg.on('pointerover', () => { btnBg.alpha = 0.75; });
        btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

        this._scroll.addChild(btnBg);
      });
      y += UPGRADE_BTN_H + 10;
    }

    y = this._appendScheduleAndFire(emp, startX, cardW, y);

    const cardH = y - startY;
    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: CARD_BORDER, width: 1.5 });
    bg.position.set(startX, startY);
    this._scroll.addChildAt(bg, bgIndex);
    return cardH;
  }

  _buildOtherCard(emp, company, startY, startX, cardW) {
    const textIndent = INNER + AVATAR_SIZE + AVATAR_GAP;
    const bgIndex = this._scroll.children.length;

    // ── Avatar ────────────────────────────────────────────
    const avatarSprite = new Sprite(getCharacterAvatarTex(emp.characterIndex));
    avatarSprite.width  = AVATAR_SIZE;
    avatarSprite.height = AVATAR_SIZE;
    avatarSprite.position.set(startX + INNER, startY + 10);
    this._scroll.addChild(avatarSprite);

    // ── Name ─────────────────────────────────────────────
    const nameText = new Text({
      text: emp.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: '700' },
    });
    nameText.position.set(startX + textIndent, startY + 12);
    this._scroll.addChild(nameText);

    // Role label beneath name
    const roleText = new Text({
      text: ROLE_LABELS[emp.role] ?? emp.role,
      style: { fill: 0x818cf8, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '600' },
    });
    roleText.position.set(startX + textIndent, startY + 12 + NAME_H + 2);
    this._scroll.addChild(roleText);

    const salaryText = new Text({
      text: `$${emp.salary}/day`,
      style: { fill: SALARY_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '600' },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(startX + cardW - INNER, startY + 13);
    this._scroll.addChild(salaryText);

    // Activity line: role-specific text
    let activityStr;
    let activityColor;
    if (isTeamLead(emp)) {
      const teamSystem = this.game.sim?.teamSystem;
      const team = teamSystem?.getTeamForEmployee(company, emp.id);
      const memberCount = team ? team.memberIds.length : 0;
      const buffPct = Math.round(emp.level * 5);
      activityStr = team
        ? `${team.name} · ${memberCount} member${memberCount !== 1 ? 's' : ''} · +${buffPct}% EXP`
        : `Lv.${emp.level} · +${buffPct}% EXP buff`;
      activityColor = 0x4ade80;
    } else {
      const hasProjects = company.activeProjects.length > 0;
      activityStr   = hasProjects ? 'Monitoring projects' : 'Idle — no active projects';
      activityColor = hasProjects ? ACTIVITY_COLOR : TEXT_DIM;
    }
    const activityText = new Text({
      text: activityStr,
      style: {
        fill: activityColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '600',
      },
    });
    activityText.position.set(startX + textIndent, startY + 12 + NAME_H + 6 + 16);
    this._scroll.addChild(activityText);

    // Divider before schedule
    let y = startY + HEADER_H + 10;
    this._scroll.addChild(new Graphics()
      .moveTo(startX + 8, y).lineTo(startX + cardW - 8, y)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));
    y += DIVIDER_H + 8;

    y = this._appendScheduleAndFire(emp, startX, cardW, y);

    const cardH = y - startY;
    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: CARD_BORDER, width: 1.5 });
    bg.position.set(startX, startY);
    this._scroll.addChildAt(bg, bgIndex);
    return cardH;
  }

  /** Shared footer: bottom divider + schedule + fire button. Returns updated y. */
  _appendScheduleAndFire(emp, startX, cardW, y) {
    // Bottom divider
    this._scroll.addChild(new Graphics()
      .moveTo(startX + 8, y).lineTo(startX + cardW - 8, y)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));
    y += DIVIDER_H + 8;

    // Schedule label
    const schedLabelText = new Text({
      text: 'SCHEDULE',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9, fontWeight: '700' },
    });
    schedLabelText.position.set(startX + INNER, y);
    this._scroll.addChild(schedLabelText);

    const schedRow = this._makeScheduleRow();
    schedRow.position.set(startX + INNER, y + 16);
    this._scroll.addChild(schedRow);
    y += SCHED_SECTION_H + 10;

    const fireBtn = new Button({
      label: 'Fire',
      variant: 'danger',
      width: 72,
      height: 26,
      onClick: () => {
        this.game.sim.fireEmployee(emp);
        this.refresh();
      },
    });
    fireBtn.position.set(startX + cardW - INNER - 72, y + 6);
    this._scroll.addChild(fireBtn);

    const muteBtn = new Button({
      label: emp.logsMuted ? 'Unmute' : 'Mute logs',
      variant: emp.logsMuted ? 'warning' : 'secondary',
      width: 72,
      height: 26,
      fontSize: 11,
      onClick: () => {
        emp.logsMuted = !emp.logsMuted;
        this.refresh();
      },
    });
    muteBtn.position.set(startX + INNER, y + 18);
    this._scroll.addChild(muteBtn);

    y += 40 + 10;

    return y;
  }

  _makeSkillRow(skillKey, level, color, contentW, potential = undefined) {
    const row = new Container();
    const numW     = 14;
    const barAreaW = Math.max(80, contentW - LABEL_W - LABEL_GAP - numW);
    const barCells = (potential != null && potential > 0) ? potential : 1;
    const cellW    = Math.max(8, Math.floor((barAreaW - (MAX_SKILL_LEVEL - 1) * BAR_GAP) / MAX_SKILL_LEVEL));
    const trackW   = barCells * cellW + (barCells - 1) * BAR_GAP;

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
    const trackY = (SKILL_ROW_H - BAR_CELL) / 2;
    const filled = Math.max(0, Math.min(barCells, level));

    for (let i = 0; i < barCells; i++) {
      const cx          = i * (cellW + BAR_GAP);
      const isFilled    = i < filled;
      const isAttainable = !isFilled && level > 0;
      track
        .roundRect(cx, 0, cellW, BAR_CELL, 2)
        .fill({ color: isFilled ? color : BAR_EMPTY_COLOR })
        .stroke({
          color: isFilled || isAttainable ? color : BAR_EMPTY_BORDER,
          width: 1,
          alpha: isFilled ? 1 : isAttainable ? 0.4 : 0.7,
        });
    }
    track.position.set(LABEL_W + LABEL_GAP, trackY);
    row.addChild(track);

    if (level > 0) {
      const numText = new Text({
        text: String(level),
        style: {
          fill: color,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '700',
        },
      });
      numText.anchor.set(0, 0.5);
      numText.position.set(LABEL_W + LABEL_GAP + trackW + 6, SKILL_ROW_H / 2);
      row.addChild(numText);
    }

    return row;
  }

  _makeScheduleRow() {
    const row = new Container();
    const cellW = 34;
    let x = 0;
    SCHEDULE_CYCLE.forEach((state, i) => {
      if (i > 0) {
        const arrow = new Text({
          text: '→',
          style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
        });
        arrow.anchor.set(0, 0.5);
        arrow.position.set(x, 9);
        row.addChild(arrow);
        x += 12;
      }
      const cell = new Container();
      const icon = createLogoSprite(SCHEDULE_LOGO_FRAMES[state], 12) ?? new Text({ text: '', style: { fontSize: 12 } });
      icon.anchor.set(0, 0.5);
      icon.position.set(0, 9);
      cell.addChild(icon);
      const lbl = new Text({
        text: state[0] + state.slice(1).toLowerCase(),
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8 },
      });
      lbl.anchor.set(0.5, 0);
      lbl.position.set(8, 18);
      cell.addChild(lbl);
      cell.position.set(x, 0);
      row.addChild(cell);
      x += cellW;
    });
    return row;
  }

}
