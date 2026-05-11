/**
 * Simulation
 *
 * Top-level coordinator for all gameplay systems.
 * Lives on `game.sim` and is ticked every frame by `Game._onTick`.
 *
 * Responsibilities:
 *   - Own the Company state.
 *   - Own and tick all systems (Time, Project, Economy, Hiring, Notification).
 *   - Provide reset() for "New Game".
 *   - Expose project management actions (acceptProject, rejectProject).
 */
import { createCompany } from '../state/Company.js';
import { createProject } from '../state/Project.js';
import { PROJECT_TEMPLATES } from '../data/projectTemplates.js';
import { GameConfig } from '../config.js';

import { TimeSystem } from './TimeSystem.js';
import { ProjectSystem } from './ProjectSystem.js';
import { EconomySystem } from './EconomySystem.js';
import { HiringSystem } from './HiringSystem.js';
import { NotificationSystem } from './NotificationSystem.js';

export class Simulation {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;

    this.time = new TimeSystem(bus);
    this.projects = new ProjectSystem(bus);
    this.economy = new EconomySystem(bus);
    this.hiring = new HiringSystem(bus);
    this.notifications = new NotificationSystem(bus);

    /** @type {import('../state/Company.js').Company} */
    this.company = null;

    this._endDayOff = null;
  }

  /** Called once during Game.init() and again on New Game. */
  reset() {
    // Tear down old listeners.
    if (this._endDayOff) this._endDayOff();
    this.notifications.destroy();

    this.company = createCompany();

    // Re-initialise systems.
    this.time = new TimeSystem(this.bus);
    this.notifications = new NotificationSystem(this.bus);
    this.notifications.init();

    // Wire end-of-day: economy runs first, then hiring refreshes candidates
    // and project pool, then time advances the day counter.
    this._endDayOff = this.bus.on('day:ended', ({ company }) => {
      this.economy.runEndOfDay(company);
      this._refreshProjectPool(company);
      this.hiring.refreshCandidates(company);
      this.time.beginNextDay(company);
    });

    this.bus.emit('simulation:reset', { company: this.company });
  }

  /** @param {number} dt  Real seconds (already time-scaled by Game). */
  update(dt) {
    if (!this.company) return;
    const speed = this.time.gameSpeed;
    this.projects.update(dt, speed, this.company);
    this.time.update(dt, this.company);
  }

  // -----------------------------------------------------------------------
  // Player actions
  // -----------------------------------------------------------------------

  /** Accept an available project (move it to active). */
  acceptProject(project) {
    const { company } = this;
    if (company.activeProjects.length >= company.maxActiveProjects) return false;

    const idx = company.availableProjects.indexOf(project);
    if (idx === -1) return false;

    project.isActive = true;
    company.availableProjects.splice(idx, 1);
    company.activeProjects.push(project);

    this.bus.emit('notification:add', {
      text: `Accepted: ${project.name} ($${project.payout.toLocaleString()})`,
      type: 'info',
    });
    this.bus.emit('project:accepted', { project, company });
    return true;
  }

  /** Reject / dismiss an available project. */
  rejectProject(project) {
    const { company } = this;
    const idx = company.availableProjects.indexOf(project);
    if (idx === -1) return;
    company.availableProjects.splice(idx, 1);
    this.bus.emit('project:rejected', { project, company });
  }

  /** Proxy for hiring a candidate via the HiringSystem. */
  hireCandidate(candidate) {
    return this.hiring.hire(this.company, candidate);
  }

  /** Proxy for firing an employee via the HiringSystem. */
  fireEmployee(employee) {
    this.hiring.fire(this.company, employee);
  }

  /** Fast-forward to end of day. */
  endDay() {
    this.time.fastForward(this.company);
  }

  /** Set game speed (0 = pause, 1/4/16 = multipliers). */
  setSpeed(speed) {
    const valid = GameConfig.gameplay.SPEED_PRESETS;
    if (!valid.includes(speed)) return;
    this.time.gameSpeed = speed;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  _refreshProjectPool(company) {
    const { AVAILABLE_PROJECT_POOL_SIZE } = GameConfig.gameplay;

    // Clear leftover available projects so each new day brings a fresh set.
    company.availableProjects = [];

    // Determine appropriate tier based on office tier index.
    const tierMap = [1, 1, 2, 3, 4];
    const maxTier = tierMap[Math.min(company.office.tierIndex, tierMap.length - 1)];

    const eligible = PROJECT_TEMPLATES.filter(
      (t) =>
        t.tier <= maxTier &&
        !company.activeProjects.some((p) => p.templateId === t.id) &&
        !company.completedProjects.some((p) => p.templateId === t.id),
    );

    // Shuffle and pick a full pool's worth of projects.
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(AVAILABLE_PROJECT_POOL_SIZE, shuffled.length); i++) {
      company.availableProjects.push(createProject(shuffled[i]));
    }
  }
}
