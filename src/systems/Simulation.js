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
import { isPastCritical } from '../state/Project.js';
import { RESEARCH_NODES } from '../data/researchNodes.js';
import { SKILL_LABELS, MAX_SKILL_LEVEL } from '../data/skills.js';
import { GameConfig } from '../config.js';
import { generatePool } from './ProjectGenerator.js';
import { computeTeamOutput } from '../economy/balance.js';

import { TimeSystem } from './TimeSystem.js';
import { ProjectSystem } from './ProjectSystem.js';
import { EconomySystem } from './EconomySystem.js';
import { HiringSystem } from './HiringSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { ProductivitySystem } from './ProductivitySystem.js';

export class Simulation {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;

    this.time = new TimeSystem(bus);
    this.projects = new ProjectSystem(bus);
    this.economy = new EconomySystem(bus);
    this.hiring = new HiringSystem(bus);
    this.notifications = new NotificationSystem(bus);
    this.productivity = new ProductivitySystem();

    /** @type {import('../state/Company.js').Company} */
    this.company = null;

    this._endDayOff   = null;
    this._beginDayOff = null;
  }

  /** Called once during Game.init() and again on New Game. */
  reset() {
    // Tear down old listeners.
    if (this._endDayOff)   this._endDayOff();
    if (this._beginDayOff) this._beginDayOff();
    this.notifications.destroy();

    this.company = createCompany();
    this.productivity.rollDailyWeather(this.company);

    // Re-initialise systems.
    this.time = new TimeSystem(this.bus);
    this.notifications = new NotificationSystem(this.bus);
    this.notifications.init();

    // Wire end-of-day: roll weather first so the new day starts with fresh
    // conditions, then economy, project pool refresh, hiring, and clock advance.
    this._endDayOff = this.bus.on('day:ended', ({ company }) => {
      this.productivity.rollDailyWeather(company);
      this.economy.runEndOfDay(company);
      this._checkProjectDeadlines(company);
      this._refreshProjectPool(company);
      this.hiring.refreshCandidates(company);

      // Snapshot notifications before they are cleared by day:began.
      this.bus.emit('day:report', {
        day:           company.day,
        moneyEnd:      company.money,
        notifications: [...this.notifications.notifications],
        company,
      });

      this.time.beginNextDay(company);
    });

    this._beginDayOff = this.bus.on('day:began', () => {
      this.notifications.clear();
    });

    this.bus.emit('simulation:reset', { company: this.company });
  }

  /** @param {number} dt  Real seconds (already time-scaled by Game). */
  update(dt) {
    if (!this.company) return;
    const speed = this.time.gameSpeed;
    this.projects.update(dt, speed, this.company, this.productivity);
    this.time.update(dt, this.company);
  }

  // -----------------------------------------------------------------------
  // Player actions
  // -----------------------------------------------------------------------

  /** Accept an available project (move it to active). Deducts insurance upfront. */
  acceptProject(project) {
    const { company } = this;
    if (company.activeProjects.length >= company.maxActiveProjects) return false;

    const idx = company.availableProjects.indexOf(project);
    if (idx === -1) return false;

    if (company.money < project.insurance) {
      this.bus.emit('notification:add', {
        text: `Can't accept ${project.name} — need $${project.insurance.toLocaleString()} insurance.`,
        type: 'warning',
      });
      return false;
    }

    company.money -= project.insurance;
    project.startedDay = company.day;
    project.isActive = true;
    company.availableProjects.splice(idx, 1);
    company.activeProjects.push(project);

    this.bus.emit('notification:add', {
      text: `Accepted: ${project.name} (insured $${project.insurance.toLocaleString()}, base $${project.basePayout.toLocaleString()})`,
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

  /** Collect the payout for a finished project and move it to completed. */
  finishProject(project) {
    const { company } = this;
    project.isReadyToFinish = false;
    project.isCompleted = true;

    const payout = project.finalPayout ?? 0;
    const refund = project.insurance;
    company.money += payout + refund;
    company.stats.totalRevenue += payout;
    company.stats.projectsCompleted += 1;

    company.activeProjects = company.activeProjects.filter((p) => p.id !== project.id);
    company.completedProjects.push(project);

    // Release all employees that were pinned to this project.
    for (const emp of company.employees) {
      if (emp.pinnedProjectId === project.id) {
        emp.pinnedProjectId = null;
        emp.activeProjectId = null;
      }
    }

    const tierNames = { ahead: 'Ahead of Schedule', onTrack: 'On Track', delayed: 'Delayed', critical: 'Critical Deadline' };
    const tierLabel = tierNames[project.milestoneTier] ?? '';
    this.bus.emit('notification:add', {
      text: `Collected $${payout.toLocaleString()} + $${refund.toLocaleString()} refund for ${project.name}! (${tierLabel})`,
      type: 'success',
    });
    this.bus.emit('project:completed', { project, company });
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

  /** Purchase one additional desk slot for a flat fee. */
  buyDesk() {
    const PRICE = 1000;
    if (!this.company) return;
    if (this.company.money < PRICE) {
      this.bus.emit('notification:add', { text: 'Not enough money for a new desk.', type: 'warning' });
      return;
    }
    this.company.money -= PRICE;
    this.company.office.desks += 1;
    this.bus.emit('notification:add', { text: 'New desk added! (+1 slot)', type: 'success' });
    this.bus.emit('desk:bought', { company: this.company });
  }

  /**
   * Attempt to unlock a research node.
   * Fails silently if deps not met, already unlocked, or insufficient R&D points.
   * @param {string} nodeId
   * @returns {boolean} true if the node was successfully unlocked
   */
  unlockResearch(nodeId) {
    const node = RESEARCH_NODES.find((n) => n.id === nodeId);
    if (!node) return false;
    const { company } = this;
    const allUnlocked = new Set(company.unlockedResearch);
    if (allUnlocked.has(nodeId)) return false;
    if (!node.dependencies.every((d) => allUnlocked.has(d))) return false;
    if (company.rdPoints < node.cost) return false;
    company.rdPoints -= node.cost;
    company.unlockedResearch.push(nodeId);
    this.bus.emit('notification:add', {
      text: `Research unlocked: ${node.name}`,
      type: 'success',
    });
    this.bus.emit('research:unlocked', { nodeId, company });
    return true;
  }

  /**
   * Manually pin an employee to a specific active project.
   * @param {import('../state/Employee.js').Employee} employee
   * @param {number} projectId
   */
  assignEmployee(employee, projectId) {
    if (!this.company) return;
    employee.pinnedProjectId = projectId;
  }

  /**
   * Remove the manual pin from an employee, returning them to auto-assignment.
   * @param {import('../state/Employee.js').Employee} employee
   */
  unassignEmployee(employee) {
    if (!this.company) return;
    employee.pinnedProjectId = null;
    employee.activeProjectId = null;
  }

  /**
   * Spend one pending skill point to improve an existing skill by 1 level.
   * Only skills the employee already has (level ≥ 1) can be upgraded.
   * @param {import('../state/Employee.js').Employee} employee
   * @param {string} skillKey
   * @returns {boolean} true if the upgrade was applied
   */
  upgradeEmployeeSkill(employee, skillKey) {
    if (!employee || employee.pendingSkillPoints <= 0) return false;
    const skill = employee.skills.find((s) => s.skill === skillKey && s.level >= 1);
    if (!skill || skill.level >= MAX_SKILL_LEVEL) return false;
    skill.level += 1;
    employee.pendingSkillPoints -= 1;
    this.bus.emit('notification:add', {
      text: `${employee.name} upgraded ${SKILL_LABELS[skillKey] ?? skillKey} to Lv.${skill.level}!`,
      type: 'success',
    });
    return true;
  }

  /**
   * Update the company's work schedule.
   * @param {number} startHour  Hour the work day starts (6–16).
   * @param {number} workHours  Duration: 8 | 10 | 12 | 14.
   */
  setSchedule(startHour, workHours) {
    if (!this.company) return;
    this.company.schedule.startHour = Math.max(6, Math.min(24 - workHours, startHour));
    this.company.schedule.workHours = workHours;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /**
   * Auto-fail any active project that has exceeded its critical deadline.
   * Called after end-of-day economy runs but before the new project pool is offered.
   */
  _checkProjectDeadlines(company) {
    const toFail = company.activeProjects.filter(
      (p) => !p.isReadyToFinish && !p.isFailed && isPastCritical(p, company.day),
    );

    for (const project of toFail) {
      project.isFailed = true;
      company.activeProjects = company.activeProjects.filter((p) => p.id !== project.id);
      company.completedProjects.push(project);

      for (const emp of company.employees) {
        if (emp.pinnedProjectId === project.id) {
          emp.pinnedProjectId = null;
          emp.activeProjectId = null;
        }
      }

      this.bus.emit('notification:add', {
        text: `Project lost: ${project.name} — past critical deadline. Insurance forfeited.`,
        type: 'critical',
      });
      this.bus.emit('project:failed', { project, company });
    }
  }

  _refreshProjectPool(company) {
    const { AVAILABLE_PROJECT_POOL_SIZE } = GameConfig.gameplay;
    const tierMap = [1, 1, 2, 3, 4];
    const maxTier = tierMap[Math.min(company.office.tierIndex, tierMap.length - 1)];
    const teamOutput = computeTeamOutput(company.employees);

    company.availableProjects = generatePool({
      maxTier,
      unlockedResearch: company.unlockedResearch,
      activeTemplateIds: company.activeProjects.map((p) => p.templateId),
      count: AVAILABLE_PROJECT_POOL_SIZE,
      teamOutput,
    });
  }
}
