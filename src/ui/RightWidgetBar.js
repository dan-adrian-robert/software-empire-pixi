/**
 * RightWidgetBar
 *
 * Right sidebar that hosts a set of toggleable widgets:
 *   - Activity  : recent notification entries
 *   - Projects  : active project cards with per-requirement progress bars
 *
 * The header strip at the top contains one toggle button per widget.
 * Clicking a button hides/shows its widget section. Widget sections stack
 * vertically and reflow whenever any toggle changes.
 */
import { Container, Graphics, Text, Rectangle } from 'pixi.js';
import { TOP_BAR_HEIGHT } from './TopBarHUD.js';
import { SKILL_LABELS, SKILL_COLORS } from '../data/skills.js';
import { getActiveMilestoneStatus } from '../state/Project.js';
import { currentPeriodSp } from '../state/Company.js';

export const RIGHT_SIDEBAR_WIDTH = 260;

// ── Shared colours ────────────────────────────────────────────────────────────
const BG            = 0x0d1526;
const BORDER        = 0x1e2d47;
const SECTION_LABEL = 0x7a86a3;
const TEXT_BRIGHT   = 0xe6e8ef;
const TEXT_DIM      = 0x7a86a3;

// Toggle header
const TOGGLE_H      = 32;
const TOGGLE_BTN_H  = 22;
const TOGGLE_ON_BG  = 0x1a3060;
const TOGGLE_ON_BD  = 0x4a7acc;
const TOGGLE_OFF_BG = 0x111828;
const TOGGLE_OFF_BD = 0x1e2d47;

// Activity widget
const ACT_ROW_H   = 36;
const ACT_ROW_GAP = 2;
const ACT_PADDING = 10;
const ACT_MAX_H   = 440; // fixed viewport height; content scrolls beyond this

const TYPE_COLORS = {
  info:     0x6b7fa3,
  success:  0x4ade80,
  warning:  0xfbbf24,
  critical: 0xf87171,
};
const TYPE_BG = {
  info:     0x12192d,
  success:  0x0f1f14,
  warning:  0x1f1800,
  critical: 0x1f0000,
};

// Projects widget
const PROJ_PADDING     = 10;
const PROJ_CARD_BG     = 0x131929;
const PROJ_CARD_BORDER = 0x2a5090;
const PROJ_PAYOUT      = 0x4ade80;
const PROJ_TRACK       = 0x1a2336;
const PROJ_CARD_RADIUS = 6;

const MILESTONE_COLORS = {
  ahead:    0x4ade80,
  onTrack:  0x60a5fa,
  delayed:  0xfbbf24,
  critical: 0xf87171,
};
const MILESTONE_LABELS = {
  ahead:    'Ahead',
  onTrack:  'On Track',
  delayed:  'Delayed',
  critical: 'Critical!',
};

// SP Productivity widget colours
const SP_TRACK    = 0x1a2336;
const SP_BAR      = 0x4a7acc;
const SP_BAR_LIVE = 0x2a4a6a;

// ── Widget definitions ─────────────────────────────────────────────────────────
const WIDGETS = [
  { id: 'sp_productivity', label: 'SP Prod' },
  { id: 'activity',        label: 'Activity' },
  { id: 'projects',        label: 'Projects' },
];

export class RightWidgetBar extends Container {
  /** @param {import('../Game.js').Game} game */
  constructor(game) {
    super();
    this.game = game;

    this._bg = new Graphics();
    this.addChild(this._bg);

    // Per-widget visibility state (all on by default)
    this._visible = { activity: true, projects: true, sp_productivity: true };

    // Containers filled during refresh
    this._toggleHeader = new Container();
    this._content     = new Container();
    this.addChild(this._toggleHeader);
    this.addChild(this._content);

    this._height           = 600;
    this._lastCount        = -1;  // notifications length cache
    this._lastProjectsKey  = '';  // fingerprint of active project progress
    this._lastSpKey        = '';  // fingerprint of SP productivity state
    this._activityScrollY  = 0;   // current scroll offset for the activity viewport
  }

