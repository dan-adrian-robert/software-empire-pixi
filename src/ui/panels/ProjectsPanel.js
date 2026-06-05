/**
 * ProjectsPanel
 *
 * Overlay panel listing Active projects (with progress bars, milestone slider,
 * and collect actions) and Available projects (with insurance cost, milestone
 * slider, and Accept/Reject buttons).
 *
 * Re-rendered on `refresh()` which is called by OfficeScene on relevant bus events.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { Button, Column, Row, Label, Panel, ProgressBar } from '../framework/index.js';
import { SKILL_LABELS, SKILL_COLORS } from '@/data/skills.js';
import { getProjectDifficultyStyle } from '../projectDifficulty.js';

const SECTION_LABEL_COLOR = 0x7a86a3;
const TEXT_DIM            = 0x7a86a3;
const PAYOUT_COLOR        = 0x4ade80;
const PADDING             = 12;
const CARD_RADIUS         = 8;
const PROGRESS_TRACK      = 0x1a2336;

/** Milestone colours — consistent across all milestone UI. */
const MC = {
  ahead:    0x4ade80,
  onTrack:  0x60a5fa,
  delayed:  0xfbbf24,
  critical: 0xf87171,
};
const ML = {
  ahead:    'Ahead',
  onTrack:  'On Track',
  delayed:  'Delayed',
  critical: 'Critical',
};

// Slider dimensions
const SLIDER_BAR_H   = 8;
const SLIDER_TOP_H   = 16;   // room for day tick labels above the bar
const SLIDER_BOT_H   = 14;   // room for tier labels below the bar
const SLIDER_TOTAL_H = SLIDER_TOP_H + SLIDER_BAR_H + SLIDER_BOT_H + 4;

export class ProjectsPanel extends Container {
  /**
   * @param {import('../../Game.js').Game} game
   * @param {(panel: Container) => void} [onClose]
   */
  constructor(game, onClose) {
    super();
    this.game = game;
    this.onClose = onClose;

    this._scroll = new Container();
    this._mask = new Graphics();
    this.addChild(this._scroll);

    this._width = 600;
    this._height = 500;
    this._scrollY = 0;
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
    y = this._buildSection('Active Projects', company.activeProjects, y, true);
    y += 8;
    y = this._buildSection('Available Projects', company.availableProjects, y, false);
  }

  // ─────────────────────────────────────────────────────────────────────────

