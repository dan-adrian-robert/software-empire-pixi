/**
 * Central game configuration.
 *
 * Keep tunable / "designer-facing" constants in this single file so they are
 * easy to find and balance later. Avoid hard-coded magic numbers in gameplay
 * code; reference fields here instead.
 */
export const GameConfig = Object.freeze({
  meta: {
    name: 'Software Empire',
    version: '0.1.0',
  },

  // Logical "design" resolution. The Pixi Application is auto-resized to the
  // window, but UI/scenes can use these values as a reference for layout.
  resolution: {
    designWidth: 1920,
    designHeight: 1080,
    minWidth: 320,
    minHeight: 240,
  },

  // Renderer / Application options passed to PixiJS.
  renderer: {
    backgroundColor: 0x0b0f1a,
    antialias: true,
    autoDensity: true,
    // Cap to 2 to avoid huge canvases on very high-DPI displays.
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    powerPreference: 'high-performance',
  },

  // Game loop tuning. PixiJS' Ticker drives this.
  loop: {
    targetFPS: 60,
    // Multiplier applied to delta time. Useful as a global "game speed" knob
    // for a tycoon game (1x / 2x / 4x time controls).
    timeScale: 1,
  },

  // Scene identifiers. Centralised to avoid typo-driven bugs.
  scenes: Object.freeze({
    BOOT: 'boot',
    MAIN_MENU: 'mainMenu',
    OFFICE: 'office',
  }),

  debug: {
    enabled: import.meta.env?.DEV ?? false,
    showFPS: true,
  },

  audio: Object.freeze({
    enabled: true,
    masterVolume: 1,
    sfxVolume: 0.8,
  }),

  gameplay: Object.freeze({
    // Real seconds it takes to simulate one in-game day at 1x speed.
    DAY_DURATION_SECONDS: 180,

    // Story points per skill level per 15-minute WORK clock period.
    // Index 0 unused (no level-0 skill). Levels 1–10 map to the values below.
    SKILL_SP_TABLE: Object.freeze([0, 1, 2, 4, 6, 9, 12, 16, 21, 28, 36]),

    // Available speed multipliers; 0 = paused.
    SPEED_PRESETS: Object.freeze([0, 1, 2, 4, 8]),

    // Default speed when entering the office scene.
    DEFAULT_SPEED: 0,

    // Maximum number of available projects shown to the player between days.
    AVAILABLE_PROJECT_POOL_SIZE: 5,

    // How many candidates appear in the hiring pool each day.
    CANDIDATE_POOL_SIZE: 4,

    // Player is warned when money drops below this threshold.
    MONEY_WARNING_THRESHOLD: 5_000,

    // Player goes bankrupt when money drops to or below this value.
    BANKRUPTCY_THRESHOLD: 0,

    // Number of past activity entries kept in the live panel.
    ACTIVITY_LOG_MAX: 100,

    // Productivity engine: per-employee base productivity trait range.
    BASE_PRODUCTIVITY_MIN: 0.85,
    BASE_PRODUCTIVITY_MAX: 1.05,

    // Employee experience system.
    EXP_PER_TICK: 10,   // EXP awarded per WORK period flush when the employee contributed

    // Project milestone payout multipliers (applied to basePayout at completion).
    PROJECT_PAYOUT_MULTIPLIERS: Object.freeze({ ahead: 1.25, onTrack: 1.0, delayed: 0.75, critical: 0.5 }),

    // Insurance cost = totalSP × this factor (used by projectTemplates helper).
    PROJECT_INSURANCE_SP_FACTOR: 2.5,
  }),

  schedule: Object.freeze({
    // Research node that must be unlocked before the player can edit the schedule.
    researchNodeId: 'work_schedule',
    // Fixed shift applied until that research is purchased: 9 AM–9 PM (12 hours).
    locked: Object.freeze({ startHour: 9, workHours: 12 }),
  }),

  save: Object.freeze({
    SLOT_COUNT: 5,
    STORAGE_PREFIX: 'software-empire:save:',
  }),
});

/**
 * XP required to advance from the given level to the next.
 * Uses an exponential curve starting at 100 XP for level 1,
 * growing by 25% per level: xp = floor(100 × 1.25^(level-1))
 *
 * @param {number} level  Current employee level (1-based).
 * @returns {number}
 */
export function xpRequiredForLevel(level) {
  return Math.floor(100 * Math.pow(1.25, level - 1));
}
