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
import { createEmployee } from '../state/Employee.js';
import { freeDesks } from '../state/Company.js';
import { getUnlockedSkills } from '../data/skills.js';
import { generateCandidate, generateProjectManagerCandidate, generateTeamLeadCandidate } from './EmployeeGenerator.js';
import { generateCommunicationProfile } from './CommunicationGenerator.js';
import { STAFF_ROLES } from '../data/staffRoles.js';
import { getCandidatePoolSize } from '../data/hiringResearch.js';

export class HiringSystem {
  /**
   * @param {import('../utils/EventBus.js').EventBus} bus
   * @param {import('./TeamSystem.js').TeamSystem} [teamSystem]
   */
  constructor(bus, teamSystem) {
    this.bus = bus;
    this.teamSystem = teamSystem ?? null;
  }

  /**
   * Replace the programmer candidate pool for the new day.
   * Pool size scales with HR Leads research.
   * @param {import('../state/Company.js').Company} company
   */
  refreshCandidates(company) {
    const count = getCandidatePoolSize(company.unlockedResearch);
    const allowedSkills = getUnlockedSkills(company.unlockedResearch);
    company.candidates = Array.from({ length: count }, () =>
      generateCandidate({ allowedSkills }),
    );
  }

  /**
   * Replace the Other (non-programmer) candidate pool for the new day.
   * Team Leads require team_management research; PMs require project_management.
   * Pool size per role scales with HR Leads research.
   * @param {import('../state/Company.js').Company} company
   */
  refreshOtherCandidates(company) {
    const pool = [];
    if (company.unlockedResearch.includes('team_management')) {
      pool.push(...this._generateRoleCandidates(company, STAFF_ROLES.TEAM_LEAD));
    }
    if (company.unlockedResearch.includes('project_management')) {
      pool.push(...this._generateRoleCandidates(company, STAFF_ROLES.PROJECT_MANAGER));
    }
    company.otherCandidates = pool;
  }

  /**
   * Replace only one non-programmer role pool, keeping other roles intact.
   * @param {import('../state/Company.js').Company} company
   * @param {string} role  STAFF_ROLES.TEAM_LEAD | STAFF_ROLES.PROJECT_MANAGER
   */
  refreshOtherCandidatesByRole(company, role) {
    const kept = (company.otherCandidates ?? []).filter((c) => c.role !== role);
    company.otherCandidates = [...kept, ...this._generateRoleCandidates(company, role)];
  }

  /** Rebuild programmer and non-programmer pools to match current research. */
  refreshAllPools(company) {
    this.refreshCandidates(company);
    this.refreshOtherCandidates(company);
  }

  /**
   * @param {import('../state/Company.js').Company} company
   * @param {string} role
   * @returns {import('../state/Candidate.js').Candidate[]}
   */
  _generateRoleCandidates(company, role) {
    const poolSize = getCandidatePoolSize(company.unlockedResearch);
    const fresh = [];
    if (role === STAFF_ROLES.TEAM_LEAD && company.unlockedResearch.includes('team_management')) {
      for (let i = 0; i < poolSize; i++) fresh.push(generateTeamLeadCandidate());
    } else if (role === STAFF_ROLES.PROJECT_MANAGER && company.unlockedResearch.includes('project_management')) {
      for (let i = 0; i < poolSize; i++) fresh.push(generateProjectManagerCandidate());
    }
    return fresh;
  }

  /**
   * Hire a candidate if desk space is available.
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Candidate.js').Candidate} candidate
   * @returns {{ ok: boolean, reason?: string }}
   */
  hire(company, candidate) {
    if (freeDesks(company) <= 0) {
      const reason = 'No desk space available. Upgrade your office first.';
      this.bus.emit('notification:add', { text: reason, type: 'critical' });
      return { ok: false, reason };
    }

    const employee = createEmployee({
      name: candidate.name,
      skills: candidate.skills,
      salary: candidate.salary,
      characterIndex: candidate.characterIndex,
      role: candidate.role,
      startingLevel: candidate.level ?? null,
      archetypes: candidate.archetypes ?? {},
      communication: candidate.communication ?? generateCommunicationProfile(),
    });
    company.employees.push(employee);

    // Remove from the appropriate candidate pool.
    company.candidates = company.candidates.filter((c) => c.id !== candidate.id);
    company.otherCandidates = (company.otherCandidates ?? []).filter((c) => c.id !== candidate.id);

    // Auto-create a team when a Team Lead is hired.
    if (employee.role === STAFF_ROLES.TEAM_LEAD && this.teamSystem) {
      this.teamSystem.createTeamForLead(company, employee);
    }

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

    // Dissolve team if this employee was a Team Lead.
    if (employee.role === STAFF_ROLES.TEAM_LEAD && this.teamSystem) {
      this.teamSystem.dissolveTeam(company, employee.id);
    }

    // Remove from any team they were a member of.
    if (this.teamSystem) {
      this.teamSystem.removeFromTeam(company, employee.id);
    }

    this.bus.emit('employee:fired', { employee, company });
    this.bus.emit('notification:add', {
      text: `${employee.name} left the company.`,
      type: 'info',
    });
  }
}
