/**
 * DayReportPopup
 *
 * Centered modal shown at the end of each day (triggered by the `day:report`
 * event). Summarises finances, project outcomes, and the full activity log
 * before the player starts the next day.
 *
 * Usage:
 *   popup.open(snapshot, screenW, screenH)
 *   popup.close()
 *   popup.resize(screenW, screenH)
 *
 * snapshot shape: { day, moneyEnd, notifications, company }
 */
import { Container, Graphics, Text, Rectangle } from 'pixi.js';
import { projectElapsedDays, getActiveMilestoneStatus } from '../state/Project.js';

// ── Dimensions ────────────────────────────────────────────────────────────────
const W          = 480;
const P          = 16;
const ROW_H      = 28;
const SECTION_GAP = 10;
const LOG_MAX_H  = 200;  // max height of the scrollable activity log area

// ── Palette ───────────────────────────────────────────────────────────────────
const BG           = 0x0b1422;
const BORDER       = 0x2a4a8a;
const DIVIDER_COL  = 0x1a2a44;
const TEXT_BRIGHT  = 0xe6e8ef;
const TEXT_DIM     = 0x7a86a3;
const TEXT_LABEL   = 0x4a6080;
const GREEN        = 0x4ade80;
const RED          = 0xf87171;
const YELLOW       = 0xfbbf24;
const BLUE         = 0x60a5fa;
const INDIGO       = 0x818cf8;

const MILESTONE_COLORS = {
  ahead:    GREEN,
  onTrack:  BLUE,
  delayed:  YELLOW,
  critical: RED,
};
const MILESTONE_LABELS = {
  ahead:    'AHEAD',
  onTrack:  'ON TRACK',
  delayed:  'DELAYED',
  critical: 'CRITICAL',
};

const TYPE_COLORS = {
  info:     0x6b7fa3,
  success:  GREEN,
  warning:  YELLOW,
  critical: RED,
};
const TYPE_BG = {
  info:     0x12192d,
  success:  0x0f1f14,
  warning:  0x1f1800,
  critical: 0x1f0000,
};

// ── Text style helpers ────────────────────────────────────────────────────────
function makeText(text, size, color, weight = '400', wrap = 0) {
  return new Text({
    text,
    style: {
      fill:          color,
      fontFamily:    'Inter, system-ui, sans-serif',
      fontSize:      size,
      fontWeight:    weight,
      wordWrap:      wrap > 0,
      wordWrapWidth: wrap,
      lineHeight:    size + 4,
    },
  });
}

function sectionLabel(text, y, container) {
  const t = makeText(text, 9, TEXT_LABEL, '700');
  t.position.set(P, y);
  container.addChild(t);
  return y + 16;
}

function divider(y, container) {
  const g = new Graphics()
    .moveTo(8, y)
    .lineTo(W - 8, y)
    .stroke({ color: DIVIDER_COL, width: 1 });
  container.addChild(g);
  return y + SECTION_GAP;
}

function kvRow(label, value, valueColor, y, container) {
  const lbl = makeText(label, 11, TEXT_DIM);
  lbl.position.set(P, y);
  container.addChild(lbl);

  const val = makeText(value, 11, valueColor, '600');
  val.anchor.set(1, 0);
  val.position.set(W - P, y);
  container.addChild(val);

  return y + 18;
}

