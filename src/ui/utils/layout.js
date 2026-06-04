/**
 * layout.js
 *
 * Small utility helpers shared by Layout subclasses.
 */

/**
 * Returns true if value is neither null nor undefined.
 * Use instead of `!= null` to satisfy the eqeqeq lint rule.
 * @param {*} v
 * @returns {boolean}
 */
export function isDefined(v) {
  return v !== null && v !== undefined;
}

/**
 * Returns true if value is a concrete number (not null, undefined, or 'auto').
 * Used to decide whether a layout dimension is fixed vs. auto-sized.
 * @param {*} v
 * @returns {boolean}
 */
export function isExplicit(v) {
  return v !== null && v !== undefined && v !== 'auto';
}
