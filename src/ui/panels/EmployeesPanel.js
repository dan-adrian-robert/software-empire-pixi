/**
 * EmployeesPanel
 *
 * Lists current employees. Each card layout (single column):
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
import { getCharacterAvatarTex } from '../../utils/characterSprite.js';
import {
  SKILLS,
  SKILL_LABELS_SHORT,
  SKILL_COLORS,
  MAX_SKILL_LEVEL,
} from '../../data/skills.js';
import { SCHEDULE_CYCLE } from '../../state/Employee.js';

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

// Character avatar shown in each card header
const AVATAR_SIZE = 44;   // square display size (px)
const AVATAR_GAP  = 10;   // gap between avatar and text column
const TEXT_INDENT = INNER + AVATAR_SIZE + AVATAR_GAP; // x offset for name / activity

// Skill bar cells
const BAR_CELL = 13;
const BAR_GAP = 3;
const BAR_TRACK_W = MAX_SKILL_LEVEL * BAR_CELL + (MAX_SKILL_LEVEL - 1) * BAR_GAP;
const BAR_EMPTY_COLOR = 0x1f2a44;
const BAR_EMPTY_BORDER = 0x2a3554;

const SKILL_ROW_H = 22;
const LABEL_W = 72;
const LABEL_GAP = 12;

const ALL_SKILLS = Object.values(SKILLS);

const SCHEDULE_ICONS = { WORK: '💻', BREAK: '☕', TALK: '💬' };
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

    for (const emp of company.employees) {
      const cardH = this._buildCard(emp, company, y);
      y += cardH + 8;
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
   * @returns {number} card height in pixels
   */
  _buildCard(emp, company, startY) {
    const cardW = this._width - PADDING * 2;

    // We draw the background AFTER laying out content so we know the final height.
    // Reserve a placeholder index to insert the bg behind everything else.
    const bgIndex = this._scroll.children.length;

    // ── Avatar ────────────────────────────────────────────
    const avatarSprite = new Sprite(getCharacterAvatarTex());
    avatarSprite.width  = AVATAR_SIZE;
    avatarSprite.height = AVATAR_SIZE;
    avatarSprite.position.set(PADDING + INNER, startY + 10);
    this._scroll.addChild(avatarSprite);

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
    nameText.position.set(PADDING + TEXT_INDENT, startY + 12);
    this._scroll.addChild(nameText);

    const levelBadge = new Text({
      text: `Lv. ${emp.level ?? 0}`,
      style: {
        fill: 0x818cf8,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
      },
    });
    levelBadge.anchor.set(1, 0);
    levelBadge.position.set(PADDING + cardW - INNER - 72, startY + 14);
    this._scroll.addChild(levelBadge);

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
    salaryText.position.set(PADDING + cardW - INNER, startY + 14);
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
        fontSize: 11,
        fontWeight: proj ? '600' : '400',
      },
    });
    activityText.position.set(PADDING + TEXT_INDENT, startY + 12 + NAME_H + 6);
    this._scroll.addChild(activityText);

    // ── Top divider ──────────────────────────────────────
    const divY1 = startY + HEADER_H;
    const div1 = new Graphics()
      .moveTo(PADDING + 8, divY1)
      .lineTo(PADDING + cardW - 8, divY1)
      .stroke({ color: DIVIDER_COLOR, width: 1 });
    this._scroll.addChild(div1);

    // ── Skills ───────────────────────────────────────────
    const levelBySkill = Object.create(null);
    for (const sk of emp.skills) levelBySkill[sk.skill] = sk.level;

    const skillStartY = divY1 + 8;
    ALL_SKILLS.forEach((skillKey, i) => {
      const rowY = skillStartY + i * SKILL_ROW_H;
      const level = levelBySkill[skillKey] ?? 0;
      const color = SKILL_COLORS[skillKey] ?? 0x4a9eff;
      const row = this._makeSkillRow(skillKey, level, color, cardW);
      row.position.set(PADDING + INNER, rowY);
      this._scroll.addChild(row);
    });

    // Running y cursor — picks up after skills block.
    let y = skillStartY + SKILLS_H + 10;

    // ── Skill upgrade section (only when points are available) ───────────────
    if ((emp.pendingSkillPoints ?? 0) > 0) {
      const upgradable = emp.skills.filter(
        (s) => s.level >= 1 && s.level < MAX_SKILL_LEVEL,
      );

      const upgradeHeader = new Text({
        text: `SKILL UPGRADE  (${emp.pendingSkillPoints} available)`,
        style: {
          fill: UPGRADE_HEADER_COLOR,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 9,
          fontWeight: '700',
        },
      });
      upgradeHeader.position.set(PADDING + INNER, y);
      this._scroll.addChild(upgradeHeader);
      y += 16;

      const btnCount = Math.max(1, upgradable.length);
      const BTN_GAP = 8;
      const BTN_W = Math.floor(
        (cardW - INNER * 2 - BTN_GAP * (btnCount - 1)) / btnCount,
      );

      upgradable.forEach((sk, i) => {
        const btnX = PADDING + INNER + i * (BTN_W + BTN_GAP);
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
          style: {
            fill: skColor,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 10,
            fontWeight: '600',
          },
        });
        btnLabel.anchor.set(0.5, 0.5);
        btnLabel.position.set(BTN_W / 2, UPGRADE_BTN_H / 2);
        btnLabel.eventMode = 'none';
        btnBg.addChild(btnLabel);

        btnBg.on('pointerup', () => {
          const ok = this.game.sim.upgradeEmployeeSkill(emp, sk.skill);
          if (ok) this.refresh();
        });
        btnBg.on('pointerover', () => { btnBg.alpha = 0.75; });
        btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

        this._scroll.addChild(btnBg);
      });

      y += UPGRADE_BTN_H + 10;
    }

    // ── Bottom divider ────────────────────────────────────
    const div2 = new Graphics()
      .moveTo(PADDING + 8, y)
      .lineTo(PADDING + cardW - 8, y)
      .stroke({ color: DIVIDER_COLOR, width: 1 });
    this._scroll.addChild(div2);
    y += DIVIDER_H + 8;

    // ── Schedule ─────────────────────────────────────────
    const schedLabelText = new Text({
      text: 'SCHEDULE',
      style: {
        fill: TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '700',
      },
    });
    schedLabelText.position.set(PADDING + INNER, y);
    this._scroll.addChild(schedLabelText);

    const schedRow = this._makeScheduleRow();
    schedRow.position.set(PADDING + INNER, y + 16);
    this._scroll.addChild(schedRow);
    y += SCHED_SECTION_H;

    // ── Fire button ───────────────────────────────────────
    const fireBtn = this._makeButton('Fire', 0x2a1a1a, 0xf87171, () => {
      this.game.sim.fireEmployee(emp);
      this.refresh();
    });
    fireBtn.position.set(PADDING + cardW - INNER - 72, y + 6);
    this._scroll.addChild(fireBtn);
    y += 28 + 10; // button height + bottom padding

    // ── Background (drawn last so we know final height) ───
    const cardH = y - startY;
    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: CARD_BORDER, width: 1.5 });
    bg.position.set(PADDING, startY);
    this._scroll.addChildAt(bg, bgIndex);

    return cardH;
  }

  _makeSkillRow(skillKey, level, color, cardW) {
    const row = new Container();

    const label = new Text({
      text: SKILL_LABELS_SHORT[skillKey] ?? skillKey,
      style: {
        fill: level > 0 ? TEXT_BRIGHT : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: level > 0 ? '600' : '400',
      },
    });
    label.anchor.set(0, 0.5);
    label.position.set(0, SKILL_ROW_H / 2);
    row.addChild(label);

    const track = new Graphics();
    const trackY = (SKILL_ROW_H - BAR_CELL) / 2;
    const filled = Math.max(0, Math.min(MAX_SKILL_LEVEL, level));

    for (let i = 0; i < MAX_SKILL_LEVEL; i++) {
      const cx = i * (BAR_CELL + BAR_GAP);
      const isFilled = i < filled;
      track
        .roundRect(cx, 0, BAR_CELL, BAR_CELL, 2)
        .fill({ color: isFilled ? color : BAR_EMPTY_COLOR })
        .stroke({ color: isFilled ? color : BAR_EMPTY_BORDER, width: 1, alpha: isFilled ? 1 : 0.7 });
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
      numText.position.set(LABEL_W + LABEL_GAP + BAR_TRACK_W + 8, SKILL_ROW_H / 2);
      row.addChild(numText);
    }

    return row;
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
        x += 16;
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
      x += 42;
    });
    return row;
  }

  _makeButton(label, bgColor, textColor, onClick) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, 72, 26, 5)
      .fill({ color: bgColor })
      .stroke({ color: textColor, width: 1, alpha: 0.5 });
    container.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fill: textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });
    text.anchor.set(0.5);
    text.position.set(36, 13);
    text.eventMode = 'none';
    container.addChild(text);

    container.on('pointerup', onClick);
    container.on('pointerover', () => { bg.alpha = 0.8; });
    container.on('pointerout', () => { bg.alpha = 1; });

    return container;
  }
}
