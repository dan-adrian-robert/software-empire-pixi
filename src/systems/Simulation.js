/**
 * Simulation
 *
 * Top-level coordinator for all gameplay systems.
 * Lives on `game.sim` and is ticked every frame by `Game._onTick`.
 *
 * Responsibilities:
 *   - Own the Company state.
 *   - Own and tick all systems (Time, Project, Economy, Hiring, Notification).
 *   - Provide reset() for "New Game" and loadFromSave() for loading a checkpoint.
 *   - Expose project management actions (acceptProject, rejectProject).
 */
import { createCompany, resetDailySpProductivity } from '../state/Company.js';
import { STAFF_ROLES } from '../data/staffRoles.js';
import { generateCommunicationProfile } from './CommunicationGenerator.js';
import { createFurnitureItem } from '../state/FurnitureItem.js';
import { isPastCritical } from '../state/Project.js';
import { syncIdCounters } from '../state/syncIdCounters.js';
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
import { PmAssignmentSystem } from './PmAssignmentSystem.js';
import { TeamSystem } from './TeamSystem.js';

export class Simulation {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;

    this.teamSystem = new TeamSystem();
    this.time = new TimeSystem(bus);
    this.projects = new ProjectSystem(bus);
    this.economy = new EconomySystem(bus);
    this.hiring = new HiringSystem(bus, this.teamSystem);
    this.notifications = new NotificationSystem(bus);
    this.productivity = new ProductivitySystem();
    this.pmAssignment = new PmAssignmentSystem(bus);

    /** @type {import('../state/Company.js').Company} */
    this.company = null;

