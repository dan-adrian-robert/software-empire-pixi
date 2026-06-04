/**
 * Employee relationship state helpers.
 *
 * Relationships are stored on the company object so they are saved with game
 * state and not shared across instances. Each pair is keyed by
 * "lowerEmployeeId_higherEmployeeId" and holds a friendship score.
 *
 * Friendship starts at 50 (neutral). Communication interactions raise or lower
 * it based on how closely the two employees' topic scores align.
 */

/**
 * Canonical relationship key for two employee ids.
 * Always puts the lower id first so the key is the same regardless of order.
 * @param {number} id1
 * @param {number} id2
 * @returns {string}
 */
export function relationshipKey(id1, id2) {
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
}

/**
 * Retrieve or lazily create a relationship entry for a pair of employees.
 * Mutates company.relationships in place.
 * @param {import('./Company.js').Company} company
 * @param {number} id1
 * @param {number} id2
 * @returns {{ friendship: number }}
 */
export function getOrCreateRelationship(company, id1, id2) {
  const key = relationshipKey(id1, id2);
  if (!company.relationships[key]) {
    company.relationships[key] = { friendship: 50 };
  }
  return company.relationships[key];
}

/**
 * Compute how much a single conversation moves friendship.
 *
 * Formula: (50 - |scoreA - scoreB|) / 10
 *
 * When both employees feel the same way (difference = 0) the gain is +5.
 * When they disagree maximally (difference = 100) the loss is -5.
 * Neutral scores (both at 50, difference = 0) also give +5.
 *
 * Example: Alex = 80, Sarah = 65
 *   difference = |80 - 65| = 15
 *   delta = (50 - 15) / 10 = +3.5
 *
 * @param {number} scoreA  Topic score for employee A (1–100).
 * @param {number} scoreB  Topic score for employee B (1–100).
 * @returns {number}
 */
export function computeFriendshipDelta(scoreA, scoreB) {
  const difference = Math.abs(scoreA - scoreB);
  return (50 - difference) / 10;
}

/**
 * Apply the result of a TALK interaction between two employees on a shared topic.
 * Reads each employee's communication score for topicId (defaulting to 50),
 * computes the friendship delta, and writes it back into company.relationships.
 *
 * @param {import('./Company.js').Company} company
 * @param {import('./Employee.js').Employee} empA
 * @param {import('./Employee.js').Employee} empB
 * @param {string} topicId
 * @returns {{ delta: number, friendship: number }}
 */
export function applyTalkInteraction(company, empA, empB, topicId) {
  const scoreA = empA.communication[topicId] ?? 50;
  const scoreB = empB.communication[topicId] ?? 50;
  const delta = computeFriendshipDelta(scoreA, scoreB);
  const rel = getOrCreateRelationship(company, empA.id, empB.id);
  rel.friendship += delta;
  return { delta, friendship: rel.friendship };
}
