/**
 * AssignmentPanel
 *
 * Modal panel for manually assigning employees to active projects.
 *
 * Layout:
 *   Row 0  – AVAILABLE: chips for every unassigned (pinnedProjectId === null) employee.
 *   Row 1+ – One row per active project: project name on the left, assigned chips on the right.
 *
 * Interaction:
 *   • Click an unassigned chip → select it (gold highlight).
 *   • While a chip is selected, click a project row background → assign to that project.
 *   • Click an assigned chip → unassign (returns to Available).
 *   • Click the selected chip again → deselect.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { SKILL_LABELS_SHORT, SKILL_COLORS } from '../../data/skills.js';

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
const CHIP_REMOVE_BG  = 0x3a1a1a;
const CHIP_REMOVE_CLR = 0xf87171;
const EMPTY_TEXT      = 0x3a4a6a;
const HINT_COLOR      = 0x4a5a7a;

const ROW_RADIUS      = 8;
const ROW_GAP         = 8;
const ROW_PAD_X       = 14;
const ROW_PAD_Y       = 12;
const CHIP_H          = 26;
const CHIP_R          = 5;
const CHIP_GAP        = 6;
const LABEL_W         = 120;   // width reserved for the project name column
const SECTION_H       = 20;    // height of the section label row

export class AssignmentPanel extends Container {
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

    // ── Project rows ────────────────────────────────────────────────────────
    if (company.activeProjects.length === 0) {
      const msg = new Text({
        text: 'No active projects. Accept a project first.',
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

    for (const project of company.activeProjects) {
      y = this._buildProjectRow(company, project, y);
      y += ROW_GAP;
    }

    // Hint at the bottom
    if (this._selected) {
      const hint = new Text({
        text: 'Click a project row to assign the selected employee.',
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
    const unassigned = company.employees.filter((e) => e.pinnedProjectId === null);

    const chipsH    = unassigned.length > 0 ? CHIP_H : 20;
    const rowH      = SECTION_H + ROW_PAD_Y * 2 + chipsH;

    // Card background
    const bg = new Graphics()
      .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
      .fill({ color: ROW_BG })
      .stroke({ color: ROW_BORDER, width: 1.5 });
    bg.position.set(0, startY);
    this._scroll.addChild(bg);

    // Section label
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
        text: 'All employees are assigned.',
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
        const chip = this._buildChip(emp.name, emp.skills, isSelected, false);
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

  _buildProjectRow(company, project, startY) {
    const assigned = company.employees.filter((e) => e.pinnedProjectId === project.id);

    const chipsH = CHIP_H;
    const rowH   = SECTION_H + ROW_PAD_Y * 2 + chipsH;

    const isTarget = this._selected !== null;

    // Clickable card background — acts as assignment drop zone when a chip is selected
    const bg = new Graphics()
      .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
      .fill({ color: isTarget ? ROW_HOVER : ROW_BG })
      .stroke({ color: isTarget ? CHIP_ASS_BORDER : ROW_BORDER, width: isTarget ? 1.5 : 1.5 });
    bg.position.set(0, startY);
    bg.eventMode = 'static';
    bg.cursor = isTarget ? 'pointer' : 'default';

    bg.on('pointerover', () => {
      if (!this._selected) return;
      bg.clear()
        .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
        .fill({ color: 0x1e3050 })
        .stroke({ color: CHIP_ASS_BORDER, width: 1.5 });
    });
    bg.on('pointerout', () => {
      bg.clear()
        .roundRect(0, 0, this._width, rowH, ROW_RADIUS)
        .fill({ color: isTarget ? ROW_HOVER : ROW_BG })
        .stroke({ color: isTarget ? CHIP_ASS_BORDER : ROW_BORDER, width: 1.5 });
    });
    bg.on('pointerup', () => {
      if (!this._selected) return;
      this.game.sim.assignEmployee(this._selected, project.id);
      this._selected = null;
      this.refresh();
    });

    this._scroll.addChild(bg);

    // Project name label (left column)
    const nameText = new Text({
      text: project.name,
      style: {
        fill: TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: '700',
      },
    });
    nameText.position.set(ROW_PAD_X, startY + ROW_PAD_Y);
    this._scroll.addChild(nameText);

    // Chips area: assigned employees
    const chipsStartX = ROW_PAD_X + LABEL_W;
    const chipY       = startY + ROW_PAD_Y + SECTION_H;
    let chipX         = chipsStartX;

    if (assigned.length === 0) {
      const emptyNote = new Text({
        text: isTarget ? '← click to assign' : 'no one assigned',
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
      for (const emp of assigned) {
        const chip = this._buildChip(emp.name, emp.skills, false, true);
        chip.position.set(chipX, chipY);

        // Click assigned chip → unassign
        chip.on('pointerup', (e) => {
          e.stopPropagation();
          this.game.sim.unassignEmployee(emp);
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
   * Build a small interactive chip for an employee.
   * Returns a Container with a `_chipW` property set to its computed width.
   *
   * @param {string}  name
   * @param {Array<{skill:string,level:number}>} skills
   * @param {boolean} isSelected
   * @param {boolean} isAssigned
   */
  _buildChip(name, skills, isSelected, isAssigned) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    // Measure text width to size chip dynamically
    const nameLabel = new Text({
      text: name,
      style: {
        fill: isSelected ? CHIP_SELECTED : isAssigned ? TEXT_BRIGHT : TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });

    // Skill dot row
    const DOT_R    = 3;
    const DOT_GAP  = 4;
    const dotRowW  = skills.length > 0
      ? skills.length * (DOT_R * 2) + (skills.length - 1) * DOT_GAP
      : 0;

    const textW    = Math.ceil(nameLabel.width);
    const innerW   = Math.max(textW, dotRowW);
    const chipW    = innerW + ROW_PAD_X * 2;

    // Background
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

    // Name centred vertically in chip
    nameLabel.anchor.set(0.5, 0.5);
    nameLabel.position.set(chipW / 2, CHIP_H / 2);
    container.addChild(nameLabel);

    // Tiny skill-color dots at the bottom of the chip
    if (skills.length > 0) {
      const dotsY = CHIP_H - DOT_R - 2;
      const dotsStartX = (chipW - dotRowW) / 2;
      for (let i = 0; i < skills.length; i++) {
        const dotColor = SKILL_COLORS[skills[i].skill] ?? 0x4a9eff;
        const dot = new Graphics()
          .circle(0, 0, DOT_R)
          .fill({ color: dotColor });
        dot.position.set(dotsStartX + i * (DOT_R * 2 + DOT_GAP) + DOT_R, dotsY);
        container.addChild(dot);
      }
      // Shift name up slightly to leave room for dots
      nameLabel.position.set(chipW / 2, CHIP_H / 2 - 3);
    }

    // Hover tint
    container.on('pointerover', () => {
      chipBg.alpha = 0.8;
    });
    container.on('pointerout', () => {
      chipBg.alpha = 1;
    });

    container._chipW = chipW;
    return container;
  }
}
