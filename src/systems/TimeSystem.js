/**
 * TimeSystem
 *
 * Owns day progression.  Each frame `update(dt)` is called with real seconds
 * (already multiplied by the game's time scale from Game.js).
 * The system advances `dayProgress` [0..1] at a rate controlled by `gameSpeed`
 * and fires `day:tick` each frame and `day:ended` when the day completes.
 *
 * Speed meanings:  0 = paused, 1 = 1×, 4 = 4×, 16 = 16×.
 */
import { GameConfig } from '../config.js';

export class TimeSystem {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;

    /** Current multiplier. 0 = paused. */
    this.gameSpeed = GameConfig.gameplay.DEFAULT_SPEED;

    /** 0..1 how far through today we are. */
    this.dayProgress = 0;

    /** Fires once per day end and is consumed by EconomySystem / HiringSystem. */
    this._dayEnding = false;
  }

  /** @param {number} dt  Real seconds elapsed this frame (from Game ticker). */
  update(dt, company) {
    if (this.gameSpeed === 0) return;

    const step = (dt * this.gameSpeed) / GameConfig.gameplay.DAY_DURATION_SECONDS;
    this.dayProgress = Math.min(1, this.dayProgress + step);

    this.bus.emit('day:tick', { progress: this.dayProgress, company });

    if (this.dayProgress >= 1 && !this._dayEnding) {
      this._dayEnding = true;
      this._endDay(company);
    }
  }

  /**
   * Immediately advance to end-of-day (used by the "End Day" button).
   * @param {import('../state/Company.js').Company} company
   */
  fastForward(company) {
    if (this._dayEnding) return;
    this.dayProgress = 1;
    this._dayEnding = true;
    this._endDay(company);
  }

  /** Called by Simulation after all end-of-day handlers run to begin next day. */
  beginNextDay(company) {
    company.day += 1;
    this.dayProgress = 0;
    this.gameSpeed = 0; // auto-pause so player can plan
    this._dayEnding = false;
    this.bus.emit('day:began', { day: company.day, company });
  }

  _endDay(company) {
    this.bus.emit('day:ended', { day: company.day, company });
  }
}
