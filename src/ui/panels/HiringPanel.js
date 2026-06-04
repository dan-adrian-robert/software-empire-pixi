/**
 * HiringPanel
 *
 * Two tabs:
 *   Programmers — lists company.candidates (skill-based workers)
 *   Other       — lists company.otherCandidates (e.g. Project Managers)
 *
 * Card layouts:
 *   Programmer card: avatar, name, level badge, salary, skill bars, schedule, Hire button
 *   Other card:      avatar, name, role label, salary, schedule, Hire button
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { getCharacterAvatarTex } from '@utils/characterSprite.js';
import {
  SKILLS,
  SKILL_LABELS_SHORT,
  SKILL_COLORS,
  MAX_SKILL_LEVEL,
} from '@/data/skills.js';
import { ROLE_LABELS, STAFF_ROLES } from '@/data/staffRoles.js';
import { getDisplayName } from '@/data/archetypeDisplayNames.js';
import { freeDesks } from '@/state/Company.js';
import { SCHEDULE_CYCLE } from '@/state/Employee.js';
import { Tabs, Button } from '../framework/index.js';

// ── Palette ────────────────────────────────────────────────────────────────
const CARD_BG = 0x131929;
const CARD_BORDER = 0x1e3050;
const CARD_BORDER_DIM = 0x181f30;
const DIVIDER_COLOR = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const SALARY_COLOR = 0xfbbf24;
const SECTION_LABEL_COLOR = 0x7a86a3;
const ROLE_COLOR = 0x818cf8;

const PADDING = 12;
const INNER = 14;

// Character avatar
const AVATAR_SIZE = 44;
const AVATAR_GAP  = 10;
const TEXT_INDENT = INNER + AVATAR_SIZE + AVATAR_GAP;

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

// Programmer card measurements
const NAME_H = 20;
const HEADER_H = 10 + AVATAR_SIZE + 10;
const DIVIDER_H = 1;
const SKILLS_H = ALL_SKILLS.length * SKILL_ROW_H;
const PROG_FOOTER_H = 10 + DIVIDER_H + 8 + SCHED_SECTION_H + 10 + 28 + 10;
const PROG_CARD_H = HEADER_H + DIVIDER_H + 8 + SKILLS_H + PROG_FOOTER_H;

// Other card measurements (no skill section)
const OTHER_FOOTER_H = 10 + DIVIDER_H + 8 + SCHED_SECTION_H + 10 + 28 + 10;
const OTHER_CARD_H = HEADER_H + OTHER_FOOTER_H;

// Tabs bar height + padding below it
const TABS_BAR_H = 28;

export class HiringPanel extends Container {
  /** @param {import('../../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;

    this._tabs = new Tabs({
      tabs: ['Programmers', 'Other'],
      active: 'Programmers',
      onChange: (label) => {
        this._activeTab = label;
        this.refresh();
      },
    });
    this._tabs.position.set(PADDING, 0);
    this.addChild(this._tabs);

    this._scroll = new Container();
    this._scroll.position.set(0, TABS_BAR_H);
    this.addChild(this._scroll);

    this._activeTab = 'Programmers';
    this._width  = 600;
    this._height = 500;
  }

  init(x, y, width, height) {
    this._width  = width;
    this._height = height;
    this.position.set(x, y);
    this.refresh();
  }

  resize(x, y, width, height) {
    this._width  = width;
    this._height = height;
    this.position.set(x, y);
    this.refresh();
  }

  refresh() {
    this._scroll.removeChildren();
    this._tabs.setProps({ active: this._activeTab });

    const company = this.game.sim?.company;
    if (!company) return;

    const free = freeDesks(company);
    let y = 0;

    // Desk availability header
    const header = new Text({
      text: `HIRING — ${free} DESK${free !== 1 ? 'S' : ''} AVAILABLE`,
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

    if (this._activeTab === 'Programmers') {
      this._buildProgrammersContent(company, y, free);
    } else {
      this._buildOtherContent(company, y, free);
    }
  }

  // ── Programmers tab ───────────────────────────────────────────────────────

  _buildProgrammersContent(company, startY, free) {
    let y = startY;
    if (company.candidates.length === 0) {
      const empty = new Text({
        text: 'No programmer candidates right now. More will appear tomorrow.',
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          wordWrap: true,
          wordWrapWidth: this._width - PADDING * 2,
        },
      });
      empty.position.set(PADDING + 8, y);
      this._scroll.addChild(empty);
      return;
    }

    for (const candidate of company.candidates) {
      this._buildProgrammerCard(candidate, y, free > 0);
      y += PROG_CARD_H + 8;
    }
  }

  // ── Other tab ─────────────────────────────────────────────────────────────

  _buildOtherContent(company, startY, free) {
    let y = startY;
    const pool = company.otherCandidates ?? [];

    if (pool.length === 0) {
      const empty = new Text({
        text: 'No other candidates right now. More will appear tomorrow.',
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          wordWrap: true,
          wordWrapWidth: this._width - PADDING * 2,
        },
      });
      empty.position.set(PADDING + 8, y);
      this._scroll.addChild(empty);
      return;
    }

    for (const candidate of pool) {
      this._buildOtherCard(candidate, y, free > 0);
      y += OTHER_CARD_H + 8;
    }
  }

  // ── Card builders ─────────────────────────────────────────────────────────

  _buildProgrammerCard(candidate, startY, canHire) {
    const cardW = this._width - PADDING * 2;

    const bg = new Graphics()
      .roundRect(0, 0, cardW, PROG_CARD_H, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: canHire ? CARD_BORDER : CARD_BORDER_DIM, width: 1.5 });
    bg.position.set(PADDING, startY);
    this._scroll.addChild(bg);

    // Avatar
    const avatarSprite = new Sprite(getCharacterAvatarTex(candidate.characterIndex));
    avatarSprite.width  = AVATAR_SIZE;
    avatarSprite.height = AVATAR_SIZE;
    avatarSprite.alpha  = canHire ? 1 : 0.4;
    avatarSprite.position.set(PADDING + INNER, startY + (HEADER_H - AVATAR_SIZE) / 2);
    this._scroll.addChild(avatarSprite);

    const textBaseY = startY + HEADER_H / 2 - NAME_H / 2;

    // Name
    const nameText = new Text({
      text: candidate.name,
      style: {
        fill: canHire ? TEXT_BRIGHT : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '700',
      },
    });
    nameText.position.set(PADDING + TEXT_INDENT, textBaseY);
    this._scroll.addChild(nameText);

    // Level badge
    const candidateLevel = candidate.skills.reduce((s, sk) => s + sk.level, 0);
    const levelBadge = new Text({
      text: `Lv. ${candidateLevel}`,
      style: {
        fill: canHire ? 0x818cf8 : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '700',
      },
    });
    levelBadge.anchor.set(1, 0);
    levelBadge.position.set(PADDING + cardW - INNER - 80, textBaseY + 2);
    this._scroll.addChild(levelBadge);

    // Salary
    const salaryText = new Text({
      text: `$${candidate.salary}/day`,
      style: {
        fill: canHire ? SALARY_COLOR : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(PADDING + cardW - INNER, textBaseY + 2);
    this._scroll.addChild(salaryText);

    // Archetype display name (below the name row, right-aligned)
    const archDisplayName = getDisplayName(candidate.archetypes ?? {});
    if (archDisplayName && archDisplayName !== 'Unknown') {
      const archLabel = new Text({
        text: archDisplayName,
        style: {
          fill: canHire ? 0xc4b5fd : TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
          fontStyle: 'italic',
        },
      });
      archLabel.anchor.set(1, 0);
      archLabel.position.set(PADDING + cardW - INNER, textBaseY + NAME_H + 2);
      this._scroll.addChild(archLabel);
    }

    // Top divider
    const divY1 = startY + HEADER_H;
    this._scroll.addChild(new Graphics()
      .moveTo(PADDING + 8, divY1).lineTo(PADDING + cardW - 8, divY1)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));

    // Skills
    const levelBySkill = Object.create(null);
    for (const sk of candidate.skills) levelBySkill[sk.skill] = sk.level;

    const skillStartY = divY1 + 8;
    ALL_SKILLS.forEach((skillKey, i) => {
      const rowY  = skillStartY + i * SKILL_ROW_H;
      const level = levelBySkill[skillKey] ?? 0;
      const color = SKILL_COLORS[skillKey] ?? 0x4a9eff;
      const row   = this._makeSkillRow(skillKey, level, color, cardW, !canHire);
      row.position.set(PADDING + INNER, rowY);
      this._scroll.addChild(row);
    });

    // Bottom divider
    const divY2 = startY + HEADER_H + DIVIDER_H + 8 + SKILLS_H + 10;
    this._scroll.addChild(new Graphics()
      .moveTo(PADDING + 8, divY2).lineTo(PADDING + cardW - 8, divY2)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));

    this._appendScheduleAndHireButton(candidate, cardW, divY2, startY, canHire);
  }

  _buildOtherCard(candidate, startY, canHire) {
    const cardW = this._width - PADDING * 2;

    const bg = new Graphics()
      .roundRect(0, 0, cardW, OTHER_CARD_H, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: canHire ? CARD_BORDER : CARD_BORDER_DIM, width: 1.5 });
    bg.position.set(PADDING, startY);
    this._scroll.addChild(bg);

    // Avatar
    const avatarSprite = new Sprite(getCharacterAvatarTex(candidate.characterIndex));
    avatarSprite.width  = AVATAR_SIZE;
    avatarSprite.height = AVATAR_SIZE;
    avatarSprite.alpha  = canHire ? 1 : 0.4;
    avatarSprite.position.set(PADDING + INNER, startY + (HEADER_H - AVATAR_SIZE) / 2);
    this._scroll.addChild(avatarSprite);

    const textBaseY = startY + HEADER_H / 2 - NAME_H / 2;

    // Name
    const nameText = new Text({
      text: candidate.name,
      style: {
        fill: canHire ? TEXT_BRIGHT : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '700',
      },
    });
    nameText.position.set(PADDING + TEXT_INDENT, textBaseY);
    this._scroll.addChild(nameText);

    // Role label (+ level for Team Lead)
    const roleStr = candidate.role === STAFF_ROLES.TEAM_LEAD && candidate.level != null
      ? `${ROLE_LABELS[candidate.role]} · Lv.${candidate.level} (+${Math.round(candidate.level * 5)}% EXP buff)`
      : (ROLE_LABELS[candidate.role] ?? candidate.role);
    const roleLabel = new Text({
      text: roleStr,
      style: {
        fill: canHire ? ROLE_COLOR : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '600',
      },
    });
    roleLabel.position.set(PADDING + TEXT_INDENT, textBaseY + NAME_H + 2);
    this._scroll.addChild(roleLabel);

    // Archetype display name (right-aligned)
    const otherArchName = getDisplayName(candidate.archetypes ?? {});
    if (otherArchName && otherArchName !== 'Unknown') {
      const otherArchLabel = new Text({
        text: otherArchName,
        style: {
          fill: canHire ? 0xc4b5fd : TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
          fontStyle: 'italic',
        },
      });
      otherArchLabel.anchor.set(1, 0);
      otherArchLabel.position.set(PADDING + cardW - INNER, textBaseY + NAME_H + 2);
      this._scroll.addChild(otherArchLabel);
    }

    // Salary
    const salaryText = new Text({
      text: `$${candidate.salary}/day`,
      style: {
        fill: canHire ? SALARY_COLOR : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(PADDING + cardW - INNER, textBaseY + 2);
    this._scroll.addChild(salaryText);

    // Divider before schedule
    const divY2 = startY + HEADER_H + 10;
    this._scroll.addChild(new Graphics()
      .moveTo(PADDING + 8, divY2).lineTo(PADDING + cardW - 8, divY2)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));

    this._appendScheduleAndHireButton(candidate, cardW, divY2, startY, canHire);
  }

  // Shared footer: schedule row + hire button, starting at divY2.
  _appendScheduleAndHireButton(candidate, cardW, divY2, startY, canHire) {
    const schedLabelY = divY2 + 8;
    const schedLabelText = new Text({
      text: 'SCHEDULE',
      style: {
        fill: TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '700',
      },
    });
    schedLabelText.position.set(PADDING + INNER, schedLabelY);
    this._scroll.addChild(schedLabelText);

    const schedRow = this._makeScheduleRow();
    schedRow.position.set(PADDING + INNER, schedLabelY + 16);
    this._scroll.addChild(schedRow);

    const hireBtn = new Button({
      label: canHire ? 'Hire' : 'No Desk',
      variant: canHire ? 'success' : 'secondary',
      width: 80,
      height: 26,
      disabled: !canHire,
      fontSize: 12,
      onClick: () => {
        const result = this.game.sim.hireCandidate(candidate);
        if (!result.ok) {
          this.game.events.emit('notification:add', {
            text: result.reason,
            type: 'warning',
          });
        }
        this.refresh();
      },
    });
    hireBtn.position.set(PADDING + cardW - INNER - 80, divY2 + 8 + SCHED_SECTION_H + 10);
    this._scroll.addChild(hireBtn);
  }

  // ── Sub-component builders ────────────────────────────────────────────────

  _makeSkillRow(skillKey, level, color, cardW, dimmed) {
    const row = new Container();

    const label = new Text({
      text: SKILL_LABELS_SHORT[skillKey] ?? skillKey,
      style: {
        fill: (!dimmed && level > 0) ? TEXT_BRIGHT : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: (!dimmed && level > 0) ? '600' : '400',
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
      const isFilled = !dimmed && i < filled;
      const fillColor = dimmed ? BAR_EMPTY_COLOR : color;
      track
        .roundRect(cx, 0, BAR_CELL, BAR_CELL, 2)
        .fill({ color: isFilled ? fillColor : BAR_EMPTY_COLOR })
        .stroke({ color: isFilled ? fillColor : BAR_EMPTY_BORDER, width: 1, alpha: isFilled ? 1 : 0.7 });
    }
    track.position.set(LABEL_W + LABEL_GAP, trackY);
    row.addChild(track);

    if (!dimmed && level > 0) {
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
}
