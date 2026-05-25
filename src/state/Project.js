/**
 * Project state factory.
 *
 * An active Project is built from a generated template object and tracks
 * per-requirement progress (`current` field) and milestone timing.
 *
 * Lifecycle:
 *   available  → (accept) → active → (all SP met) → readyToFinish → (collect) → completed
 *                                  → (past critical deadline)      → failed
 */
import { GameConfig } from '../config.js';

let _nextId = 1;
export function peekNextId() { return _nextId; }
export function setNextId(n) { _nextId = n; }

/**
 * @param {object} template  Plain template object produced by ProjectGenerator.
 * @returns {Project}
 */
export function createProject(template) {
  return {
    id: _nextId++,
    templateId: template.id,
    name: template.name,
    description: template.description,
    tier: template.tier,

    /** 'common' | 'uncommon' | 'rare' — set at generation time from team output. */
    difficulty: template.difficulty ?? 'common',

    /** Base reward when finishing exactly On Track (multiplier 1.0). */
    basePayout: template.basePayout,

    /** Upfront cost deducted on accept; refunded in full on successful collect. */
    insurance: template.insurance,

    /**
     * Deadline windows (in elapsed days from startedDay, inclusive).
     * { ahead, onTrack, delayed, critical }
     */
    milestones: { ...template.milestones },

    /**
     * Payout multipliers per milestone tier.
     * Defaults to config values; templates may override per-project.
     */
    payoutMultipliers: { ...(template.payoutMultipliers ?? GameConfig.gameplay.PROJECT_PAYOUT_MULTIPLIERS) },

    /** @type {Array<{skill: string, points: number, current: number}>} */
    requirements: template.requirements.map((r) => ({
      skill: r.skill,
      points: r.points,
      current: 0,
    })),

    // ── Lifecycle flags ───────────────────────────────────────────────────

    /** Whether the player has accepted this project as active. */
    isActive: false,
    /** Set to true when all requirements are met — awaiting player collection. */
    isReadyToFinish: false,
    /** Set to true once the player has collected the payout. */
    isCompleted: false,
    /** Set to true if the project expired past the critical deadline. */
    isFailed: false,

    // ── Tracking fields (set during play) ────────────────────────────────

    /** company.day when the player accepted the project. */
    startedDay: null,
    /** company.day when all SP requirements were first met. */
    finishedDay: null,
    /** 'ahead' | 'onTrack' | 'delayed' | 'critical' — locked at finishedDay. */
    milestoneTier: null,
    /** basePayout × payoutMultipliers[milestoneTier], locked at finishedDay. */
    finalPayout: null,
  };
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Returns total required points across all requirements. */
export function projectTotalPoints(project) {
  return project.requirements.reduce((s, r) => s + r.points, 0);
}

/** Returns total current progress points. */
export function projectCurrentPoints(project) {
  return project.requirements.reduce((s, r) => s + r.current, 0);
}

/** Returns 0..1 completion ratio. */
export function projectProgress(project) {
  const total = projectTotalPoints(project);
  if (total === 0) return 1;
  return Math.min(1, projectCurrentPoints(project) / total);
}

/** Returns true if every requirement is fully filled. */
export function isProjectComplete(project) {
  return project.requirements.every((r) => r.current >= r.points);
}

/**
 * Days elapsed since the project was accepted (inclusive: accepted on day 1 = elapsed 1).
 * Returns 0 if the project has not been started.
 */
export function projectElapsedDays(project, currentDay) {
  if (project.startedDay === null) return 0;
  return currentDay - project.startedDay + 1;
}

/**
 * Determine the milestone tier for a given number of elapsed days.
 * @param {number} elapsedDays
 * @param {{ ahead: number, onTrack: number, delayed: number, critical: number }} milestones
 * @returns {'ahead' | 'onTrack' | 'delayed' | 'critical'}
 */
export function resolveMilestoneTier(elapsedDays, milestones) {
  if (elapsedDays <= milestones.ahead)   return 'ahead';
  if (elapsedDays <= milestones.onTrack) return 'onTrack';
  if (elapsedDays <= milestones.delayed) return 'delayed';
  return 'critical';
}

/**
 * Compute the final dollar payout for a completed project.
 * @param {number} basePayout
 * @param {'ahead' | 'onTrack' | 'delayed' | 'critical'} tier
 * @param {object} multipliers
 * @returns {number}
 */
export function computeFinalPayout(basePayout, tier, multipliers) {
  return Math.round(basePayout * (multipliers[tier] ?? 1.0));
}

/**
 * Returns the current milestone status for a project in progress.
 * Returns null if the project hasn't been started yet.
 * @returns {{ tier: string, remaining: number } | null}
 *   tier     — current milestone tier label
 *   remaining — days remaining before dropping to the next (worse) tier
 */
export function getActiveMilestoneStatus(project, currentDay) {
  if (project.startedDay === null) return null;
  const elapsed = projectElapsedDays(project, currentDay);
  const { milestones } = project;
  if (elapsed <= milestones.ahead)   return { tier: 'ahead',    remaining: milestones.ahead   - elapsed };
  if (elapsed <= milestones.onTrack) return { tier: 'onTrack',  remaining: milestones.onTrack - elapsed };
  if (elapsed <= milestones.delayed) return { tier: 'delayed',  remaining: milestones.delayed - elapsed };
  return { tier: 'critical', remaining: Math.max(0, milestones.critical - elapsed) };
}

/**
 * Returns true if the project has exceeded its critical deadline without finishing.
 * Uses strictly-greater-than so the player has the full critical day to complete.
 */
export function isPastCritical(project, currentDay) {
  if (project.startedDay === null) return false;
  return projectElapsedDays(project, currentDay) > project.milestones.critical;
}