  _buildSection(title, projects, startY, isActive) {
    let y = startY;
    const company = this.game.sim?.company;

    const header = new Text({
      text: title.toUpperCase(),
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

    // Refresh Pool button — shown only when project_refresh research is unlocked
    if (!isActive && company?.unlockedResearch.includes('project_refresh')) {
      const canAfford = (company.money ?? 0) >= 500;
      const refreshBtn = new Button({
        label:    'Refresh Pool ($500)',
        variant:  'secondary',
        width:    150,
        height:   20,
        disabled: !canAfford,
        fontSize: 10,
        onClick:  () => { this.game.sim.refreshAvailableProjects(); },
      });
      refreshBtn.position.set(this._width - PADDING - 150, y);
      this._scroll.addChild(refreshBtn);
    }

    y += 32;

    if (projects.length === 0) {
      const empty = new Text({
        text: isActive ? 'No active projects.' : 'No projects available.',
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
      });
      empty.position.set(PADDING + 8, y);
      this._scroll.addChild(empty);
      return y + 24;
    }

    const COL_COUNT = 2;
    const COL_GAP   = 8;
    const cardW     = Math.floor((this._width - PADDING * 2 - COL_GAP * (COL_COUNT - 1)) / COL_COUNT);

    for (let i = 0; i < projects.length; i += COL_COUNT) {
      let rowH = 0;
      for (let col = 0; col < COL_COUNT && i + col < projects.length; col++) {
        const x = PADDING + col * (cardW + COL_GAP);
        const h = this._buildProjectCard(projects[i + col], y, isActive, x, cardW);
        rowH = Math.max(rowH, h);
      }
      y += rowH + 8;
    }

    return y;
  }

  /** @returns {number} card height (px) */
  _buildProjectCard(project, startY, isActive, startX = PADDING, cardW = null) {
    if (cardW === null) cardW = this._width - PADDING * 2;
    const company     = this.game.sim.company;
    const rarityStyle = getProjectDifficultyStyle(project.difficulty);
    // Inner width available inside the column's horizontal padding (10 each side)
    const innerW = cardW - 20;

    // ── Content column (auto-height) ───────────────────────────────────────
    const col = new Column({
      width:   cardW,
      height:  'auto',
      padding: 10,
      gap:     4,
    });

    // ── Header: name (left) + payout/badge (right) ─────────────────────────
    const headerRow = new Row({ width: innerW, justify: 'spaceBetween', align: 'start', gap: 0 });

    headerRow.add(new Label({
      text:          project.name,
      variant:       'title',
      fontSize:      14,
      wordWrap:      true,
      wordWrapWidth: innerW - 105,
      width:         innerW - 105,
    }));

    if (!isActive) {
      headerRow.add(new Label({
        text:       `$${project.basePayout.toLocaleString()} base`,
        color:      PAYOUT_COLOR,
        fontSize:   12,
        fontWeight: '700',
      }));
    } else {
      const tier  = project.isReadyToFinish ? project.milestoneTier : this._currentTier(project, company.day);
      const color = MC[tier] ?? TEXT_DIM;
      const lbl   = (tier === 'ahead'    ? 'Ahead of Schedule'
                   : tier === 'onTrack'  ? 'On Track'
                   : tier === 'delayed'  ? 'Delayed'
                   : tier === 'critical' ? 'Critical!'
                   : '').toUpperCase();
      headerRow.add(new Label({ text: lbl, color, fontSize: 10, fontWeight: '700' }));
    }
    col.add(headerRow);

    // ── Rarity label ───────────────────────────────────────────────────────
    col.add(new Label({
      text:       rarityStyle.label.toUpperCase(),
      color:      rarityStyle.text,
      fontSize:   10,
      fontWeight: '700',
    }));

    // ── Description (available) or day-info (active) ───────────────────────
    if (!isActive) {
      col.add(new Label({
        text:          project.description,
        variant:       'caption',
        fontSize:      11,
        wordWrap:      true,
        wordWrapWidth: innerW,
      }));
    } else {
      const elapsed  = company.day - project.startedDay + 1;
      const dayLabel = project.isReadyToFinish
        ? `Started day ${project.startedDay} · Finished day ${project.finishedDay}`
        : `Started day ${project.startedDay} · Day ${elapsed} of project`;
      col.add(new Label({ text: dayLabel, variant: 'caption', fontSize: 11 }));
    }

    // ── Skill requirements ─────────────────────────────────────────────────
    // bar width = innerW minus fixed skill label (75) + pts label (38) + two gaps (6×2)
    const barW = innerW - 75 - 38 - 12;
    for (const req of project.requirements) {
      const pct        = Math.min(1, req.current / req.points);
      const skillColor = SKILL_COLORS[req.skill] ?? 0x4a9eff;

      const reqRow = new Row({ width: innerW, gap: 6, align: 'center' });
      reqRow.add(new Label({ text: SKILL_LABELS[req.skill] ?? req.skill, variant: 'caption', fontSize: 11, width: 75 }));
      reqRow.add(new ProgressBar({ width: barW, height: 8, value: pct, fillColor: skillColor, trackColor: PROGRESS_TRACK }));
      reqRow.add(new Label({ text: `${Math.floor(req.current)}/${req.points}`, variant: 'caption', width: 38, align: 'right' }));
      col.add(reqRow);
    }

    // ── Insurance row (available only) ────────────────────────────────────
    if (!isActive) {
      col.add(new Label({
        text:    `Insurance: $${project.insurance.toLocaleString()}  ·  $${project.basePayout.toLocaleString()} base (if done in \u2264${project.milestones.onTrack}d)`,
        variant: 'caption',
        fontSize: 11,
      }));
    }

    // ── Milestone slider (custom Graphics — unchanged logic) ──────────────
    const sliderContainer = new Container();
    sliderContainer.measure = () => ({ width: innerW, height: SLIDER_TOTAL_H });
    this._buildMilestoneSlider(project, 0, 0, innerW, isActive ? company.day : null, sliderContainer);
    col.add(sliderContainer);

    // ── Buttons ───────────────────────────────────────────────────────────
    if (!isActive) {
      const canAccept = company.activeProjects.length < company.maxActiveProjects
        && company.money >= project.insurance;

      const btnRow = new Row({ width: innerW, justify: 'end', gap: 8 });
      btnRow.add(new Button({
        label:    `Accept ($${project.insurance.toLocaleString()} ins.)`,
        variant:  canAccept ? 'success' : 'secondary',
        width:    130,
        height:   26,
        disabled: !canAccept,
        fontSize: 11,
        onClick:  () => { this.game.sim.acceptProject(project); this.refresh(); },
      }));
      btnRow.add(new Button({
        label:   'Reject',
        variant: 'danger',
        width:   72,
        height:  26,
        onClick: () => { this.game.sim.rejectProject(project); this.refresh(); },
      }));
      col.add(btnRow);
    } else if (project.isReadyToFinish) {
      const tierColor  = MC[project.milestoneTier] ?? PAYOUT_COLOR;
      const collectBtn = this._makeCollectButton(
        `Collect $${project.finalPayout.toLocaleString()} (+$${project.insurance.toLocaleString()})`,
        tierColor,
        () => { this.game.sim.finishProject(project); this.refresh(); },
      );
      // Provide a measure shim so Column can size this raw Container correctly.
      collectBtn.measure = () => ({ width: 180, height: 26 });
      // Wrap in a right-aligned Row so the button sits flush-right.
      const collectRow = new Row({ width: innerW, justify: 'end' });
      collectRow.add(collectBtn);
      col.add(collectRow);
    }

    // ── Assemble: Panel background + Column content ───────────────────────
    const cardH = col.measure().height;
    const panel = new Panel({
      width:       cardW,
      height:      cardH,
      bg:          rarityStyle.bg,
      border:      rarityStyle.border,
      borderWidth: 1.5,
      radius:      CARD_RADIUS,
    });

    const card = new Container();
    card.addChild(panel);  // background first
    card.addChild(col);    // content on top
    card.position.set(startX, startY);
    this._scroll.addChild(card);

    return cardH;
  }

  // ── Milestone slider ─────────────────────────────────────────────────────

  /**
   * Renders a segmented milestone timeline bar.
   *
   * Layout (top → bottom):
   *   [day tick labels]     ← SLIDER_TOP_H px
   *   [coloured bar]        ← SLIDER_BAR_H px
   *   [tier name labels]    ← SLIDER_BOT_H px
   *
   * For active projects a white position-marker dot is drawn at the current
   * elapsed day.  For projects that are ready to collect the marker uses the
   * milestone tier colour and sits at the locked finishedDay.
   *
   * @param {object}           project    - project state object
   * @param {number}           startX     - left edge of the slider
   * @param {number}           startY     - top edge of the slider
   * @param {number}           sliderW    - total width in pixels
   * @param {number|null}      currentDay - company.day for active projects; null for available
   * @param {Container|null}   target     - container to add children to; defaults to this._scroll
   */
  _buildMilestoneSlider(project, startX, startY, sliderW, currentDay, target = null) {
    const dest = target ?? this._scroll;
    const { milestones } = project;
    const total  = milestones.critical;
    const barY   = startY + SLIDER_TOP_H;

    // Compute elapsed / fill position
    const isActive     = currentDay !== null && project.startedDay !== null;
    const elapsed      = isActive ? currentDay - project.startedDay + 1 : 0;
    const lockedElapsed = (project.finishedDay !== null && project.startedDay !== null)
      ? project.finishedDay - project.startedDay + 1
      : null;
    const displayElapsed = lockedElapsed ?? elapsed;
    const fillFrac       = isActive ? Math.min(1, displayElapsed / total) : 0;

    const segments = [
      { key: 'ahead',    label: ML.ahead,    from: 0,                  to: milestones.ahead,    color: MC.ahead },
      { key: 'onTrack',  label: ML.onTrack,  from: milestones.ahead,   to: milestones.onTrack,  color: MC.onTrack },
      { key: 'delayed',  label: ML.delayed,  from: milestones.onTrack, to: milestones.delayed,  color: MC.delayed },
      { key: 'critical', label: ML.critical, from: milestones.delayed, to: milestones.critical, color: MC.critical },
    ];

    // Dark track background
    const trackBg = new Graphics()
      .roundRect(0, 0, sliderW, SLIDER_BAR_H, 3)
      .fill({ color: 0x0d1526 });
    trackBg.position.set(startX, barY);
    dest.addChild(trackBg);

    // Coloured segments
    for (const seg of segments) {
      const segX    = Math.round((seg.from / total) * sliderW);
      const segEndX = Math.round((seg.to   / total) * sliderW);
      const segW    = segEndX - segX;
      if (segW <= 0) continue;

      // Dim background fill
      const dimBg = new Graphics()
        .roundRect(segX, 0, segW, SLIDER_BAR_H, 2)
        .fill({ color: seg.color, alpha: 0.18 });
      dimBg.position.set(startX, barY);
      dest.addChild(dimBg);

      // Bright fill — only for the elapsed portion
      if (isActive && fillFrac > 0) {
        const fillEndX = Math.min(Math.round(fillFrac * sliderW), segEndX);
        if (fillEndX > segX) {
          const brightFill = new Graphics()
            .roundRect(segX, 0, fillEndX - segX, SLIDER_BAR_H, 2)
            .fill({ color: seg.color, alpha: 0.80 });
          brightFill.position.set(startX, barY);
          dest.addChild(brightFill);
        }
      }

      // Tier label below the bar — centred in the segment
      const segMidX = segX + segW / 2;
      const isPast  = isActive && displayElapsed > seg.from;
      const tierTxt = new Text({
        text: seg.label,
        style: {
          fill:       isPast ? seg.color : 0x3a4a6a,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   9,
          fontWeight: '600',
        },
      });
      tierTxt.anchor.set(0.5, 0);
      tierTxt.position.set(startX + segMidX, barY + SLIDER_BAR_H + 4);
      dest.addChild(tierTxt);
    }

    // Day tick marks + number labels at each segment boundary (top of bar)
    const boundaries = [
      milestones.ahead,
      milestones.onTrack,
      milestones.delayed,
      milestones.critical,
    ];
    for (const day of boundaries) {
      const tickX = Math.round((day / total) * sliderW);

      const tick = new Graphics()
        .rect(0, 0, 1, SLIDER_BAR_H + 3)
        .fill({ color: 0x1a2b44 });
      tick.position.set(startX + tickX, barY - 1);
      dest.addChild(tick);

      const dayTxt = new Text({
        text: `${day}d`,
        style: {
          fill:       TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   9,
        },
      });
      dayTxt.anchor.set(0.5, 1);
      dayTxt.position.set(startX + tickX, barY - 2);
      dest.addChild(dayTxt);
    }

    // Position marker (dot + short vertical stem) for active projects
    if (isActive && displayElapsed > 0) {
      const markerFrac  = Math.min(displayElapsed / total, 1);
      const markerX     = Math.round(markerFrac * sliderW);
      const markerColor = lockedElapsed !== null
        ? (MC[project.milestoneTier] ?? 0xffffff)
        : 0xffffff;

      // Vertical stem
      const stem = new Graphics()
        .rect(-1, 0, 2, SLIDER_BAR_H + 6)
        .fill({ color: markerColor });
      stem.position.set(startX + markerX, barY - 3);
      dest.addChild(stem);

      // Dot on top of the stem
      const dot = new Graphics()
        .circle(0, 0, 4)
        .fill({ color: markerColor });
      dot.position.set(startX + markerX, barY - 3);
      dest.addChild(dot);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Returns the milestone tier key for an in-progress project at a given day.
   */
  _currentTier(project, currentDay) {
    if (project.startedDay === null) return 'onTrack';
    const elapsed = currentDay - project.startedDay + 1;
    const { milestones } = project;
    if (elapsed <= milestones.ahead)   return 'ahead';
    if (elapsed <= milestones.onTrack) return 'onTrack';
    if (elapsed <= milestones.delayed) return 'delayed';
    return 'critical';
  }

  /** Collect button: uses the milestone tier color which can't map to a static variant. */
  _makeCollectButton(label, tierColor, onClick) {
    const width = 180;
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, width, 26, 5)
      .fill({ color: 0x0a2a14 })
      .stroke({ color: tierColor, width: 1, alpha: 0.5 });
    container.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fill: tierColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '600',
      },
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, 13);
    text.eventMode = 'none';
    container.addChild(text);

    container.on('pointerup', onClick);
    container.on('pointerover', () => { bg.alpha = 0.8; });
    container.on('pointerout',  () => { bg.alpha = 1; });

    return container;
  }
}
