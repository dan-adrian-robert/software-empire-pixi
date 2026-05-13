/**
 * EconomySystem
 *
 * Runs once per day boundary (on `day:ended`).
 *   - Deducts employee salaries.
 *   - Adds pending project payouts.
 *   - Emits financial notifications.
 *   - Emits `economy:bankrupt` if money <= BANKRUPTCY_THRESHOLD.
 *
 * Also moves completed projects out of activeProjects.
 */
import { GameConfig } from '../config.js';
import { dailySalaryCost } from '../state/Company.js';

export class EconomySystem {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
  }

  /**
   * @param {import('../state/Company.js').Company} company
   */
  runEndOfDay(company) {
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

    // Financial warnings.
    if (company.money < GameConfig.gameplay.MONEY_WARNING_THRESHOLD && company.money > GameConfig.gameplay.BANKRUPTCY_THRESHOLD) {
      this.bus.emit('notification:add', {
        text: `⚠ Low funds! $${Math.round(company.money).toLocaleString()} remaining.`,
        type: 'warning',
      });
    }

    if (company.money <= GameConfig.gameplay.BANKRUPTCY_THRESHOLD) {
      this.bus.emit('economy:bankrupt', { company });
      this.bus.emit('notification:add', {
        text: '💀 Bankruptcy! The company has run out of money.',
        type: 'critical',
      });
    }
  }
}
