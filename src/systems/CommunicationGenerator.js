/**
 * CommunicationGenerator
 *
 * Procedurally creates a communication profile for an employee:
 * 4 categories × 6 topics, each scored 1–100.
 * 1 = strong dislike, 100 = strong like.
 */
import { ALL_TOPIC_IDS } from '../data/communicationTopics.js';

/**
 * Roll a random integer in [min, max] inclusive.
 * @param {number} min
 * @param {number} max
 * @param {() => number} rng
 */
function randomInt(min, max, rng) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Generate a random communication profile.
 * @param {() => number} [rng]  Math.random-compatible RNG.
 * @returns {{ [topicId: string]: number }}
 */
export function generateCommunicationProfile(rng = Math.random) {
  const profile = {};
  for (const id of ALL_TOPIC_IDS) {
    profile[id] = randomInt(1, 100, rng);
  }
  return profile;
}