  init(screenWidth, screenHeight) {
    this._screenWidth = screenWidth;
    this._height      = screenHeight - TOP_BAR_HEIGHT;
    this.x = screenWidth - RIGHT_SIDEBAR_WIDTH;
    this.y = TOP_BAR_HEIGHT;
    this._drawBg();
    this._buildToggleHeader();
    this.refresh(true);
  }

  resize(screenWidth, screenHeight) {
    this._screenWidth = screenWidth;
    this._height      = screenHeight - TOP_BAR_HEIGHT;
    this.x = screenWidth - RIGHT_SIDEBAR_WIDTH;
    this._drawBg();
    this._buildToggleHeader();
    this.refresh(true);
  }

  /**
   * Refresh the widget content.
   * @param {boolean} [force] – skip the change-detection guard
   */
  refresh(force = false) {
    const notifs   = this.game.sim?.notifications.notifications ?? [];
    const projects = this.game.sim?.company.activeProjects ?? [];
    const company  = this.game.sim?.company;

    const currentDay  = company?.day ?? 0;
    const projectsKey = projects
      .map(p => `${p.id}:${p.isReadyToFinish ? 'ready' : `d${currentDay},${p.requirements.map(r => Math.floor(r.current)).join(',')}`}`)
      .join('|');

    const prod   = company?.dailySpProductivity;
    const liveSp = company ? currentPeriodSp(company) : 0;
    const spKey  = prod ? `${prod.total}:${prod.periods.length}:${liveSp.toFixed(1)}` : '';

    const unchanged =
      notifs.length  === this._lastCount &&
      projectsKey    === this._lastProjectsKey &&
      spKey          === this._lastSpKey;

    if (!force && unchanged) return;

    this._lastCount       = notifs.length;
    this._lastProjectsKey = projectsKey;
    this._lastSpKey       = spKey;
    this._buildContent(notifs, projects);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _drawBg() {
    this._bg
      .clear()
      .rect(0, 0, RIGHT_SIDEBAR_WIDTH, this._height)
      .fill({ color: BG })
      .moveTo(0, 0)
      .lineTo(0, this._height)
      .stroke({ color: BORDER, width: 1 });
  }

  _buildToggleHeader() {
    this._toggleHeader.removeChildren();

    // Separator line below toggle strip
    const sep = new Graphics()
      .rect(0, TOGGLE_H - 1, RIGHT_SIDEBAR_WIDTH, 1)
      .fill({ color: BORDER });
    this._toggleHeader.addChild(sep);

    const btnCount  = WIDGETS.length;
    const totalGap  = 6 * (btnCount + 1);
    const btnW      = Math.floor((RIGHT_SIDEBAR_WIDTH - totalGap) / btnCount);
    const btnY      = Math.floor((TOGGLE_H - TOGGLE_BTN_H) / 2);

    WIDGETS.forEach((widget, idx) => {
      const x   = 6 + idx * (btnW + 6);
      const on  = this._visible[widget.id];

      const btn = new Container();
      btn.eventMode = 'static';
      btn.cursor    = 'pointer';

      const bg = new Graphics()
        .roundRect(0, 0, btnW, TOGGLE_BTN_H, 4)
        .fill({ color: on ? TOGGLE_ON_BG : TOGGLE_OFF_BG })
        .stroke({ color: on ? TOGGLE_ON_BD : TOGGLE_OFF_BD, width: 1 });
      btn.addChild(bg);

      const label = new Text({
        text: widget.label,
        style: {
          fill:       on ? 0xc8d4ed : 0x4a5a7a,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   11,
          fontWeight: '600',
        },
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(btnW / 2, TOGGLE_BTN_H / 2);
      btn.addChild(label);

      btn.position.set(x, btnY);

      btn.on('pointerup', () => {
        this._visible[widget.id] = !this._visible[widget.id];
        this._buildToggleHeader();
        this.refresh(true);
      });
      btn.on('pointerover', () => { bg.alpha = 0.75; });
      btn.on('pointerout',  () => { bg.alpha = 1; });

      this._toggleHeader.addChild(btn);
    });
  }

  _buildContent(notifs, projects) {
    this._content.removeChildren();
    this._content.y = TOGGLE_H;

    let y = 4;
    let anyAbove = false;

    if (this._visible.sp_productivity) {
      y = this._buildSpProductivitySection(y, anyAbove);
      anyAbove = true;
    }
    if (this._visible.activity) {
      y = this._buildActivitySection(notifs, y, anyAbove);
      anyAbove = true;
    }
    if (this._visible.projects) {
      y = this._buildProjectsSection(projects, y, anyAbove);
    }
  }

  // ── SP Productivity section ─────────────────────────────────────────────────

  _buildSpProductivitySection(startY, hasAbove = false) {
    const company = this.game.sim?.company;
    let y = startY;

    if (hasAbove) {
      const sep = new Graphics().rect(0, 0, RIGHT_SIDEBAR_WIDTH, 1).fill({ color: BORDER });
      sep.y = y;
      this._content.addChild(sep);
      y += 6;
    }

    const PAD = 10;

    const header = this._makeLabel('SP PRODUCTIVITY', PAD, y);
    this._content.addChild(header);
    y += 18;

    const prod   = company?.dailySpProductivity;
    const liveSp = company ? currentPeriodSp(company) : 0;
    const periods = prod?.periods ?? [];
    const totalSp = prod?.total ?? 0;

    // Summary line
    const displayTotal = Math.round((totalSp + liveSp) * 10) / 10;
    const summaryText = new Text({
      text: `Today: ${displayTotal} SP`,
      style: {
        fill:       TEXT_BRIGHT,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   12,
        fontWeight: '700',
      },
    });
    summaryText.position.set(PAD, y);
    this._content.addChild(summaryText);

    const subText = new Text({
      text: `${periods.length} period${periods.length !== 1 ? 's' : ''} completed`,
      style: {
        fill:       TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   10,
      },
    });
    subText.position.set(PAD, y + 15);
    this._content.addChild(subText);
    y += 32;

    if (periods.length === 0 && liveSp < 0.1) {
      const empty = this._makeDimText('No SP produced yet today.', PAD, y);
      this._content.addChild(empty);
      return y + 20;
    }

    // Bar area constants
    const LABEL_W = 38;
    const VALUE_W = 30;
    const BAR_W   = RIGHT_SIDEBAR_WIDTH - PAD * 2 - LABEL_W - VALUE_W - 4;
    const BAR_H   = 7;
    const ROW_H   = 14;

    const maxSp = Math.max(...periods, liveSp, 1);

    // Helper to draw one bar row
    const drawRow = (label, sp, isLive) => {
      const labelT = new Text({
        text: label,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
      });
      labelT.position.set(PAD, y + 1);
      this._content.addChild(labelT);

      const trackX = PAD + LABEL_W;
      const track = new Graphics().roundRect(0, 0, BAR_W, BAR_H, 2).fill({ color: SP_TRACK });
      track.position.set(trackX, y + (ROW_H - BAR_H) / 2);
      this._content.addChild(track);

      const fillW = Math.max(0, Math.round(BAR_W * (sp / maxSp)));
      if (fillW > 0) {
        const fill = new Graphics()
          .roundRect(0, 0, fillW, BAR_H, 2)
          .fill({ color: isLive ? SP_BAR_LIVE : SP_BAR, alpha: isLive ? 0.65 : 1 });
        fill.position.set(trackX, y + (ROW_H - BAR_H) / 2);
        this._content.addChild(fill);
      }

      const valT = new Text({
        text: sp > 0 ? sp.toFixed(1) : '…',
        style: { fill: isLive ? TEXT_DIM : TEXT_BRIGHT, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
      });
      valT.anchor.set(1, 0);
      valT.position.set(RIGHT_SIDEBAR_WIDTH - PAD, y + 1);
      this._content.addChild(valT);

      y += ROW_H;
    };

    // Completed periods — label is clock time derived from schedule
    const { startHour } = company?.schedule ?? { startHour: 8 };
    periods.forEach((sp, i) => {
      const hour   = startHour + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      const label  = `${hour}:${minute === 0 ? '00' : '30'}`;
      drawRow(label, sp, false);
    });

    // Live partial bar (currently in a WORK period with buffered SP)
    if (liveSp >= 0.05) {
      const nextIdx = periods.length;
      const hour    = startHour + Math.floor(nextIdx / 2);
      const minute  = (nextIdx % 2) * 30;
      const label   = `${hour}:${minute === 0 ? '00' : '30'}`;
      drawRow(label, Math.round(liveSp * 10) / 10, true);
    }

    return y + 4;
  }

  // ── Activity section ────────────────────────────────────────────────────────

  _buildActivitySection(notifs, startY, hasAbove = false) {
    let y = startY;

    if (hasAbove) {
      const sep = new Graphics().rect(0, 0, RIGHT_SIDEBAR_WIDTH, 1).fill({ color: BORDER });
      sep.y = y;
      this._content.addChild(sep);
      y += 6;
    }

    // Section label
    const header = this._makeLabel('ACTIVITY', ACT_PADDING, y);
    this._content.addChild(header);
    y += 18;

    if (notifs.length === 0) {
      const empty = this._makeDimText('No activity yet.', ACT_PADDING, y);
      this._content.addChild(empty);
      return y + 20;
    }

    // Build all rows into an inner container so we can measure and scroll.
    const rows = new Container();
    notifs.forEach((n, i) => {
      const rowY = i * (ACT_ROW_H + ACT_ROW_GAP);

      const rowBg = new Graphics()
        .rect(ACT_PADDING / 2, 0, RIGHT_SIDEBAR_WIDTH - ACT_PADDING, ACT_ROW_H)
        .fill({ color: TYPE_BG[n.type] ?? TYPE_BG.info });
      rowBg.y = rowY;
      rows.addChild(rowBg);

      const dot = new Graphics()
        .circle(0, 0, 4)
        .fill({ color: TYPE_COLORS[n.type] ?? TYPE_COLORS.info });
      dot.position.set(ACT_PADDING + 4, rowY + ACT_ROW_H / 2);
      rows.addChild(dot);

      const label = new Text({
        text: n.text,
        style: {
          fill:          0xc8d4ed,
          fontFamily:    'Inter, system-ui, sans-serif',
          fontSize:      11,
          wordWrap:      true,
          wordWrapWidth: RIGHT_SIDEBAR_WIDTH - ACT_PADDING * 2 - 16,
          lineHeight:    14,
        },
      });
      label.position.set(ACT_PADDING + 14, rowY + 4);
      rows.addChild(label);
    });

    const contentH  = notifs.length * (ACT_ROW_H + ACT_ROW_GAP);
    const viewportH = Math.min(ACT_MAX_H, contentH);

    // Clamp stored scroll so it remains valid after a daily clear or list shrink.
    const maxScroll = -(contentH - viewportH);
    this._activityScrollY = Math.max(maxScroll, Math.min(0, this._activityScrollY));
    rows.y = this._activityScrollY;

    // Clip mask positioned in _content-local space.
    const mask = new Graphics()
      .rect(0, y, RIGHT_SIDEBAR_WIDTH, viewportH)
      .fill({ color: 0xffffff });
    this._content.addChild(mask);

    // Viewport container captures wheel events over the clipped area.
    const viewport = new Container();
    viewport.eventMode = 'static';
      viewport.hitArea   = new Rectangle(0, 0, RIGHT_SIDEBAR_WIDTH, viewportH);
    viewport.y         = y;
    viewport.mask      = mask;
    viewport.addChild(rows);

    viewport.on('wheel', (e) => {
      const maxS = -(contentH - viewportH);
      this._activityScrollY = Math.max(maxS, Math.min(0, this._activityScrollY - e.deltaY * 0.5));
      rows.y = this._activityScrollY;
    });

    this._content.addChild(viewport);

    return y + viewportH + 4;
  }

  // ── Projects section ────────────────────────────────────────────────────────

  _buildProjectsSection(projects, startY, hasAbove = false) {
    let y = startY;

    if (hasAbove) {
      const sep = new Graphics().rect(0, 0, RIGHT_SIDEBAR_WIDTH, 1).fill({ color: BORDER });
      sep.y = y;
      this._content.addChild(sep);
      y += 6;
    }

    const header = this._makeLabel('ACTIVE PROJECTS', PROJ_PADDING, y);
    this._content.addChild(header);
    y += 18;

    if (projects.length === 0) {
      const empty = this._makeDimText('No active projects.', PROJ_PADDING, y);
      this._content.addChild(empty);
      return y + 20;
    }

    const cardW = RIGHT_SIDEBAR_WIDTH - PROJ_PADDING * 2;

    for (const project of projects) {
      y = this._buildProjectCard(project, y, cardW);
      y += 6;
    }

    return y;
  }

  /**
   * Draw a compact project card with per-requirement bars and milestone status.
   * @returns {number} y after the card
   */
  _buildProjectCard(project, startY, cardW) {
    const company  = this.game.sim?.company;
    const reqCount = project.requirements.length;
    // Height: header(28) + milestone row(18) + reqs(22 each) + optional collect(32)
    const cardH = 46 + reqCount * 22 + (project.isReadyToFinish ? 32 : 0);

    const bg = new Graphics()
      .roundRect(0, 0, cardW, cardH, PROJ_CARD_RADIUS)
      .fill({ color: PROJ_CARD_BG })
      .stroke({ color: PROJ_CARD_BORDER, width: 1 });
    bg.position.set(PROJ_PADDING, startY);
    this._content.addChild(bg);

    // Project name (left)
    const nameText = new Text({
      text: project.name,
      style: {
        fill:         TEXT_BRIGHT,
        fontFamily:   'Inter, system-ui, sans-serif',
        fontSize:     12,
        fontWeight:   '700',
        wordWrap:     true,
        wordWrapWidth: cardW - 70,
      },
    });
    nameText.position.set(PROJ_PADDING + 8, startY + 8);
    this._content.addChild(nameText);

    // Payout / tier badge (top-right)
    const status = project.isReadyToFinish
      ? { tier: project.milestoneTier }
      : (company ? getActiveMilestoneStatus(project, company.day) : null);

    const badgeColor = (status && MILESTONE_COLORS[status.tier]) ?? PROJ_PAYOUT;
    const badgeLabel = status ? (MILESTONE_LABELS[status.tier] ?? '') : '';

    const badgeText = new Text({
      text: badgeLabel,
      style: {
        fill:       badgeColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   10,
        fontWeight: '700',
      },
    });
    badgeText.anchor.set(1, 0);
    badgeText.position.set(PROJ_PADDING + cardW - 6, startY + 8);
    this._content.addChild(badgeText);

    // Milestone status / elapsed row
    let infoLabel = '';
    if (project.isReadyToFinish) {
      const payout = project.finalPayout ?? 0;
      infoLabel = `Ready · $${payout.toLocaleString()} + $${project.insurance.toLocaleString()} refund`;
    } else if (company && project.startedDay !== null) {
      const elapsed = company.day - project.startedDay + 1;
      if (status && status.remaining > 0) {
        infoLabel = `Day ${elapsed} · ${status.remaining}d left at ${MILESTONE_LABELS[status.tier] ?? ''}`;
      } else if (status) {
        infoLabel = `Day ${elapsed} · Last day at ${MILESTONE_LABELS[status.tier] ?? ''}!`;
      }
    }

    if (infoLabel) {
      const infoColor = (status && MILESTONE_COLORS[status.tier]) ?? TEXT_DIM;
      const infoText = new Text({
        text: infoLabel,
        style: {
          fill:       infoColor,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   10,
        },
      });
      infoText.position.set(PROJ_PADDING + 8, startY + 24);
      this._content.addChild(infoText);
    }

    // Per-requirement progress bars
    let reqY = startY + 38;
    const barW = Math.floor(cardW * 0.46);

    for (const req of project.requirements) {
      const pct        = Math.min(1, req.current / req.points);
      const skillColor = SKILL_COLORS[req.skill] ?? 0x4a9eff;

      const skillLabel = new Text({
        text: SKILL_LABELS[req.skill] ?? req.skill,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
      });
      skillLabel.position.set(PROJ_PADDING + 8, reqY);
      this._content.addChild(skillLabel);

      const track = new Graphics()
        .roundRect(0, 0, barW, 8, 2)
        .fill({ color: PROJ_TRACK });
      track.position.set(PROJ_PADDING + cardW - barW - 42, reqY + 1);
      this._content.addChild(track);

      const fillW = Math.max(0, barW * pct);
      if (fillW > 0) {
        const fill = new Graphics()
          .roundRect(0, 0, fillW, 8, 2)
          .fill({ color: skillColor });
        fill.position.set(PROJ_PADDING + cardW - barW - 42, reqY + 1);
        this._content.addChild(fill);
      }

      const ptText = new Text({
        text: `${Math.floor(req.current)}/${req.points}`,
        style: { fill: TEXT_DIM, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 },
      });
      ptText.anchor.set(1, 0);
      ptText.position.set(PROJ_PADDING + cardW - 6, reqY);
      this._content.addChild(ptText);

      reqY += 20;
    }

    // Collect button for ready-to-finish projects
    if (project.isReadyToFinish) {
      const tierColor = (status && MILESTONE_COLORS[status.tier]) ?? 0x4ade80;
      const payout    = project.finalPayout ?? 0;
      const btnLabel  = `Collect $${payout.toLocaleString()} (+$${project.insurance.toLocaleString()})`;
      const btnW = cardW - 16;
      const btnH = 22;

      const btnBg = new Graphics()
        .roundRect(0, 0, btnW, btnH, 4)
        .fill({ color: 0x0a2a14 })
        .stroke({ color: tierColor, width: 1, alpha: 0.8 });
      btnBg.position.set(PROJ_PADDING + 8, reqY + 2);
      btnBg.eventMode = 'static';
      btnBg.cursor = 'pointer';

      const btnText = new Text({
        text: btnLabel,
        style: {
          fill:       tierColor,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize:   11,
          fontWeight: '700',
        },
      });
      btnText.anchor.set(0.5, 0.5);
      btnText.position.set(btnW / 2, btnH / 2);
      btnBg.addChild(btnText);

      btnBg.on('pointerup', () => {
        this.game.sim.finishProject(project);
        this.refresh(true);
      });
      btnBg.on('pointerover', () => { btnBg.alpha = 0.8; });
      btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

      this._content.addChild(btnBg);
    }

    return startY + cardH;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _makeLabel(text, x, y) {
    const t = new Text({
      text,
      style: {
        fill:          SECTION_LABEL,
        fontFamily:    'Inter, system-ui, sans-serif',
        fontSize:      10,
        fontWeight:    '700',
        letterSpacing: 1,
      },
    });
    t.position.set(x, y);
    return t;
  }

  _makeDimText(text, x, y) {
    const t = new Text({
      text,
      style: {
        fill:       TEXT_DIM,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize:   11,
      },
    });
    t.position.set(x, y);
    return t;
  }
}
