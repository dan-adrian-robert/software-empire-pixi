/**
 * HiringPanel
 *
 * Layout adapts based on HR research:
 *
 *   people     (no hr_basics)    — single merged "People" list, no tabs
 *   split      (hr_basics)       — Programmers | Other tabs
 *   organised  (hr_organised)    — Programmers | Team Leads | Project Managers tabs
 *
 * Candidates use the same card layout as EmployeesPanel in a compact grid
 * (one row for 1–3, two rows for 4–5).
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
import { SCHEDULE_CYCLE, SCHEDULE_LOGO_FRAMES } from '@/data/scheduleActivities.js';
import { createLogoSprite } from '@utils/uiLogoSprite.js';
import { Tabs, Button } from '../framework/index.js';
import { getHiringTabMode } from '@/data/hiringResearch.js';

// ── Palette (matches EmployeesPanel) ─────────────────────────────────────
const CARD_BG = 0x131929;
const CARD_BORDER = 0x1e3050;
const DIVIDER_COLOR = 0x1a2a44;
const TEXT_BRIGHT = 0xe6e8ef;
const TEXT_DIM = 0x7a86a3;
const SALARY_COLOR = 0xfbbf24;
const SECTION_LABEL_COLOR = 0x7a86a3;
const ROLE_COLOR = 0x818cf8;
const TRAIT_COLOR = 0xc4b5fd;

const PADDING = 10;
const INNER = 8;
const CARD_GAP = 6;
const ROW_GAP = 8;

const AVATAR_SIZE = 28;
const AVATAR_GAP  = 6;

const BAR_CELL = 7;
const BAR_GAP = 2;
const BAR_EMPTY_COLOR = 0x1f2a44;
const BAR_EMPTY_BORDER = 0x2a3554;

const SKILL_ROW_H = 16;
const LABEL_W = 42;
const LABEL_GAP = 4;

const ALL_SKILLS = Object.values(SKILLS);
const SCHED_SECTION_H = 10 + 3 + 16;

const NAME_H = 15;
const SUBLINE_H = 12;
const HEADER_H = 8 + NAME_H + 3 + SUBLINE_H + 8;
const DIVIDER_H = 1;
const SKILLS_H = ALL_SKILLS.length * SKILL_ROW_H;

const TABS_BAR_H = 28;

const TAB_PEOPLE       = 'People';
const TAB_PROGRAMMERS  = 'Programmers';
const TAB_OTHER        = 'Other';
const TAB_TEAM_LEADS   = 'Team Leads';
const TAB_PM           = 'Project Managers';

export class HiringPanel extends Container {
  /** @param {import('../../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;

    this._tabs = new Tabs({
      tabs: [TAB_PROGRAMMERS, TAB_OTHER],
      active: TAB_PROGRAMMERS,
      onChange: (label) => {
        this._activeTab = label;
        this.refresh();
      },
    });

    this._scroll = new Container();
    this.addChild(this._scroll);

    this._activeTab = TAB_PROGRAMMERS;
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

    const company = this.game.sim?.company;
    if (!company) return;

    const mode = getHiringTabMode(company.unlockedResearch);
    const tabs  = this._resolveTabs(company, mode);

    if (!tabs.includes(this._activeTab)) {
      this._activeTab = tabs[0];
    }

    let y = 0;

    if (mode !== 'people') {
      this._tabs.setProps({ tabs, active: this._activeTab });
      this._tabs.position.set(PADDING, y);
      this._scroll.addChild(this._tabs);
      y += TABS_BAR_H;
    }

    const free = freeDesks(company);

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

    if (company.unlockedResearch.includes('hire_refresh')) {
      const canAfford = (company.money ?? 0) >= 500;
      const refreshBtn = new Button({
        label:    'Refresh Pool ($500)',
        variant:  'secondary',
        width:    150,
        height:   20,
        disabled: !canAfford,
        fontSize: 10,
        onClick:  () => {
          this.game.sim.refreshAvailableCandidates(this._getRefreshScope(mode));
        },
      });
      refreshBtn.position.set(this._width - PADDING - 150, y);
      this._scroll.addChild(refreshBtn);
    }

    y += 24;

    if (mode === 'people') {
      this._buildPeopleContent(company, y);
    } else if (mode === 'split') {
      if (this._activeTab === TAB_PROGRAMMERS) {
        this._buildProgrammersContent(company, y);
      } else {
        this._buildOtherContent(company, y);
      }
    } else {
      if (this._activeTab === TAB_PROGRAMMERS) {
        this._buildProgrammersContent(company, y);
      } else if (this._activeTab === TAB_TEAM_LEADS) {
        this._buildRoleTabContent(company, STAFF_ROLES.TEAM_LEAD, y);
      } else if (this._activeTab === TAB_PM) {
        this._buildRoleTabContent(company, STAFF_ROLES.PROJECT_MANAGER, y);
      }
    }
  }

  /**
   * @param {object} company
   * @param {'people'|'split'|'organised'} mode
   * @returns {string[]}
   */
  _resolveTabs(company, mode) {
    if (mode === 'people') return [TAB_PEOPLE];
    if (mode === 'split') return [TAB_PROGRAMMERS, TAB_OTHER];

    const tabs = [TAB_PROGRAMMERS];
    if (company.unlockedResearch.includes('team_management')) tabs.push(TAB_TEAM_LEADS);
    if (company.unlockedResearch.includes('project_management')) tabs.push(TAB_PM);
    return tabs;
  }

  /**
   * Which candidate pool the refresh button should replace.
   * @param {'people'|'split'|'organised'} mode
   * @returns {'all'|'programmers'|'other'|'team_lead'|'project_manager'}
   */
  _getRefreshScope(mode) {
    if (mode === 'people') return 'all';
    if (this._activeTab === TAB_PROGRAMMERS) return 'programmers';
    if (this._activeTab === TAB_OTHER) return 'other';
    if (this._activeTab === TAB_TEAM_LEADS) return 'team_lead';
    if (this._activeTab === TAB_PM) return 'project_manager';
    return 'programmers';
  }

  /**
   * Column/row layout for the candidate grid.
   * @param {number} count
   * @returns {{ cols: number, rows: number }}
   */
  _resolveGrid(count) {
    if (count <= 3) return { cols: count, rows: 1 };
    if (count === 4) return { cols: 2, rows: 2 };
    return { cols: 3, rows: 2 };
  }

  /** Card width for a grid with the given column count. */
  _cardWidth(cols) {
    return Math.floor(
      (this._width - PADDING * 2 - CARD_GAP * (cols - 1)) / cols,
    );
  }

  // ── Tab content builders ──────────────────────────────────────────────────

  _buildPeopleContent(company, startY) {
    let y = startY;

    if (!company.unlockedResearch.includes('team_management')) {
      y = this._addHint(y, 'Research Team Management to unlock Team Lead candidates.');
    }
    if (!company.unlockedResearch.includes('project_management')) {
      y = this._addHint(y, 'Research Project Management to unlock Project Manager candidates.');
    }

    const all = [
      ...company.candidates,
      ...(company.otherCandidates ?? []),
    ];

    if (all.length === 0) {
      this._addEmpty(y, 'No candidates right now. More will appear tomorrow.');
      return;
    }

    this._buildCardsRow(all, y);
  }

  _buildProgrammersContent(company, startY) {
    if (company.candidates.length === 0) {
      this._addEmpty(startY, 'No programmer candidates right now. More will appear tomorrow.');
      return;
    }

    this._buildCardsRow(company.candidates, startY);
  }

  _buildOtherContent(company, startY) {
    let y = startY;

    if (!company.unlockedResearch.includes('team_management')) {
      y = this._addHint(y, 'Research Team Management to unlock Team Lead candidates.');
    }
    if (!company.unlockedResearch.includes('project_management')) {
      y = this._addHint(y, 'Research Project Management to unlock Project Manager candidates.');
    }

    const pool = company.otherCandidates ?? [];
    if (pool.length === 0) {
      this._addEmpty(y, 'No other candidates right now. More will appear tomorrow.');
      return;
    }

    this._buildCardsRow(pool, y);
  }

  _buildRoleTabContent(company, role, startY) {
    const pool = (company.otherCandidates ?? []).filter((c) => c.role === role);

    if (pool.length === 0) {
      this._addEmpty(startY, `No ${ROLE_LABELS[role] ?? role} candidates right now. More will appear tomorrow.`);
      return;
    }

    this._buildCardsRow(pool, startY);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _addHint(y, text) {
    const hint = new Text({
      text,
      style: {
        fill: TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontStyle: 'italic',
        wordWrap: true,
        wordWrapWidth: this._width - PADDING * 2,
      },
    });
    hint.position.set(PADDING + 8, y);
    this._scroll.addChild(hint);
    return y + 22;
  }

  _addEmpty(y, text) {
    const empty = new Text({
      text,
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
  }

  // ── Candidate card grid ───────────────────────────────────────────────────

  /**
   * @param {object[]} candidates
   * @param {number} startY
   */
  _buildCardsRow(candidates, startY) {
    const { cols, rows } = this._resolveGrid(candidates.length);
    const cardW = this._cardWidth(cols);

    const built = candidates.map((candidate) => {
      const isProgrammer = candidate.role === STAFF_ROLES.PROGRAMMER;
      return isProgrammer
        ? this._buildProgrammerCard(candidate, cardW)
        : this._buildOtherCard(candidate, cardW);
    });

    const cardH = Math.max(...built.map((c) => c.cardH));
    const gridH = rows * cardH + (rows - 1) * ROW_GAP;

    const grid = new Container();
    grid.position.set(PADDING, startY);

    for (let i = 0; i < built.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const { card } = built[i];
      card.position.set(col * (cardW + CARD_GAP), row * (cardH + ROW_GAP));
      grid.addChild(card);
    }

    this._scroll.addChild(grid);

    return startY + gridH;
  }

  // ── Card builders (mirrors EmployeesPanel layout) ─────────────────────────

  /**
   * @param {object} candidate
   * @param {number} cardW
   * @returns {{ card: Container, cardH: number }}
   */
  _buildProgrammerCard(candidate, cardW) {
    const card = new Container();
    const textIndent = INNER + AVATAR_SIZE + AVATAR_GAP;

    const avatar = new Sprite(getCharacterAvatarTex(candidate.characterIndex));
    avatar.width  = AVATAR_SIZE;
    avatar.height = AVATAR_SIZE;
    avatar.position.set(INNER, 8);
    card.addChild(avatar);

    const nameText = new Text({
      text: candidate.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '700' },
    });
    nameText.position.set(textIndent, 8);
    card.addChild(nameText);

    const candidateLevel = candidate.skills.reduce((s, sk) => s + sk.level, 0);
    const levelBadge = new Text({
      text: `Lv.${candidateLevel}`,
      style: {
        fill: 0x818cf8,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '700',
      },
    });
    levelBadge.anchor.set(1, 0);
    levelBadge.position.set(cardW - INNER - 52, 9);
    card.addChild(levelBadge);

    const salaryText = new Text({
      text: `$${candidate.salary}/day`,
      style: {
        fill: SALARY_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '600',
      },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(cardW - INNER, 9);
    card.addChild(salaryText);

    const archDisplayName = getDisplayName(candidate.archetypes ?? {});
    const subline = archDisplayName && archDisplayName !== 'Unknown' ? archDisplayName : 'Available';
    const sublineText = new Text({
      text: subline,
      style: {
        fill: archDisplayName && archDisplayName !== 'Unknown' ? TRAIT_COLOR : TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: archDisplayName && archDisplayName !== 'Unknown' ? '600' : '400',
        fontStyle: archDisplayName && archDisplayName !== 'Unknown' ? 'italic' : 'normal',
        wordWrap: true,
        wordWrapWidth: cardW - textIndent - INNER,
      },
    });
    sublineText.position.set(textIndent, 8 + NAME_H + 2);
    card.addChild(sublineText);

    const divY1 = HEADER_H;
    card.addChild(new Graphics()
      .moveTo(6, divY1).lineTo(cardW - 6, divY1)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));

    const levelBySkill = Object.create(null);
    const potentialBySkill = Object.create(null);
    for (const sk of candidate.skills) {
      levelBySkill[sk.skill] = sk.level;
      potentialBySkill[sk.skill] = sk.potential;
    }
    const contentW = cardW - INNER * 2;

    const skillStartY = divY1 + 6;
    ALL_SKILLS.forEach((skillKey, i) => {
      const rowY = skillStartY + i * SKILL_ROW_H;
      const level = levelBySkill[skillKey] ?? 0;
      const color = SKILL_COLORS[skillKey] ?? 0x4a9eff;
      const potential = potentialBySkill[skillKey];
      const row = this._makeSkillRow(skillKey, level, color, contentW, potential);
      row.position.set(INNER, rowY);
      card.addChild(row);
    });

    let y = skillStartY + SKILLS_H + 8;
    y = this._appendScheduleAndHire(card, candidate, cardW, y);

    const cardH = y;
    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: CARD_BORDER, width: 1.5 });
    card.addChildAt(bg, 0);

    return { card, cardH };
  }

  /**
   * @param {object} candidate
   * @param {number} cardW
   * @returns {{ card: Container, cardH: number }}
   */
  _buildOtherCard(candidate, cardW) {
    const card = new Container();
    const textIndent = INNER + AVATAR_SIZE + AVATAR_GAP;

    const avatar = new Sprite(getCharacterAvatarTex(candidate.characterIndex));
    avatar.width  = AVATAR_SIZE;
    avatar.height = AVATAR_SIZE;
    avatar.position.set(INNER, 8);
    card.addChild(avatar);

    const nameText = new Text({
      text: candidate.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: '700' },
    });
    nameText.position.set(textIndent, 8);
    card.addChild(nameText);

    const roleStr = candidate.role === STAFF_ROLES.TEAM_LEAD && candidate.level != null
      ? `${ROLE_LABELS[candidate.role]} · Lv.${candidate.level}`
      : (ROLE_LABELS[candidate.role] ?? candidate.role);
    const roleText = new Text({
      text: roleStr,
      style: {
        fill: ROLE_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '600',
      },
    });
    roleText.position.set(textIndent, 8 + NAME_H + 2);
    card.addChild(roleText);

    const salaryText = new Text({
      text: `$${candidate.salary}/day`,
      style: {
        fill: SALARY_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '600',
      },
    });
    salaryText.anchor.set(1, 0);
    salaryText.position.set(cardW - INNER, 9);
    card.addChild(salaryText);

    const archDisplayName = getDisplayName(candidate.archetypes ?? {});
    let subline;
    if (candidate.role === STAFF_ROLES.TEAM_LEAD && candidate.level != null) {
      subline = `+${Math.round(candidate.level * 5)}% EXP buff`;
    } else if (archDisplayName && archDisplayName !== 'Unknown') {
      subline = archDisplayName;
    } else {
      subline = 'Available';
    }
    const sublineText = new Text({
      text: subline,
      style: {
        fill: archDisplayName && archDisplayName !== 'Unknown' && candidate.role !== STAFF_ROLES.TEAM_LEAD
          ? TRAIT_COLOR
          : 0x4ade80,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fontWeight: '600',
        fontStyle: archDisplayName && archDisplayName !== 'Unknown' ? 'italic' : 'normal',
      },
    });
    sublineText.position.set(textIndent, 8 + NAME_H + 6 + 12);
    card.addChild(sublineText);

    let y = HEADER_H + 8;
    card.addChild(new Graphics()
      .moveTo(6, y).lineTo(cardW - 6, y)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));
    y += DIVIDER_H + 6;

    y = this._appendScheduleAndHire(card, candidate, cardW, y);

    const cardH = y;
    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, 8)
      .fill({ color: CARD_BG })
      .stroke({ color: CARD_BORDER, width: 1.5 });
    card.addChildAt(bg, 0);

    return { card, cardH };
  }

  /** Shared footer: divider + schedule + hire button. Returns updated y. */
  _appendScheduleAndHire(card, candidate, cardW, y) {
    card.addChild(new Graphics()
      .moveTo(6, y).lineTo(cardW - 6, y)
      .stroke({ color: DIVIDER_COLOR, width: 1 }));
    y += DIVIDER_H + 6;

    const schedLabelText = new Text({
      text: 'SCHEDULE',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8, fontWeight: '700' },
    });
    schedLabelText.position.set(INNER, y);
    card.addChild(schedLabelText);

    const schedRow = this._makeScheduleRow();
    schedRow.position.set(INNER, y + 12);
    card.addChild(schedRow);
    y += SCHED_SECTION_H + 6;

    const hireBtnW = Math.min(64, cardW - INNER * 2);
    const hireBtn = new Button({
      label: 'Hire',
      variant: 'success',
      width: hireBtnW,
      height: 22,
      fontSize: 10,
      onClick: () => {
        const result = this.game.sim.hireCandidate(candidate);
        if (result.ok) this.refresh();
      },
    });
    hireBtn.position.set(cardW - INNER - hireBtnW, y + 4);
    card.addChild(hireBtn);

    y += 32 + 6;
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
        fontSize: 9,
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
          fontSize: 9,
          fontWeight: '700',
        },
      });
      numText.anchor.set(0, 0.5);
      numText.position.set(LABEL_W + LABEL_GAP + trackW + 4, SKILL_ROW_H / 2);
      row.addChild(numText);
    }

    return row;
  }

  _makeScheduleRow() {
    const row = new Container();
    const cellW = 26;
    let x = 0;
    SCHEDULE_CYCLE.forEach((state, i) => {
      if (i > 0) {
        const arrow = new Text({
          text: '→',
          style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 8 },
        });
        arrow.anchor.set(0, 0.5);
        arrow.position.set(x, 7);
        row.addChild(arrow);
        x += 10;
      }
      const cell = new Container();
      const icon = createLogoSprite(SCHEDULE_LOGO_FRAMES[state], 10) ?? new Text({ text: '', style: { fontSize: 10 } });
      icon.anchor.set(0, 0.5);
      icon.position.set(0, 7);
      cell.addChild(icon);
      const lbl = new Text({
        text: state[0] + state.slice(1).toLowerCase(),
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 7 },
      });
      lbl.anchor.set(0.5, 0);
      lbl.position.set(6, 14);
      cell.addChild(lbl);
      cell.position.set(x, 0);
      row.addChild(cell);
      x += cellW;
    });
    return row;
  }
}
