/**
 * ProjectSystem
 *
 * Each frame (when the day is running) distributes employee contribution
 * points to active project requirements.
 *
 * Assignment algorithm (simple greedy):
 *   1. For each employee find all active projects that have open requirements
 *      matching the employee's skills.
 *   2. Pick the project with the most remaining work that the employee can
 *      contribute to (keeps employees focused on different projects).
 *   3. Each matching skill contributes independently based on SKILL_SP_TABLE.
 *
 * Per-frame budget (per skill):
 *   spPerPeriod     = SKILL_SP_TABLE[skill.level]
 *   workPeriodSec   = DAY_DURATION_SECONDS * 15 / (workHours * 60)
 *   contribution    = spPerPeriod * (dt * speed / workPeriodSec)
 *
 * Points are buffered during the WORK period and flushed to the project
 * when the period ends (see flushWorkPeriod).
 */
import { GameConfig } from '../config.js';
import { matchingSkills } from '../state/Employee.js';
import { isProjectComplete } from '../state/Project.js';

export class ProjectSystem {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
  }

  /**
   * @param {number} dt       Real seconds.
   * @param {number} speed    Current game speed multiplier.
   * @param {import('../state/Company.js').Company} company
   */
  update(dt, speed, company) {
    if (speed === 0 || company.activeProjects.length === 0) return;

    const { SKILL_SP_TABLE, DAY_DURATION_SECONDS } = GameConfig.gameplay;
    const workPeriodSec = DAY_DURATION_SECONDS * 15 / (company.schedule.workHours * 60);
    const workPeriodFraction = (dt * speed) / workPeriodSec;

    for (const employee of company.employees) {
      // Only WORK state employees contribute to projects.
      if (employee.scheduleState !== 'WORK') {
        employee.activeProjectId = null;
        continue;
      }

      // Find projects that this employee can contribute to.
      const eligible = company.activeProjects.filter(
        (p) => !p.isCompleted && !p.isReadyToFinish && matchingSkills(employee, p).length > 0,
      );

      if (eligible.length === 0) {
        employee.activeProjectId = null;
        continue;
      }

      // Pick the project with the most remaining work (descending).
      eligible.sort((a, b) => this._remainingWork(b) - this._remainingWork(a));
      const project = eligible[0];
      employee.activeProjectId = project.id;

      const matched = matchingSkills(employee, project);

      for (const sk of matched) {
        const req = project.requirements.find(
          (r) => r.skill === sk.skill && r.current < r.points,
        );
        if (!req) continue;

        const contribution = SKILL_SP_TABLE[sk.level] * workPeriodFraction;

        // Buffer the contribution instead of writing directly to the project.
        const buf = employee.workBuffer;
        if (!buf[project.id]) buf[project.id] = {};
        buf[project.id][sk.skill] = (buf[project.id][sk.skill] ?? 0) + contribution;
        employee.workPeriodTotal += contribution;
      }
    }

    // Clear activeProjectId for employees on completed/ready projects.
    for (const emp of company.employees) {
      if (emp.activeProjectId !== null) {
        const proj = company.activeProjects.find((p) => p.id === emp.activeProjectId);
        if (!proj || proj.isCompleted || proj.isReadyToFinish) emp.activeProjectId = null;
      }
    }
  }

  /**
   * Flush all buffered work points to their projects and check for completions.
   * Call this whenever the WORK schedule period ends.
   *
   * @param {import('../state/Company.js').Company} company
   * @returns {Map<number, number>} Map of employee index → total points flushed
   */
  flushWorkPeriod(company) {
    /** @type {Map<number, number>} */
    const totals = new Map();

    company.employees.forEach((employee, idx) => {
      const total = employee.workPeriodTotal;
      totals.set(idx, total);

      for (const [projectId, skillMap] of Object.entries(employee.workBuffer)) {
        const project = company.activeProjects.find((p) => p.id === Number(projectId));
        if (!project || project.isCompleted || project.isReadyToFinish) continue;

        for (const [skill, points] of Object.entries(skillMap)) {
          const req = project.requirements.find((r) => r.skill === skill);
          if (!req) continue;
          req.current = Math.min(req.points, req.current + points);
        }

        // Check completion after applying buffered points.
        if (!project.isReadyToFinish && !project.isCompleted && isProjectComplete(project)) {
          project.isReadyToFinish = true;
          this.bus.emit('project:completed', { project, company });
          this.bus.emit('notification:add', {
            text: `${project.name} is ready — collect $${project.payout.toLocaleString()}`,
            type: 'success',
          });
        }
      }

      // Reset buffers for next WORK period.
      employee.workBuffer = {};
      employee.workPeriodTotal = 0;
    });

    return totals;
  }

  _remainingWork(project) {
    return project.requirements.reduce((s, r) => s + Math.max(0, r.points - r.current), 0);
  }
}
