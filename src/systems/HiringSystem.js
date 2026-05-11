/**
 * HiringSystem
 *
 * Manages the candidate pool:
 *   - Refreshes candidates at the start of each new day.
 *   - Provides hire() / fire() actions that mutate Company state.
 *
 * Candidate quality scales with the company's current tier
 * (approximated by office tier index).
 */
import { GameConfig } from '../config.js';
import { generateRandomCandidate } from '../state/Candidate.js';
import { createEmployee } from '../state/Employee.js';
import { freeDesks } from '../state/Company.js';

export class HiringSystem {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
  }

  /**
   * Replace the candidate pool for the new day.
   * @param {import('../state/Company.js').Company} company
   */
  refreshCandidates(company) {
    const tier = company.office.tierIndex + 1; // 1-based tier
    const count = GameConfig.gameplay.CANDIDATE_POOL_SIZE;
    company.candidates = Array.from({ length: count }, () =>
      generateRandomCandidate(tier),
    );
  }

  /**
   * Hire a candidate if desk space is available.
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Candidate.js').Candidate} candidate
   * @returns {{ ok: boolean, reason?: string }}
   */
  hire(company, candidate) {
    if (freeDesks(company) <= 0) {
      return { ok: false, reason: 'No desk space available. Upgrade your office first.' };
    }

    const employee = createEmployee({
      name: candidate.name,
      skills: candidate.skills,
      salary: candidate.salary,
    });
    company.employees.push(employee);

    // Remove from candidate pool.
    company.candidates = company.candidates.filter((c) => c.id !== candidate.id);

    this.bus.emit('employee:hired', { employee, company });
    this.bus.emit('notification:add', {
      text: `${employee.name} joined the team. Salary: $${employee.salary}/day`,
      type: 'success',
    });

    return { ok: true };
  }

  /**
   * Fire an employee.
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Employee.js').Employee} employee
   */
  fire(company, employee) {
    company.employees = company.employees.filter((e) => e.id !== employee.id);

    // Remove from any active project.
    for (const project of company.activeProjects) {
      // project doesn't track assigned employees directly; employee.activeProjectId clears itself.
    }

    this.bus.emit('employee:fired', { employee, company });
    this.bus.emit('notification:add', {
      text: `${employee.name} left the company.`,
      type: 'info',
    });
  }
}
