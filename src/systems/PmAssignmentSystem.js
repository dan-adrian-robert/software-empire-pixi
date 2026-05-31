/**
 * PmAssignmentSystem
 *
 * Runs after each WORK schedule period ends. For each Project Manager employed,
 * it greedily assigns unassigned programmers to active projects that still have
 * open skill requirements.
 *
 * Rules:
 *   - Only programmers with pinnedProjectId === null are eligible.
 *   - Only active projects that are not completed / ready / failed are considered.
 *   - Projects are processed in acceptance order (by id).
 *   - One developer is assigned per eligible project per period.
 *   - Manual assignments made by the player are never overridden.
 *
 * Activity log:
 *   - Each individual assignment is logged: "[PM]: Assigned [Dev] → [Project]"
 *   - If a PM finds nothing to do, that is also logged.
 */
import { isProgrammer, isProjectManager, matchingSkills } from '../state/Employee.js';

export class PmAssignmentSystem {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
  }

  /**
   * Auto-assign unassigned programmers to projects with open requirements.
   * Called from OfficeScene right after ProjectSystem.flushWorkPeriod.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {import('./Simulation.js').Simulation} sim
   */
  runAfterWorkPeriod(company, sim) {
    const managers = company.employees.filter(isProjectManager);
    if (managers.length === 0) return;

    const eligibleProjects = company.activeProjects
      .filter((p) => !p.isCompleted && !p.isReadyToFinish && !p.isFailed)
      .filter((p) => p.requirements.some((r) => r.current < r.points))
      .sort((a, b) => a.id - b.id);

    // Shared mutable pool across all PMs — a dev assigned by one PM isn't re-assigned.
    const available = company.employees.filter(
      (e) => isProgrammer(e) && e.pinnedProjectId === null,
    );

    for (const pm of managers) {
      this._runForPm(pm, eligibleProjects, available, sim);
    }
  }

  /**
   * @param {object} pm
   * @param {object[]} eligibleProjects
   * @param {object[]} available  Mutable pool shared across PMs.
   * @param {import('./Simulation.js').Simulation} sim
   */
  _runForPm(pm, eligibleProjects, available, sim) {
    if (eligibleProjects.length === 0) {
      this.bus.emit('notification:add', {
        text: `${pm.name}: No active projects to manage.`,
        type: 'info',
        silent: !pm.logsMuted,   // list-only when not muted
        suppress: pm.logsMuted,  // fully hidden when muted
      });
      return;
    }

    if (available.length === 0) {
      this.bus.emit('notification:add', {
        text: `${pm.name}: No unassigned developers available.`,
        type: 'info',
        silent: !pm.logsMuted,
        suppress: pm.logsMuted,
      });
      return;
    }

    let madeAssignment = false;

    for (const project of eligibleProjects) {
      if (available.length === 0) break;

      for (let i = available.length - 1; i >= 0; i--) {
        const dev = available[i];
        if (matchingSkills(dev, project).length > 0) {
          sim.assignEmployee(dev, project.id);
          available.splice(i, 1);
          madeAssignment = true;

          this.bus.emit('notification:add', {
            text: `${pm.name}: Assigned ${dev.name} → ${project.name}`,
            type: 'success',
            suppress: pm.logsMuted,
          });
          // One dev per project per PM per period.
          break;
        }
      }
    }

    if (!madeAssignment) {
      this.bus.emit('notification:add', {
        text: `${pm.name}: No matching developers to assign.`,
        type: 'info',
        silent: !pm.logsMuted,
        suppress: pm.logsMuted,
      });
    }
  }
}
