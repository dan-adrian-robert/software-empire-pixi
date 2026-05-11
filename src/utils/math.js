/**
 * Reusable math helpers. Keep this file dependency-free so it can be unit
 * tested in isolation.
 */

export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Frame-rate independent lerp. `smoothing` is roughly "half-life" in seconds. */
export function damp(a, b, smoothing, dt) {
  return lerp(a, b, 1 - Math.exp(-dt / Math.max(smoothing, 1e-6)));
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}
