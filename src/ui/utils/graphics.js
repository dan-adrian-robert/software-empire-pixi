/**
 * graphics.js
 *
 * Shared drawing helpers that reduce boilerplate in widgets and screens.
 * All functions operate on an existing Graphics instance (passed in) so
 * callers control object lifetime and can chain their own draws.
 *
 * Usage:
 *   import { drawRoundRect, drawCircleDot } from '../utils/graphics.js';
 *   const g = new Graphics();
 *   drawRoundRect(g, 0, 0, 200, 100, { radius: 6, fill: 0x0d1a2e, stroke: 0x2a4a8a });
 */

/**
 * Draw a rounded rectangle onto a Graphics object.
 *
 * @param {import('pixi.js').Graphics} g       Target Graphics instance
 * @param {number} x
 * @param {number} y
 * @param {number} w                            Width
 * @param {number} h                            Height
 * @param {object} style
 * @param {number}  [style.radius]              Corner radius (default 6)
 * @param {number}  [style.fill]                Fill color
 * @param {number}  [style.fillAlpha]           Fill alpha (default 1)
 * @param {number}  [style.stroke]              Border color
 * @param {number}  [style.strokeWidth]         Border width (default 1)
 * @param {number}  [style.strokeAlpha]         Border alpha (default 1)
 * @returns {import('pixi.js').Graphics}        The same Graphics instance for chaining
 */
export function drawRoundRect(g, x, y, w, h, style = {}) {
  const { radius = 6, fill, fillAlpha = 1, stroke, strokeWidth = 1, strokeAlpha = 1 } = style;
  g.roundRect(x, y, w, h, radius);
  if (fill !== undefined) g.fill({ color: fill, alpha: fillAlpha });
  if (stroke !== undefined) g.stroke({ color: stroke, width: strokeWidth, alpha: strokeAlpha });
  return g;
}

/**
 * Draw a filled circle dot (used for legend indicators, archetype dots, etc.)
 *
 * @param {import('pixi.js').Graphics} g
 * @param {number} cx    Center X
 * @param {number} cy    Center Y
 * @param {number} r     Radius
 * @param {number} color Fill color
 * @param {number} [alpha]
 * @returns {import('pixi.js').Graphics}
 */
export function drawCircleDot(g, cx, cy, r, color, alpha = 1) {
  g.circle(cx, cy, r).fill({ color, alpha });
  return g;
}

/**
 * Draw a horizontal line.
 *
 * @param {import('pixi.js').Graphics} g
 * @param {number} x1
 * @param {number} y
 * @param {number} x2
 * @param {number} color
 * @param {number} [width]  Line width (default 1)
 * @param {number} [alpha]
 * @returns {import('pixi.js').Graphics}
 */
export function drawHLine(g, x1, y, x2, color, width = 1, alpha = 1) {
  g.moveTo(x1, y).lineTo(x2, y).stroke({ color, width, alpha });
  return g;
}

/**
 * Draw a progress bar (track + fill) onto two separate Graphics objects.
 *
 * @param {import('pixi.js').Graphics} gTrack   Track Graphics
 * @param {import('pixi.js').Graphics} gFill    Fill Graphics
 * @param {number} x
 * @param {number} y
 * @param {number} totalW
 * @param {number} h
 * @param {number} value          0–1 fill fraction
 * @param {object} colors
 * @param {number} colors.track   Track background color
 * @param {number} colors.fill    Fill color
 * @param {number} [radius]       Corner radius (default 2)
 */
export function drawProgressBar(gTrack, gFill, x, y, totalW, h, value, colors, radius = 2) {
  gTrack.clear().roundRect(x, y, totalW, h, radius).fill({ color: colors.track });
  gFill.clear();
  const fillW = Math.max(0, Math.round(totalW * Math.max(0, Math.min(1, value))));
  if (fillW > 0) {
    gFill.roundRect(x, y, fillW, h, radius).fill({ color: colors.fill });
  }
}
