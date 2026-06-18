/**
 * EconomySystem
 *
 * Runs once per day boundary (on `day:ended`).
 *   - Deducts employee salaries.
 *   - Adds pending project payouts.
 *   - Emits financial notifications.
 *   - Tracks consecutive negative-cash EODs (daysInDeficit).
 *   - Emits `economy:gameover` and returns { gameOver: true } after
 *     NEGATIVE_CASH_GRACE_DAYS consecutive negative-cash end-of-days.
 *
 * Also moves completed projects out of activeProjects.
 */
import { GameConfig } from '../config.js';
import { getNegativeCashGraceDays } from '../data/lifeResearch.js';
import { dailySalaryCost } from '../state/Company.js';

export class EconomySystem {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
  }

  /**
   * @param {import('../state/Company.js').Company} company
   * @returns {{ gameOver: boolean, daysInDeficit: number, graceDays: number }}
   */
  runEndOfDay(company) {
    const { MONEY_WARNING_THRESHOLD } = GameConfig.gameplay;
    const NEGATIVE_CASH_GRACE_DAYS = getNegativeCashGraceDays(company.unlockedResearch);

    const salaries = dailySalaryCost(company);
    company.money -= salaries;
    company.stats.totalSalariesPaid += salaries;

    if (salaries > 0) {
      this.bus.emit('notification:add', {
        text: `Salaries paid: -$${salaries.toLocaleString()}`,
        type: 'info',
      });
    }

    // Award payouts banked from completed projects.
    if (company.pendingPayout > 0) {
      company.money += company.pendingPayout;
      company.stats.totalRevenue += company.pendingPayout;
      company.pendingPayout = 0;
    }

    // Generate R&D points.
    if (company.rdPointsPerDay > 0) {
      company.rdPoints += company.rdPointsPerDay;
    }

    // Move completed projects out of active list.
    const justCompleted = company.activeProjects.filter((p) => p.isCompleted);
    for (const p of justCompleted) {
      company.completedProjects.push(p);
    }
    company.activeProjects = company.activeProjects.filter((p) => !p.isCompleted);

    // ── Deficit streak tracking ──────────────────────────────────────────────
    if (company.money < 0) {
      company.daysInDeficit = (company.daysInDeficit ?? 0) + 1;
    } else {
      company.daysInDeficit = 0;
    }

    const gameOver = company.daysInDeficit >= NEGATIVE_CASH_GRACE_DAYS;

    // Financial warnings (low funds, deficit streak, game over).
    if (company.money >= 0 && company.money < MONEY_WARNING_THRESHOLD) {
      this.bus.emit('notification:add', {
        text: `⚠ Low funds! $${Math.round(company.money).toLocaleString()} remaining.`,
        type: 'warning',
      });
    } else if (gameOver) {
      this.bus.emit('notification:add', {
        text: `Insolvency — the company has shut down after ${NEGATIVE_CASH_GRACE_DAYS} days in the red.`,
        type: 'critical',
      });
      this.bus.emit('economy:gameover', { company });
    } else if (company.money < 0) {
      this.bus.emit('notification:add', {
        text: `Operating at a loss — Day ${company.daysInDeficit} of ${NEGATIVE_CASH_GRACE_DAYS} before insolvency.`,
        type: 'critical',
      });
    }

    return { gameOver, daysInDeficit: company.daysInDeficit, graceDays: NEGATIVE_CASH_GRACE_DAYS };
  }
}
