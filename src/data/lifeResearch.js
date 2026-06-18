/**
 * Life / Survival research helpers.
 * Centralises the logic for deriving the effective insolvency grace days
 * from the company's unlocked research nodes.
 */
import { GameConfig } from '../config.js';

export const LIFE_RESEARCH = Object.freeze({
  RESERVE_1: 'life_reserve_1',
  RESERVE_2: 'life_reserve_2',
  RESERVE_3: 'life_reserve_3',
  RESERVE_4: 'life_reserve_4',
});

/** Extra grace days granted by each node (cumulative when multiple are unlocked). */
const LIFE_BONUS_BY_NODE = Object.freeze({
  [LIFE_RESEARCH.RESERVE_1]: 1,
  [LIFE_RESEARCH.RESERVE_2]: 2,
  [LIFE_RESEARCH.RESERVE_3]: 3,
  [LIFE_RESEARCH.RESERVE_4]: 4,
});

/**
 * Returns the effective insolvency grace-day count for the given company.
 * Starts from the base constant and adds each unlocked Reserve Fund bonus.
 *
 * @param {string[]} unlockedResearch
 * @returns {number}
 */
export function getNegativeCashGraceDays(unlockedResearch) {
  const base = GameConfig.gameplay.NEGATIVE_CASH_GRACE_DAYS;
  const set = new Set(unlockedResearch);
  let bonus = 0;
  for (const [nodeId, extra] of Object.entries(LIFE_BONUS_BY_NODE)) {
    if (set.has(nodeId)) bonus += extra;
  }
  return base + bonus;
}
