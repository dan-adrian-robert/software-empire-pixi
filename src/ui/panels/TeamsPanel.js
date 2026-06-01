/**
 * TeamsPanel
 *
 * Modal panel for assigning programmers to Team Lead teams.
 * Only visible after the `team_management` research node is unlocked.
 *
 * Layout:
 *   Row 0  – AVAILABLE: chips for every programmer not yet in any team.
 *   Row 1+ – One row per team: lead name/level/buff on the left, member chips on the right.
 *
 * Interaction:
 *   • Click an available chip → select it (gold highlight).
 *   • While a chip is selected, click a team row background → assign to that team.
 *   • Click an assigned chip → remove from team (returns to Available).
 *   • Click the selected chip again → deselect.
 */
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { getCharacterAvatarTex } from '@utils/characterSprite.js';
import { SKILL_COLORS } from '@/data/skills.js';
import { isProgrammer } from '@/state/Employee.js';
import { CATEGORY_COLORS } from '@/data/archetypes.js';

// ── Palette ────────────────────────────────────────────────────────────────
const BG_PANEL        = 0x0d1526;
const ROW_BG          = 0x131929;
const ROW_BORDER      = 0x1e3050;
const ROW_HOVER       = 0x1a2740;
const HEADER_COLOR    = 0x7a86a3;
const TEXT_BRIGHT     = 0xe6e8ef;
const TEXT_DIM        = 0x7a86a3;
const CHIP_BG         = 0x1a2a44;
const CHIP_BORDER     = 0x2a3f66;
const CHIP_SELECTED   = 0xc8a400;
const CHIP_SEL_BG     = 0x3a2e00;
const CHIP_ASSIGNED   = 0x2a4a7a;
const CHIP_ASS_BORDER = 0x4a7aff;
const EMPTY_TEXT      = 0x3a4a6a;
const HINT_COLOR      = 0x4a5a7a;
const BUFF_COLOR      = 0x4ade80;
const LEAD_BADGE_BG   = 0x1a2e1a;
const LEAD_BADGE_CLR  = 0x4ade80;

const ROW_RADIUS  = 8;
const ROW_GAP     = 8;
const ROW_PAD_X   = 14;
const ROW_PAD_Y   = 12;
const CHIP_H      = 32;
const CHIP_R      = 5;
const CHIP_GAP    = 6;
const LEAD_COL_W  = 180;  // width reserved for the team lead info column
const SECTION_H   = 20;
const FACE_SIZE   = 24;
const FACE_GAP    = 6;

export class TeamsPanel extends Container {
  /**
   * @param {import('../../Game.js').Game} game
   */
  constructor(game) {
    super();
    this.game = game;

    this._scroll = new Container();
    this.addChild(this._scroll);

    this._width  = 600;
    this._height = 500;

    /** @type {import('../../state/Employee.js').Employee|null} */
    this._selected = null;
  }

  // ── Modal interface ───────────────────────────────────────────────────────

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

    let y = 0;

    // ── Available row ───────────────────────────────────────────────────────
    y = this._buildAvailableRow(company, y);
    y += ROW_GAP;

