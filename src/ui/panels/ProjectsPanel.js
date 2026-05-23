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
import { SKILL_LABELS, SKILL_COLORS } from '@/data/skills.js';

const SECTION_LABEL_COLOR = 0x7a86a3;
const CARD_BG             = 0x131929;
const CARD_BORDER         = 0x1e3050;
const ACTIVE_CARD_BORDER  = 0x2a5090;
const TEXT_BRIGHT         = 0xe6e8ef;
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
    y += 22;

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
    const company  = this.game.sim.company;
    const reqCount = project.requirements.length;

    // Layout constants — all derived from startY + req area.
    // Header occupies 46px before requirements (name row + desc/day row).
    // Requirements: reqCount × 20px.
    // Below requirements:
    //   Available   → ins row (18) + gap (6) + slider (SLIDER_TOTAL_H) + gap (6) + btn (26) + pad (8)
    //   Active      → gap (4) + slider + gap (6) + [btn (26) + pad (8) if ready] + pad (8)
    const HEADER_H = 46;
    const REQ_H    = reqCount * 20;

    let cardH;
    if (!isActive) {
      cardH = HEADER_H + REQ_H + 18 + 6 + SLIDER_TOTAL_H + 6 + 26 + 8;
    } else if (project.isReadyToFinish) {
      cardH = HEADER_H + REQ_H + 4 + SLIDER_TOTAL_H + 6 + 26 + 8;
    } else {
      cardH = HEADER_H + REQ_H + 4 + SLIDER_TOTAL_H + 8;
    }

    // ── Card background ────────────────────────────────────────────────────

    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, CARD_RADIUS)
      .fill({ color: CARD_BG })
      .stroke({ color: isActive ? ACTIVE_CARD_BORDER : CARD_BORDER, width: 1.5 });
    bg.position.set(startX, startY);
    this._scroll.addChild(bg);

    // ── Row 1: Name + right badge ──────────────────────────────────────────

    const nameText = new Text({
      text: project.name,
      style: {
        fill: TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '700',
        wordWrap: true,
        wordWrapWidth: cardW - 110,
      },
    });
    nameText.position.set(startX + 10, startY + 10);
    this._scroll.addChild(nameText);

    if (!isActive) {
      // Available: base payout on the right
      const payoutText = new Text({
        text: `$${project.basePayout.toLocaleString()} base`,
        style: {
          fill: PAYOUT_COLOR,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: '700',
        },
      });
      payoutText.anchor.set(1, 0);
      payoutText.position.set(startX + cardW - 10, startY + 10);
      this._scroll.addChild(payoutText);
    } else {
      // Active: milestone tier badge, colour-coded
      const tier  = project.isReadyToFinish ? project.milestoneTier : this._currentTier(project, company.day);
      const color = MC[tier] ?? TEXT_DIM;
      const label = (tier === 'ahead' ? 'Ahead of Schedule'
        : tier === 'onTrack'  ? 'On Track'
        : tier === 'delayed'  ? 'Delayed'
        : tier === 'critical' ? 'Critical!'
        : '').toUpperCase();

      if (label) {
        const badge = new Text({
          text: label,
          style: {
            fill: color,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 10,
            fontWeight: '700',
          },
        });
        badge.anchor.set(1, 0);
        badge.position.set(startX + cardW - 10, startY + 12);
        this._scroll.addChild(badge);
      }
    }

    // ── Row 2: Description (available) or day info (active) ───────────────

    if (!isActive) {
      const descText = new Text({
        text: project.description,
        style: {
          fill: TEXT_DIM,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          wordWrap: true,
          wordWrapWidth: cardW - 20,
        },
      });
      descText.position.set(startX + 10, startY + 28);
      this._scroll.addChild(descText);
    } else {
      const elapsed  = company.day - project.startedDay + 1;
      const dayLabel = project.isReadyToFinish
        ? `Started day ${project.startedDay} · Finished day ${project.finishedDay}`
        : `Started day ${project.startedDay} · Day ${elapsed} of project`;
      const dayText = new Text({
        text: dayLabel,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      });
      dayText.position.set(startX + 10, startY + 28);
      this._scroll.addChild(dayText);
    }

    // ── Skill requirements ─────────────────────────────────────────────────

    let reqY = startY + HEADER_H;
    for (const req of project.requirements) {
      const pct        = Math.min(1, req.current / req.points);
      const barW       = Math.floor(cardW * 0.45);
      const skillColor = SKILL_COLORS[req.skill] ?? 0x4a9eff;

      const skillLabel = new Text({
        text: SKILL_LABELS[req.skill] ?? req.skill,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      });
      skillLabel.position.set(startX + 10, reqY);
      this._scroll.addChild(skillLabel);

      const trackBg = new Graphics()
        .roundRect(0, 0, barW, 10, 3)
        .fill({ color: PROGRESS_TRACK });
      trackBg.position.set(startX + cardW - barW - 48, reqY + 1);
      this._scroll.addChild(trackBg);

      if (pct > 0) {
        const fill = new Graphics()
          .roundRect(0, 0, Math.max(0, barW * pct), 10, 3)
          .fill({ color: skillColor });
        fill.position.set(startX + cardW - barW - 48, reqY + 1);
        this._scroll.addChild(fill);
      }

      const ptText = new Text({
        text: `${Math.floor(req.current)}/${req.points}`,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
      });
      ptText.anchor.set(1, 0);
      ptText.position.set(startX + cardW - 10, reqY);
      this._scroll.addChild(ptText);

      reqY += 20;
    }

    // ── Insurance info row (available only) ───────────────────────────────

    if (!isActive) {
      const insText = new Text({
        text: `Insurance: $${project.insurance.toLocaleString()}  ·  $${project.basePayout.toLocaleString()} base (if done in \u2264${project.milestones.onTrack}d)`,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 },
      });
      insText.position.set(startX + 10, reqY + 4);
      this._scroll.addChild(insText);
      reqY += 18 + 6;
    } else {
      reqY += 4;
    }

    // ── Milestone slider ──────────────────────────────────────────────────

    const sliderX = startX + 10;
    const sliderW = cardW - 20;
    this._buildMilestoneSlider(project, sliderX, reqY, sliderW, isActive ? company.day : null);
    reqY += SLIDER_TOTAL_H + 6;

    // ── Buttons ──────────────────────────────────────────────────────────

    if (!isActive) {
      const canAccept = company.activeProjects.length < company.maxActiveProjects
        && company.money >= project.insurance;

      const acceptBtn = this._makeButton(
        `Accept ($${project.insurance.toLocaleString()} ins.)`,
        canAccept ? 0x1a3a1a : 0x1a1a1a,
        canAccept ? 0x4ade80 : 0x4a5a6a,
        () => {
          if (!canAccept) return;
          this.game.sim.acceptProject(project);
          this.refresh();
        },
        130,
      );
      acceptBtn.position.set(startX + cardW - 210, reqY);
      this._scroll.addChild(acceptBtn);

      const rejectBtn = this._makeButton('Reject', 0x2a1a1a, 0xf87171, () => {
        this.game.sim.rejectProject(project);
        this.refresh();
      });
      rejectBtn.position.set(startX + cardW - 76, reqY);
      this._scroll.addChild(rejectBtn);

    } else if (project.isReadyToFinish) {
      const tierColor = MC[project.milestoneTier] ?? PAYOUT_COLOR;

      const collectBtn = this._makeButton(
        `Collect $${project.finalPayout.toLocaleString()} (+$${project.insurance.toLocaleString()})`,
        0x0a2a14, tierColor,
        () => {
          this.game.sim.finishProject(project);
          this.refresh();
        },
        180,
      );
      collectBtn.position.set(startX + cardW - 190, reqY);
      this._scroll.addChild(collectBtn);
    }

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
   * @param {object}      project    - project state object
   * @param {number}      startX     - left edge of the slider (absolute)
   * @param {number}      startY     - top edge of the slider (absolute)
   * @param {number}      sliderW    - total width in pixels
   * @param {number|null} currentDay - company.day for active projects; null for available
   */
  _buildMilestoneSlider(project, startX, startY, sliderW, currentDay) {
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
    this._scroll.addChild(trackBg);

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
      this._scroll.addChild(dimBg);

      // Bright fill — only for the elapsed portion
      if (isActive && fillFrac > 0) {
        const fillEndX = Math.min(Math.round(fillFrac * sliderW), segEndX);
        if (fillEndX > segX) {
          const brightFill = new Graphics()
            .roundRect(segX, 0, fillEndX - segX, SLIDER_BAR_H, 2)
            .fill({ color: seg.color, alpha: 0.80 });
          brightFill.position.set(startX, barY);
          this._scroll.addChild(brightFill);
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
      this._scroll.addChild(tierTxt);
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
      this._scroll.addChild(tick);

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
      this._scroll.addChild(dayTxt);
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
      this._scroll.addChild(stem);

      // Dot on top of the stem
      const dot = new Graphics()
        .circle(0, 0, 4)
        .fill({ color: markerColor });
      dot.position.set(startX + markerX, barY - 3);
      this._scroll.addChild(dot);
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

  _makeButton(label, bgColor, textColor, onClick, width = 72) {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const bg = new Graphics()
      .roundRect(0, 0, width, 26, 5)
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
    text.position.set(width / 2, 13);
    container.addChild(text);

    container.on('pointerup', onClick);
    container.on('pointerover', () => { bg.alpha = 0.8; });
    container.on('pointerout',  () => { bg.alpha = 1; });

    return container;
  }
}