// ── Popup class ───────────────────────────────────────────────────────────────
export class DayReportPopup extends Container {
  /**
   * @param {() => void} onClose  Called when the player dismisses the popup.
   */
  constructor(onClose) {
    super();
    this.visible  = false;
    this._onClose = onClose;

    this._backdrop = new Graphics();
    this._backdrop.eventMode = 'static';  // swallows clicks behind

    this._card    = new Container();
    this._winBg   = new Graphics();
    this._content = new Container();
    this._card.addChild(this._winBg);
    this._card.addChild(this._content);

    this.addChild(this._backdrop);
    this.addChild(this._card);

    this._screenW      = 800;
    this._screenH      = 600;
    this._logScrollY   = 0;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  open(snapshot, screenW, screenH) {
    this._snapshot   = snapshot;
    this._screenW    = screenW;
    this._screenH    = screenH;
    this._logScrollY = 0;

    this._drawBackdrop(screenW, screenH);
    this._draw(snapshot);
    this._center(screenW, screenH);
    this.visible = true;
  }

  close() {
    this.visible   = false;
    this._snapshot = null;
  }

  resize(screenW, screenH) {
    if (!this.visible) {
      this._screenW = screenW;
      this._screenH = screenH;
      return;
    }
    this._screenW = screenW;
    this._screenH = screenH;
    this._drawBackdrop(screenW, screenH);
    this._center(screenW, screenH);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _drawBackdrop(w, h) {
    this._backdrop
      .clear()
      .rect(0, 0, w, h)
      .fill({ color: 0x000000, alpha: 0.6 });
  }

  _center(screenW, screenH) {
    this._card.position.set(
      Math.round((screenW - W) / 2),
      Math.round(Math.max(16, (screenH - this._totalH) / 2)),
    );
  }

  _draw(snapshot) {
    this._content.removeChildren();

    const { day, moneyEnd, notifications, company } = snapshot;

    // ── Compute derived data ────────────────────────────────────────────────
    const completedToday = (company.completedProjects ?? []).filter(
      (p) => p.finishedDay === day,
    );
    const failedToday = notifications.filter((n) =>
      n.text.includes('Project lost') || n.text.includes('past critical'),
    );
    const activeProjects = company.activeProjects ?? [];

    // Revenue: sum finalPayout of projects completed today
    const revenueToday = completedToday.reduce((s, p) => s + (p.finalPayout ?? 0), 0);

    // Salaries: parse from the "Salaries paid" notification
    let salariesToday = 0;
    const salaryNotif = notifications.find((n) => n.text.startsWith('Salaries paid:'));
    if (salaryNotif) {
      const m = salaryNotif.text.match(/\$([0-9,]+)/);
      if (m) salariesToday = parseInt(m[1].replace(/,/g, ''), 10);
    }

    const netChange = revenueToday - salariesToday;

    let y = P;

    // ── Header ──────────────────────────────────────────────────────────────
    const title = makeText(`DAY ${day} SUMMARY`, 18, TEXT_BRIGHT, '700');
    title.position.set(P, y);
    this._content.addChild(title);

    const balanceColor = moneyEnd >= 0 ? GREEN : RED;
    const balanceText  = makeText(`$${Math.round(moneyEnd).toLocaleString()}`, 13, balanceColor, '700');
    balanceText.anchor.set(1, 0);
    balanceText.position.set(W - P, y + 3);
    this._content.addChild(balanceText);

    const balLabel = makeText('Balance', 9, TEXT_DIM);
    balLabel.anchor.set(1, 0);
    balLabel.position.set(W - P, y + 20);
    this._content.addChild(balLabel);

    y += 36;
    y = divider(y, this._content);

    // ── Financials ──────────────────────────────────────────────────────────
    y = sectionLabel('FINANCES', y, this._content);

    y = kvRow('Revenue collected', `+$${revenueToday.toLocaleString()}`, revenueToday > 0 ? GREEN : TEXT_DIM, y, this._content);
    y = kvRow('Salaries paid',     `-$${salariesToday.toLocaleString()}`, salariesToday > 0 ? RED : TEXT_DIM, y, this._content);

    const netColor = netChange > 0 ? GREEN : netChange < 0 ? RED : TEXT_DIM;
    const netSign  = netChange >= 0 ? '+' : '';
    y = kvRow('Net change', `${netSign}$${netChange.toLocaleString()}`, netColor, y, this._content);

    y += 4;
    y = divider(y, this._content);

    // ── Projects completed ──────────────────────────────────────────────────
    if (completedToday.length > 0) {
      y = sectionLabel(`PROJECTS COMPLETED  (${completedToday.length})`, y, this._content);

      for (const p of completedToday) {
        const tier       = p.milestoneTier ?? 'onTrack';
        const tierColor  = MILESTONE_COLORS[tier] ?? BLUE;
        const tierLabel  = MILESTONE_LABELS[tier] ?? 'ON TRACK';
        const payout     = (p.finalPayout ?? 0) + (p.insurance ?? 0);

        // Tier badge
        const badge = new Graphics()
          .roundRect(P, y + 4, 58, 16, 3)
          .fill({ color: tierColor, alpha: 0.15 })
          .stroke({ color: tierColor, width: 1 });
        this._content.addChild(badge);

        const badgeText = makeText(tierLabel, 8, tierColor, '700');
        badgeText.anchor.set(0.5, 0.5);
        badgeText.position.set(P + 29, y + 12);
        this._content.addChild(badgeText);

        // Project name
        const nameText = makeText(p.name, 11, TEXT_BRIGHT, '600');
        nameText.position.set(P + 64, y + 4);
        this._content.addChild(nameText);

        // Payout
        const payoutText = makeText(`+$${payout.toLocaleString()}`, 11, GREEN, '600');
        payoutText.anchor.set(1, 0);
        payoutText.position.set(W - P, y + 4);
        this._content.addChild(payoutText);

        y += ROW_H;
      }

      y += 4;
      y = divider(y, this._content);
    }

    // ── Projects failed ─────────────────────────────────────────────────────
    if (failedToday.length > 0) {
      y = sectionLabel(`PROJECTS FAILED  (${failedToday.length})`, y, this._content);

      for (const n of failedToday) {
        const dot = new Graphics()
          .circle(0, 0, 4)
          .fill({ color: RED });
        dot.position.set(P + 4, y + 10);
        this._content.addChild(dot);

        const txt = makeText(n.text, 10, RED, '400', W - P * 2 - 14);
        txt.position.set(P + 14, y + 2);
        this._content.addChild(txt);

        y += Math.max(ROW_H, txt.height + 8);
      }

      y += 4;
      y = divider(y, this._content);
    }

    // ── Active projects ─────────────────────────────────────────────────────
    if (activeProjects.length > 0) {
      y = sectionLabel(`ACTIVE PROJECTS  (${activeProjects.length})`, y, this._content);

      for (const p of activeProjects) {
        const elapsed   = projectElapsedDays(p, day);
        const status    = getActiveMilestoneStatus(p, day);
        const tier      = status?.tier ?? 'onTrack';
        const tierColor = MILESTONE_COLORS[tier] ?? BLUE;
        const tierLabel = MILESTONE_LABELS[tier] ?? 'ON TRACK';

        // Tier badge
        const badge = new Graphics()
          .roundRect(P, y + 4, 58, 16, 3)
          .fill({ color: tierColor, alpha: 0.15 })
          .stroke({ color: tierColor, width: 1 });
        this._content.addChild(badge);

        const badgeText = makeText(tierLabel, 8, tierColor, '700');
        badgeText.anchor.set(0.5, 0.5);
        badgeText.position.set(P + 29, y + 12);
        this._content.addChild(badgeText);

        const nameText = makeText(p.name, 11, TEXT_BRIGHT, '600');
        nameText.position.set(P + 64, y + 4);
        this._content.addChild(nameText);

        const dayText = makeText(`Day ${elapsed}`, 10, TEXT_DIM);
        dayText.anchor.set(1, 0);
        dayText.position.set(W - P, y + 6);
        this._content.addChild(dayText);

        y += ROW_H;
      }

      y += 4;
      y = divider(y, this._content);
    }

    // ── Activity log ────────────────────────────────────────────────────────
    y = sectionLabel(`ACTIVITY LOG  (${notifications.length} entries)`, y, this._content);

    if (notifications.length === 0) {
      const empty = makeText('No activity recorded.', 11, TEXT_DIM);
      empty.position.set(P, y);
      this._content.addChild(empty);
      y += 20;
    } else {
      const LOG_ROW_H  = 34;
      const LOG_ROW_G  = 2;

      // Build all rows into an inner container for masking/scrolling.
      const rows = new Container();
      notifications.forEach((n, i) => {
        const rowY = i * (LOG_ROW_H + LOG_ROW_G);

        const rowBg = new Graphics()
          .rect(0, 0, W - P, LOG_ROW_H)
          .fill({ color: TYPE_BG[n.type] ?? TYPE_BG.info });
        rowBg.y = rowY;
        rows.addChild(rowBg);

        const dot = new Graphics()
          .circle(0, 0, 4)
          .fill({ color: TYPE_COLORS[n.type] ?? TYPE_COLORS.info });
        dot.position.set(10, rowY + LOG_ROW_H / 2);
        rows.addChild(dot);

        const lbl = makeText(n.text, 10, 0xc8d4ed, '400', W - P - 28);
        lbl.position.set(22, rowY + 4);
        rows.addChild(lbl);
      });

      const contentH  = notifications.length * (LOG_ROW_H + LOG_ROW_G);
      const viewportH = Math.min(LOG_MAX_H, contentH);
      const maxScroll = -(contentH - viewportH);

      this._logScrollY = Math.max(maxScroll, Math.min(0, this._logScrollY));
      rows.y = this._logScrollY;

      // Mask in card-local coordinates.
      const mask = new Graphics()
        .rect(P, y, W - P, viewportH)
        .fill({ color: 0xffffff });
      this._content.addChild(mask);

      const viewport = new Container();
      viewport.eventMode = 'static';
      viewport.hitArea   = new Rectangle(0, 0, W - P, viewportH);
      viewport.position.set(P, y);
      viewport.mask      = mask;
      viewport.addChild(rows);

      viewport.on('wheel', (e) => {
        const max = -(contentH - viewportH);
        this._logScrollY = Math.max(max, Math.min(0, this._logScrollY - e.deltaY * 0.5));
        rows.y = this._logScrollY;
      });

      this._content.addChild(viewport);

      y += viewportH + 6;
      y = divider(y, this._content);
    }

    // ── Continue button ──────────────────────────────────────────────────────
    const BTN_H = 36;
    const btnBg = new Graphics()
      .roundRect(P, y, W - P * 2, BTN_H, 6)
      .fill({ color: 0x1a3060 })
      .stroke({ color: INDIGO, width: 1.5 });
    btnBg.eventMode = 'static';
    btnBg.cursor    = 'pointer';
    this._content.addChild(btnBg);

    const btnLabel = makeText('Continue →', 13, 0xc8d4ef, '600');
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(W / 2, y + BTN_H / 2);
    btnLabel.eventMode = 'none';
    this._content.addChild(btnLabel);

    btnBg.on('pointerup',   () => this._onClose());
    btnBg.on('pointerover', () => { btnBg.alpha = 0.8; });
    btnBg.on('pointerout',  () => { btnBg.alpha = 1; });

    y += BTN_H + P;

    // ── Window background ───────────────────────────────────────────────────
    this._totalH = y;
    this._winBg
      .clear()
      .roundRect(0, 0, W, y, 10)
      .fill({ color: BG })
      .stroke({ color: BORDER, width: 1.5 });
  }
}
