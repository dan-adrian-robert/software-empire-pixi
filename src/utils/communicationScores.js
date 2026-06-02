/**
 * Helpers for reading and interpreting communication scores.
 *
 * Scores are stored as { [topicId]: number } with values in [1, 100]:
 *   1 = strong dislike, 100 = strong like.
 */
import { COMMUNICATION_CATEGORIES } from '../data/communicationTopics.js';

/**
 * Five-band color scale matching the mockup's Interaction Guide.
 * @param {number} score  1–100
 * @returns {number} hex color
 */
export function getScoreColor(score) {
  if (score >= 80) return 0x4ade80;  // strong agreement — green
  if (score >= 60) return 0x84cc16;  // agreement — lime
  if (score >= 40) return 0xf59e0b;  // neutral — amber
  if (score >= 20) return 0xef4444;  // disagreement — red
  return 0xb91c1c;                   // strong disagreement — dark red
}

/**
 * Flatten all topics into a single sorted array with their metadata.
 * @param {{ [topicId: string]: number }} communication
 * @returns {Array<{ id: string, label: string, categoryId: string, score: number }>}
 */
export function flattenTopics(communication) {
  const result = [];
  for (const cat of COMMUNICATION_CATEGORIES) {
    for (const topic of cat.topics) {
      result.push({
        id:         topic.id,
        label:      topic.label,
        categoryId: cat.id,
        score:      communication[topic.id] ?? 50,
      });
    }
  }
  return result;
}

/**
 * Returns the top N topics by score (highest first).
 * @param {{ [topicId: string]: number }} communication
 * @param {number} [n]
 */
export function getTopTopics(communication, n = 3) {
  return flattenTopics(communication).sort((a, b) => b.score - a.score).slice(0, n);
}

/**
 * Returns the bottom N topics by score (lowest first).
 * @param {{ [topicId: string]: number }} communication
 * @param {number} [n]
 */
export function getBottomTopics(communication, n = 3) {
  return flattenTopics(communication).sort((a, b) => a.score - b.score).slice(0, n);
}
