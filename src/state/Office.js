/**
 * Office state factory.
 * Tracks desk capacity for the company's current office tier.
 */
import { OFFICE_TIERS } from '../data/officeTiers.js';

let _nextId = 1;

/**
 * @param {number} tierIndex  Index into OFFICE_TIERS array.
 * @returns {Office}
 */
export function createOffice(tierIndex = 0) {
  const tier = OFFICE_TIERS[tierIndex] ?? OFFICE_TIERS[0];
  return {
    id: _nextId++,
    tierIndex,
    name: tier.name,
    desks: tier.desks,
  };
}

/** Returns the next available tier, or null if already at max. */
export function getNextOfficeTier(office) {
  const next = office.tierIndex + 1;
  return OFFICE_TIERS[next] ?? null;
}