    this._endDayOff   = null;
    this._beginDayOff = null;
  }

  /** Called once during Game.init() and again on New Game. */
  reset() {
    this._tearDown();

    this.company = createCompany();
    this.productivity.rollDailyWeather(this.company);

    this.time = new TimeSystem(this.bus);
    this.notifications = new NotificationSystem(this.bus);
    this.notifications.init();
    this._wireDayCycle();

    this.bus.emit('simulation:reset', { company: this.company });
  }

  /**
   * Load a previously saved day-start checkpoint.
   * The company state is replaced with the saved copy; TimeSystem is reset to
   * a paused day-start position. OfficeScene rebuilds via `simulation:reset`.
   * @param {object} payload  Validated payload from SaveManager.loadSlot().
   */
  loadFromSave(payload) {
    this._tearDown();

    this.company = payload.company;
    this._patchSaveCompat(this.company);
    syncIdCounters(payload.nextIds);

    this.time = new TimeSystem(this.bus);
    // Force a clean, paused day-start position.
    this.time.dayProgress = 0;
    this.time.gameSpeed   = 0;
    this.time._dayEnding  = false;

    this.notifications = new NotificationSystem(this.bus);
    this.notifications.init();
    this._wireDayCycle();

    this.bus.emit('simulation:reset', { company: this.company });
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Tear down bus listeners and notification system before re-init. */
  _tearDown() {
    if (this._endDayOff)   this._endDayOff();
    if (this._beginDayOff) this._beginDayOff();
    this._endDayOff   = null;
    this._beginDayOff = null;
    this.notifications.destroy();
  }

  /**
   * Wire the day:ended / day:began cycle.
   * Called after both reset() and loadFromSave() have set up a fresh
   * TimeSystem, NotificationSystem, and company reference.
   */
  _wireDayCycle() {
    // Wire end-of-day: roll weather first so the new day starts with fresh
    // conditions, then economy, project pool refresh, hiring, and clock advance.
    this._endDayOff = this.bus.on('day:ended', ({ company }) => {
      this.productivity.rollDailyWeather(company);
      this.economy.runEndOfDay(company);
      this._checkProjectDeadlines(company);
      this._refreshProjectPool(company);
      this.hiring.refreshCandidates(company);
      this.hiring.refreshOtherCandidates(company);

      // Snapshot notifications and SP productivity before they are cleared by day:began.
      this.bus.emit('day:report', {
        day:              company.day,
        moneyEnd:         company.money,
        notifications:    [...this.notifications.notifications],
        spProductivity:   {
          ...company.dailySpProductivity,
          periods: [...company.dailySpProductivity.periods],
        },
        company,
      });

      this.time.beginNextDay(company);
    });

    this._beginDayOff = this.bus.on('day:began', () => {
      this.notifications.clear();
      resetDailySpProductivity(this.company);
    });
  }

  /**
   * Backfill fields that are missing from saves created before a given feature
   * was added. Keeps old save files loadable without resetting.
   * @param {import('../state/Company.js').Company} company
   */
  _patchSaveCompat(company) {
    // role and logsMuted fields added with Project Manager / mute feature
    for (const emp of company.employees) {
      if (!emp.role) emp.role = STAFF_ROLES.PROGRAMMER;
      if (emp.logsMuted === undefined) emp.logsMuted = false;
      // archetypes added with Archetype System feature
      if (!emp.archetypes) emp.archetypes = {};
      // communication added with Communication Tab feature
      if (!emp.communication || Object.keys(emp.communication).length === 0) {
        emp.communication = generateCommunicationProfile();
      }
    }
    for (const cand of company.candidates ?? []) {
      if (!cand.role) cand.role = STAFF_ROLES.PROGRAMMER;
      if (cand.level === undefined) cand.level = null;
      if (!cand.archetypes) cand.archetypes = {};
      if (!cand.communication || Object.keys(cand.communication).length === 0) {
        cand.communication = generateCommunicationProfile();
      }
    }
    for (const cand of company.otherCandidates ?? []) {
      if (!cand.archetypes) cand.archetypes = {};
      if (!cand.communication || Object.keys(cand.communication).length === 0) {
        cand.communication = generateCommunicationProfile();
      }
    }
    if (!Array.isArray(company.otherCandidates)) {
      company.otherCandidates = [];
    }
    // teams array added with Team Lead feature
    if (!Array.isArray(company.teams)) {
      company.teams = [];
    }
    // Ensure any existing team_lead employees without a team get one.
    for (const emp of company.employees) {
      if (emp.role === STAFF_ROLES.TEAM_LEAD) {
        const hasTeam = company.teams.some((t) => t.leadId === emp.id);
        if (!hasTeam) this.teamSystem.createTeamForLead(company, emp);
      }
    }
    // Enforce locked schedule for saves that predate work_schedule research.
    if (!company.unlockedResearch.includes(GameConfig.schedule.researchNodeId)) {
      company.schedule = { ...GameConfig.schedule.locked };
    }
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

  /**
   * Place a new desk at the given tile position. Deducts $1,000.
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  placeDeskAtTile(tileX, tileY) {
    const PRICE = 1000;
    if (!this.company) return false;
    if (this.company.money < PRICE) {
      this.bus.emit('notification:add', { text: 'Not enough money for a new desk.', type: 'warning' });
      return false;
    }
    this.company.money -= PRICE;
    this.company.office.desks += 1;
    this.company.office.deskTiles.push({ tileX, tileY });
    this.bus.emit('notification:add', { text: 'New desk placed! (+1 slot)', type: 'success' });
    this.bus.emit('desk:placed', { company: this.company });
    return true;
  }

  /**
   * Move a desk from its current tile position to a new one.
   * Updates in-place so the array index (and employee mapping) is preserved.
   * @param {number} oldTileX
   * @param {number} oldTileY
   * @param {number} newTileX
   * @param {number} newTileY
   */
  moveDeskAtTile(oldTileX, oldTileY, newTileX, newTileY) {
    if (!this.company) return;
    const desk = this.company.office.deskTiles.find(
      (d) => d.tileX === oldTileX && d.tileY === oldTileY,
    );
    if (!desk) return;
    desk.tileX = newTileX;
    desk.tileY = newTileY;
    this.bus.emit('desk:placed', { company: this.company });
  }

  /**
   * Remove the desk at the given tile position.
   * Blocked when an employee is seated at that desk.
   * @param {number} tileX
   * @param {number} tileY
   */
  removeDeskAtTile(tileX, tileY) {
    if (!this.company) return;
    const tiles = this.company.office.deskTiles;
    const idx = tiles.findIndex((d) => d.tileX === tileX && d.tileY === tileY);
    if (idx === -1) return;
    if (this.company.employees[idx]) {
      this.bus.emit('notification:add', { text: 'Cannot remove a desk with an employee seated.', type: 'warning' });
      return;
    }
    tiles.splice(idx, 1);
    this.company.office.desks -= 1;
    this.bus.emit('desk:removed', { company: this.company });
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
      suppress: employee.logsMuted,
    });
    return true;
  }

  /**
   * Update the company's work schedule.
   * No-op until the work_schedule research node is unlocked.
   * @param {number} startHour  Hour the work day starts (6–16).
   * @param {number} workHours  Duration: 8 | 10 | 12 | 14.
   */
  setSchedule(startHour, workHours) {
    if (!this.company) return;
    if (!this.company.unlockedResearch.includes(GameConfig.schedule.researchNodeId)) return;
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

  // -----------------------------------------------------------------------
  // Build mode actions
  // -----------------------------------------------------------------------

  /**
   * Place a furniture item on the floor at the given tile coordinates.
   * @param {string} typeId
   * @param {number} tileX
   * @param {number} tileY
   */
  placeFurniture(typeId, tileX, tileY) {
    const item = createFurnitureItem(typeId, tileX, tileY);
    this.company.furniture.push(item);
    this.bus.emit('furniture:placed', { item });
  }

  /**
   * Remove a placed furniture item by its id.
   * @param {number} itemId
   */
  removeFurniture(itemId) {
    this.company.furniture = this.company.furniture.filter((f) => f.id !== itemId);
    this.bus.emit('furniture:removed', { itemId });
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
