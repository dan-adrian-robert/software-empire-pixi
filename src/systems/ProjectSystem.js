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
 *   3. Distribute the employee's per-frame points proportionally across their
 *      matching skills in that project.
 *
 * Per-frame budget:
 *   pointsPerDay    = sum(skillLevel) * POINTS_PER_LEVEL
 *   pointsThisFrame = pointsPerDay * (dt * speed / DAY_DURATION_SECONDS)
 *
 * The work schedule (startHour / workHours) is a cosmetic setting that only
 * affects the in-game clock display.  It does NOT change points output per day.
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

    const { POINTS_PER_LEVEL, DAY_DURATION_SECONDS } = GameConfig.gameplay;
    const frameFraction = (dt * speed) / DAY_DURATION_SECONDS;

    for (const employee of company.employees) {
      // Find projects that this employee can contribute to.
      const eligible = company.activeProjects.filter(
        (p) => !p.isCompleted && matchingSkills(employee, p).length > 0,
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
      const totalMatchedLevels = matched.reduce((s, sk) => s + sk.level, 0);

      for (const sk of matched) {
        const req = project.requirements.find(
          (r) => r.skill === sk.skill && r.current < r.points,
        );
        if (!req) continue;

        const pointsPerDay = totalMatchedLevels * POINTS_PER_LEVEL;
        const contribution = pointsPerDay * frameFraction * (sk.level / totalMatchedLevels);
        req.current = Math.min(req.points, req.current + contribution);
      }

      // Check completion after applying points.
      if (!project.isCompleted && isProjectComplete(project)) {
        project.isCompleted = true;
        company.pendingPayout += project.payout;
        company.stats.projectsCompleted += 1;
        this.bus.emit('project:completed', { project, company });
        this.bus.emit('notification:add', {
          text: `✓ ${project.name} completed! +$${project.payout.toLocaleString()}`,
          type: 'success',
        });
      }
    }

    // Clear activeProjectId for employees on completed projects.
    for (const emp of company.employees) {
      if (emp.activeProjectId !== null) {
        const proj = company.activeProjects.find((p) => p.id === emp.activeProjectId);
        if (!proj || proj.isCompleted) emp.activeProjectId = null;
      }
    }
  }

  _remainingWork(project) {
    return project.requirements.reduce((s, r) => s + Math.max(0, r.points - r.current), 0);
  }
}