    // ── Team rows ────────────────────────────────────────────────────────────
    if (company.teams.length === 0) {
      const msg = new Text({
        text: 'No teams yet. Hire a Team Lead to create one.',
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
        },
      });
      msg.position.set(ROW_PAD_X, y);
      this._scroll.addChild(msg);
      return;
    }

    for (const team of company.teams) {
      y = this._buildTeamRow(company, team, y);
      y += ROW_GAP;
    }

    // Hint at the bottom when a chip is selected
    if (this._selected) {
      const hint = new Text({
        text: 'Click a team row to assign the selected employee.',
        style: {
          fill: HINT_COLOR,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontStyle: 'italic',
        },
      });
      hint.position.set(ROW_PAD_X, y + 4);
      this._scroll.addChild(hint);
    }
  }

  // ── Row builders ──────────────────────────────────────────────────────────

  _buildAvailableRow(company, startY) {
    const teamSystem = this.game.sim.teamSystem;
    const unassigned = company.employees.filter((e) => {
      if (!isProgrammer(e)) return false;
      const team = teamSystem.getTeamForEmployee(company, e.id);
      return team === null;
    });

    const chipsH = unassigned.length > 0 ? CHIP_H : 20;
    const rowH   = SECTION_H + ROW_PAD_Y * 2 + chipsH;

    const bg = new Graphics()
      .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
      .fill({ color: ROW_BG })
      .stroke({ color: ROW_BORDER, width: 1.5 });
    bg.position.set(0, startY);
    this._scroll.addChild(bg);

    const label = new Text({
      text: 'AVAILABLE',
      style: {
        fill: HEADER_COLOR,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
      },
    });
    label.position.set(ROW_PAD_X, startY + ROW_PAD_Y);
    this._scroll.addChild(label);

    if (unassigned.length === 0) {
      const empty = new Text({
        text: 'All programmers are assigned to teams.',
        style: {
          fill: EMPTY_TEXT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
        },
      });
      empty.position.set(ROW_PAD_X, startY + ROW_PAD_Y + SECTION_H);
      this._scroll.addChild(empty);
    } else {
      let chipX = ROW_PAD_X;
      const chipY = startY + ROW_PAD_Y + SECTION_H;

      for (const emp of unassigned) {
        const isSelected = this._selected === emp;
        const chip = this._buildChip(emp, isSelected, false);
        chip.position.set(chipX, chipY);

        chip.on('pointerup', () => {
          this._selected = isSelected ? null : emp;
          this.refresh();
        });

        this._scroll.addChild(chip);
        chipX += chip._chipW + CHIP_GAP;
      }
    }

    return startY + rowH;
  }

  _buildTeamRow(company, team, startY) {
    const teamSystem = this.game.sim.teamSystem;
    const lead = teamSystem.getTeamLead(company, team);
    const members = team.memberIds
      .map((id) => company.employees.find((e) => e.id === id))
      .filter(Boolean);

    // Compute team metrics (only meaningful when there are 2+ people)
    const totalMembers = (lead ? 1 : 0) + members.length;
    const compatScore  = totalMembers >= 2 ? teamSystem.teamCompatibility(company, team) : null;
    const stressInfo   = compatScore !== null ? teamSystem.teamStressLabel(compatScore) : null;
    const effectLabel  = totalMembers >= 1 ? teamSystem.teamEffect(company, team) : null;

    // Row height accommodates the extended lead info column
    const rowH    = 112;
    const isTarget = this._selected !== null;

    // Clickable card background
    const bg = new Graphics()
      .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
      .fill({ color: isTarget ? ROW_HOVER : ROW_BG })
      .stroke({ color: isTarget ? CHIP_ASS_BORDER : ROW_BORDER, width: 1.5 });
    bg.position.set(0, startY);
    bg.eventMode = 'static';
    bg.cursor    = 'pointer';

    bg.on('pointerover', () => {
      bg.clear()
        .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
        .fill({ color: 0x1e3050 })
        .stroke({ color: isTarget ? CHIP_ASS_BORDER : ROW_BORDER, width: 1.5 });
    });
    bg.on('pointerout', () => {
      bg.clear()
        .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
        .fill({ color: isTarget ? ROW_HOVER : ROW_BG })
        .stroke({ color: isTarget ? CHIP_ASS_BORDER : ROW_BORDER, width: 1.5 });
    });
    bg.on('pointerup', () => {
      if (this._selected) {
        teamSystem.assignToTeam(company, this._selected.id, team.id);
        this._selected = null;
        this.refresh();
      } else {
        this.game.events.emit('team:open-detail', team.id);
      }
    });

    this._scroll.addChild(bg);

    // ── Lead info column ────────────────────────────────────────────────────
    const buffPct   = lead ? Math.round(lead.level * 5) : 0;
    const leadLevel = lead ? lead.level : '?';
    let lx = ROW_PAD_X;
    let ly = startY + ROW_PAD_Y;

    // Team name
    const teamNameText = new Text({
      text: team.name,
      style: { fill: TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, fontWeight: '700' },
    });
    teamNameText.position.set(lx, ly);
    this._scroll.addChild(teamNameText);
    ly += 18;

    // Lead name + level
    const leadInfoText = new Text({
      text: lead ? `${lead.name}  Lv.${leadLevel}` : 'Lead missing',
      style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
    });
    leadInfoText.position.set(lx, ly);
    this._scroll.addChild(leadInfoText);
    ly += 15;

    // EXP buff badge
    const buffText = new Text({
      text: `+${buffPct}% EXP`,
      style: { fill: BUFF_COLOR, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700' },
    });
    buffText.position.set(lx, ly);
    this._scroll.addChild(buffText);
    ly += 15;

    // ── Chemistry, Stress, Effect ────────────────────────────────────────────
    if (compatScore !== null) {
      // Colour the chemistry score by range
      const chemColor = compatScore >= 60 ? 0x4ade80 : compatScore >= 20 ? 0xfbbf24 : 0xf87171;
      const chemText = new Text({
        text: `Chemistry: ${compatScore}`,
        style: { fill: chemColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontWeight: '700' },
      });
      chemText.position.set(lx, ly);
      this._scroll.addChild(chemText);
      ly += 14;
    }

    if (stressInfo) {
      const stressColor = stressInfo.modifier < 0 ? 0x4ade80 : stressInfo.modifier > 0 ? 0xf87171 : 0x7a86a3;
      const stressText = new Text({
        text: `Stress: ${stressInfo.label}`,
        style: { fill: stressColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
      });
      stressText.position.set(lx, ly);
      this._scroll.addChild(stressText);
      ly += 14;
    }

    if (effectLabel) {
      // Pick accent colour based on effect category
      const effectColorMap = {
        'Leadership Team': CATEGORY_COLORS.structure,
        'Research Team':   CATEGORY_COLORS.paradise,
        'High Risk Team':  CATEGORY_COLORS.mark,
        'Social Team':     CATEGORY_COLORS.connection,
        'Balanced Team':   0x7a86a3,
      };
      const effectColor = effectColorMap[effectLabel] ?? 0x7a86a3;
      const effectText = new Text({
        text: effectLabel,
        style: { fill: effectColor, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, fontStyle: 'italic' },
      });
      effectText.position.set(lx, ly);
      this._scroll.addChild(effectText);
    }

    // ── Member chips — vertically centred in the row ────────────────────────
    const chipsStartX = ROW_PAD_X + LEAD_COL_W;
    const chipY       = startY + Math.round((rowH - CHIP_H) / 2);
    let chipX         = chipsStartX;

    if (members.length === 0) {
      const emptyNote = new Text({
        text: isTarget ? '← click to assign' : 'no members',
        style: {
          fill: isTarget ? HINT_COLOR : EMPTY_TEXT,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontStyle: 'italic',
        },
      });
      emptyNote.position.set(chipsStartX, chipY + 4);
      this._scroll.addChild(emptyNote);
    } else {
      for (const emp of members) {
        const chip = this._buildChip(emp, false, true);
        chip.position.set(chipX, chipY);

        // Click assigned chip → remove from team
        chip.on('pointerup', (e) => {
          e.stopPropagation();
          teamSystem.removeFromTeam(company, emp.id);
          if (this._selected === emp) this._selected = null;
          this.refresh();
        });

        this._scroll.addChild(chip);
        chipX += chip._chipW + CHIP_GAP;
      }
    }

    return startY + rowH;
  }

  // ── Chip builder ──────────────────────────────────────────────────────────

  /**
   * @param {import('../../state/Employee.js').Employee} emp
   * @param {boolean} isSelected
   * @param {boolean} isAssigned
   */
  _buildChip(emp, isSelected, isAssigned) {
    const { name, skills, level } = emp;
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const textColor = isSelected ? CHIP_SELECTED : TEXT_BRIGHT;

    const nameLabel = new Text({
      text: name,
      style: {
        fill: textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });

    const levelLabel = new Text({
      text: `Lv.${level ?? 0}`,
      style: {
        fill: isSelected ? CHIP_SELECTED : 0x818cf8,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fontWeight: '700',
      },
    });

    const DOT_R    = 3;
    const DOT_GAP  = 4;
    const dotRowW  = skills.length > 0
      ? skills.length * (DOT_R * 2) + (skills.length - 1) * DOT_GAP
      : 0;

    const textW    = Math.ceil(nameLabel.width);
    const levelW   = Math.ceil(levelLabel.width);
    const contentW = FACE_SIZE + FACE_GAP + textW + 6 + levelW;
    const innerW   = Math.max(contentW, dotRowW + FACE_SIZE + FACE_GAP);
    const chipW    = innerW + ROW_PAD_X * 2;

    const chipBg = isSelected
      ? new Graphics()
          .roundRect(0, 0, chipW, CHIP_H, CHIP_R)
          .fill({ color: CHIP_SEL_BG })
          .stroke({ color: CHIP_SELECTED, width: 1.5 })
      : isAssigned
        ? new Graphics()
            .roundRect(0, 0, chipW, CHIP_H, CHIP_R)
            .fill({ color: CHIP_ASSIGNED })
            .stroke({ color: CHIP_ASS_BORDER, width: 1 })
        : new Graphics()
            .roundRect(0, 0, chipW, CHIP_H, CHIP_R)
            .fill({ color: CHIP_BG })
            .stroke({ color: CHIP_BORDER, width: 1 });

    container.addChild(chipBg);

    const face = new Sprite(getCharacterAvatarTex(emp.characterIndex));
    face.width  = FACE_SIZE;
    face.height = FACE_SIZE;
    face.position.set(ROW_PAD_X, (CHIP_H - FACE_SIZE) / 2);
    container.addChild(face);

    const textX   = ROW_PAD_X + FACE_SIZE + FACE_GAP;
    const hasDots = skills.length > 0;
    const textY   = hasDots ? CHIP_H / 2 - 8 : CHIP_H / 2 - 7;

    nameLabel.anchor.set(0, 0.5);
    nameLabel.position.set(textX, textY);
    container.addChild(nameLabel);

    levelLabel.anchor.set(0, 0.5);
    levelLabel.position.set(textX + textW + 6, textY);
    container.addChild(levelLabel);

    if (hasDots) {
      const dotsY      = CHIP_H - DOT_R - 4;
      const dotsStartX = textX;
      for (let i = 0; i < skills.length; i++) {
        const dotColor = SKILL_COLORS[skills[i].skill] ?? 0x4a9eff;
        const dot = new Graphics()
          .circle(0, 0, DOT_R)
          .fill({ color: dotColor });
        dot.position.set(dotsStartX + i * (DOT_R * 2 + DOT_GAP) + DOT_R, dotsY);
        container.addChild(dot);
      }
    }

    container.on('pointerover', () => { chipBg.alpha = 0.8; });
    container.on('pointerout',  () => { chipBg.alpha = 1; });

    container._chipW = chipW;
    return container;
  }
}
