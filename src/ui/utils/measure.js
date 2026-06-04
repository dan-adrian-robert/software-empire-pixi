/**
 * measure.js
 *
 * Helpers for text dimension estimation used during layout passes.
 * A simple cache avoids repeatedly creating Pixi Text objects for the same
 * text/style combinations, which is the main cost in layout-heavy screens.
 *
 * Usage:
 *   import { measureText } from '../utils/measure.js';
 *   const { width, height } = measureText('Hello', { fontSize: 13, fontWeight: '700' });
 */
import { Text } from 'pixi.js';
import { Theme } from '../foundation/Theme.js';

/** @type {Map<string, { width: number, height: number }>} */
const _cache = new Map();
const MAX_CACHE = 512;

/**
 * Measure the pixel dimensions of a string given a text style.
 *
 * @param {string} text
 * @param {{ fontSize?: number, fontWeight?: string, fontFamily?: string, wordWrap?: boolean, wordWrapWidth?: number }} [style]
 * @returns {{ width: number, height: number }}
 */
export function measureText(text, style = {}) {
  const key = `${text}|${style.fontSize ?? 13}|${style.fontWeight ?? '400'}|${style.wordWrap ? style.wordWrapWidth : ''}`;
  if (_cache.has(key)) return _cache.get(key);

  const t = new Text({
    text,
    style: {
      fontFamily: style.fontFamily ?? Theme.typography.fontFamily,
      fontSize: style.fontSize ?? Theme.typography.sizes.md,
      fontWeight: style.fontWeight ?? Theme.typography.weights.regular,
      wordWrap: style.wordWrap ?? false,
      wordWrapWidth: style.wordWrapWidth ?? 0,
    },
  });

  const result = { width: t.width, height: t.height };
  t.destroy();

  // Evict oldest entries if cache grows too large
  if (_cache.size >= MAX_CACHE) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, result);
  return result;
}

/** Clear the measurement cache (e.g. after a font load). */
export function clearMeasureCache() {
  _cache.clear();
}
