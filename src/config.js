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
    MONEY_WARNING_THRESHOLD: 500,

    // Player goes bankrupt when money drops to or below this value.
    BANKRUPTCY_THRESHOLD: 0,

    // Number of past activity entries kept in the live panel.
    ACTIVITY_LOG_MAX: 20,
  }),
});
