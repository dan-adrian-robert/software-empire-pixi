/**
 * EmployeesPanel
 *
 * Lists current employees. Each card layout (single column):
 *   Name + salary
 *   Activity (working on / idle)
 *   ── divider ──
 *   Skill rows (one per line: label | bar | level)
 *   ── divider ──
 *   Fire button (bottom-right)
 */
import { Container, Graphics, Text } from 'pixi.js';
import {
  SKILLS,
  SKILL_LABELS_SHORT,
  SKILL_COLORS,
  MAX_SKILL_LEVEL,
} from '../../data/skills.js';

const CARD_BG = 0x131929;
const CARD_BORDER = 0x1e3050;
const DIVIDER_COLOR = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const SALARY_COLOR = 0xfbbf24;
const ACTIVITY_COLOR = 0x4ade80;
const SECTION_LABEL_COLOR = 0x7a86a3;
const PADDING = 12;          // outer gutter
const INNER = 14;            // inner card padding (left/right)

// Skill bar cells
const BAR_CELL = 13;
const BAR_GAP = 3;
const BAR_TRACK_W = MAX_SKILL_LEVEL * BAR_CELL + (MAX_SKILL_LEVEL - 1) * BAR_GAP;
const BAR_EMPTY_COLOR = 0x1f2a44;
const BAR_EMPTY_BORDER = 0x2a3554;

const SKILL_ROW_H = 22;
const LABEL_W = 72;
const LABEL_GAP = 12;
const LEVEL_W = 22;

const ALL_SKILLS = Object.values(SKILLS);

// Card section heights
const NAME_H = 20;
const ACTIVITY_H = 18;
const HEADER_H = 12 + NAME_H + 6 + ACTIVITY_H + 10; // top-pad + name + gap + activity + gap
const DIVIDER_H = 1;
const SKILLS_H = ALL_SKILLS.length * SKILL_ROW_H;
const FOOTER_H = 10 + DIVIDER_H + 8 + 28 + 10;      // gap + divider + gap + btn + bottom-pad
const CARD_H = HEADER_H + DIVIDER_H + 8 + SKILLS_H + FOOTER_H;

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
      this._buildCard(emp, company, y);
      y += CARD_H + 8;
    }
  }

  // -------------------------------------------------------------------------

  _buildCard(emp, company, startY) {
    const cardW = this._width - PADDING * 2;

    // Background
    const bg = new Graphics()
      .roundRect(0, 0, cardW, CARD_H, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: CARD_BORDER, width: 1.5 });
    bg.position.set(PADDING, startY);
    this._scroll.addChild(bg);

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
    nameText.position.set(PADDING + INNER, startY + 12);
    this._scroll.addChild(nameText);

    // Salary (right-aligned in name row)
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

    // ── Activity (below name) ────────────────────────────
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
    activityText.position.set(PADDING + INNER, startY + 12 + NAME_H + 6);
    this._scroll.addChild(activityText);

    // ── Top divider ──────────────────────────────────────
    const divY1 = startY + HEADER_H;
    const div1 = new Graphics()
      .moveTo(PADDING + 8, divY1)
      .lineTo(PADDING + cardW - 8, divY1)
      .stroke({ color: DIVIDER_COLOR, width: 1 });
    this._scroll.addChild(div1);

    // ── Skills (single column) ───────────────────────────
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

    // ── Bottom divider ───────────────────────────────────
    const divY2 = startY + HEADER_H + DIVIDER_H + 8 + SKILLS_H + 10;
    const div2 = new Graphics()
      .moveTo(PADDING + 8, divY2)
      .lineTo(PADDING + cardW - 8, divY2)
      .stroke({ color: DIVIDER_COLOR, width: 1 });
    this._scroll.addChild(div2);

    // ── Fire button (bottom-right) ───────────────────────
    const fireBtn = this._makeButton('Fire', 0x2a1a1a, 0xf87171, () => {
      this.game.sim.fireEmployee(emp);
      this.refresh();
    });
    fireBtn.position.set(PADDING + cardW - INNER - 72, divY2 + 8);
    this._scroll.addChild(fireBtn);
  }

  _makeSkillRow(skillKey, level, color, cardW) {
    const row = new Container();
    const rowContentW = cardW - INNER * 2;

    // Label
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

    // Bar track (cells)
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

    // Numeric level (right of bar)
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
    container.addChild(text);

    container.on('pointerup', onClick);
    container.on('pointerover', () => { bg.alpha = 0.8; });
    container.on('pointerout', () => { bg.alpha = 1; });

    return container;
  }
}
