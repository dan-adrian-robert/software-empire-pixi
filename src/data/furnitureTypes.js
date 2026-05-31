/**
 * Static furniture catalog.
 *
 * Each entry describes a type of office furniture the player can place.
 * w / h are in tiles (each tile = 64px).
 */
export const FURNITURE_TYPES = [
  { id: 'desk',    label: 'Desk',         color: 0x3a5080, w: 2, h: 2 },
  { id: 'plant',   label: 'Plant',        color: 0x22c55e, w: 1, h: 1 },
  { id: 'couch',   label: 'Couch',        color: 0x3b82f6, w: 2, h: 1 },
  { id: 'cabinet', label: 'File Cabinet', color: 0xf59e0b, w: 1, h: 2 },
];

/** @param {string} id */
export function getFurnitureType(id) {
  return FURNITURE_TYPES.find((t) => t.id === id) ?? FURNITURE_TYPES[0];
}
