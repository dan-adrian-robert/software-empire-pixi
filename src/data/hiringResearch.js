/**
 * HR research helpers.
 * Centralises the logic for deriving the hiring panel tab mode and
 * candidate pool size from the company's unlocked research array.
 */

export const HR_RESEARCH = Object.freeze({
  BASICS:    'hr_basics',
  ORGANISED: 'hr_organised',
  LEADS_1:   'hr_leads_1',
  LEADS_2:   'hr_leads_2',
});

/** Programmer candidates shown on day 1 regardless of desk availability. */
export const STARTER_CANDIDATE_COUNT = 3;

/** Unlocking these nodes rebuilds every hiring pool immediately. */
export const HIRING_POOL_REFRESH_NODES = new Set([
  'team_management',
  'project_management',
  HR_RESEARCH.LEADS_1,
  HR_RESEARCH.LEADS_2,
]);

/**
 * @param {string} nodeId
 * @returns {boolean}
 */
export function shouldRefreshHiringPoolsOnUnlock(nodeId) {
  return HIRING_POOL_REFRESH_NODES.has(nodeId);
}

/**
 * Derive the hiring panel layout mode from unlocked research.
 * @param {string[]} unlockedResearch
 * @returns {'people' | 'split' | 'organised'}
 */
export function getHiringTabMode(unlockedResearch) {
  const set = new Set(unlockedResearch);
  if (set.has(HR_RESEARCH.ORGANISED)) return 'organised';
  if (set.has(HR_RESEARCH.BASICS)) return 'split';
  return 'people';
}

/**
 * Derive the per-role candidate pool size from unlocked research.
 * @param {string[]} unlockedResearch
 * @returns {3 | 4 | 5}
 */
export function getCandidatePoolSize(unlockedResearch) {
  const set = new Set(unlockedResearch);
  if (set.has(HR_RESEARCH.LEADS_2)) return 5;
  if (set.has(HR_RESEARCH.LEADS_1)) return 4;
  return 3;
}
