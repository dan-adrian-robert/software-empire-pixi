/**
 * Office state factory.
 * Tracks desk capacity for the company's current office tier.
 */
import { OFFICE_TIERS } from '../data/officeTiers.js';

let _nextId = 1;
export function peekNextId() { return _nextId; }
export function setNextId(n) { _nextId = n; }

/**
 * Generate default tile positions for `count` desks arranged in a grid.
 * Each desk is 2×2 tiles; desks are spaced 3 tiles apart (2 occupied + 1 gap).
 * @param {number} count
 * @returns {{ tileX: number, tileY: number }[]}
 */
export function defaultDeskTiles(count) {
  const tiles = [];
  const cols      = 3;
  const startTileX = 1; // ~64px from left floor edge
  const startTileY = 2; // ~128px from top floor edge (below top bar)
  const strideX    = 3; // 2-tile desk + 1-tile gap
  const strideY    = 3;
  for (let i = 0; i < count; i++) {
    tiles.push({
      tileX: startTileX + (i % cols) * strideX,
      tileY: startTileY + Math.floor(i / cols) * strideY,
    });
  }
  return tiles;
}

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
    /** @type {{ tileX: number, tileY: number }[]} */
    deskTiles: defaultDeskTiles(tier.desks),
  };
}

/** Returns the next available tier, or null if already at max. */
export function getNextOfficeTier(office) {
  const next = office.tierIndex + 1;
  return OFFICE_TIERS[next] ?? null;
}
