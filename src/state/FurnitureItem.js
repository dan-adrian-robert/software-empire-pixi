/**
 * FurnitureItem state factory.
 *
 * Each placed furniture piece is a plain object stored in company.furniture[].
 * tileX / tileY are grid coordinates (not pixel positions).
 */

let _nextId = 1;

export function peekNextId() { return _nextId; }
export function setNextId(n) { _nextId = n; }

/**
 * @param {string} typeId  One of the ids from furnitureTypes.js
 * @param {number} tileX
 * @param {number} tileY
 * @returns {{ id: number, typeId: string, tileX: number, tileY: number }}
 */
export function createFurnitureItem(typeId, tileX, tileY) {
  return { id: _nextId++, typeId, tileX, tileY };
}
