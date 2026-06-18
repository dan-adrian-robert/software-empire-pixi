/**
 * Calendar sheet helpers.
 *
 * The game uses a single monotonically increasing day counter (company.day).
 * These pure functions project that counter onto a presentational 4×5 grid
 * called a "sheet". Each sheet covers exactly DAYS_PER_SHEET consecutive days.
 *
 * Sheet 1: days  1–20
 * Sheet 2: days 21–40
 * Sheet N: days (N-1)*20+1 – N*20
 */
import { GameConfig } from '../config.js';

export const DAYS_PER_SHEET = GameConfig.gameplay.DAYS_PER_SHEET; // 20

/** Zero-based sheet index for a given day (day is 1-based). */
export function getSheetIndex(day) {
  return Math.floor((day - 1) / DAYS_PER_SHEET);
}

/** Absolute day number for a cell at zero-based cellIndex within a sheet. */
export function getDayForCell(sheetIndex, cellIndex) {
  return sheetIndex * DAYS_PER_SHEET + cellIndex + 1;
}

/** Zero-based cell index of a given day within its sheet. */
export function getCellIndexForDay(day) {
  return (day - 1) % DAYS_PER_SHEET;
}

/** Human-readable label for a sheet's day range, e.g. "Days 21–40". */
export function getSheetRangeLabel(sheetIndex) {
  const first = sheetIndex * DAYS_PER_SHEET + 1;
  const last  = first + DAYS_PER_SHEET - 1;
  return `Days ${first}–${last}`;
}
