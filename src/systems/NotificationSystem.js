/**
 * NotificationSystem
 *
 * Listens on the EventBus for `notification:add` events and maintains a
 * capped ring-buffer of recent activity entries.
 * The LiveActivityPanel reads `notifications` directly each frame.
 *
 * Notification shape: { id, text, type, timestamp }
 * type: 'info' | 'success' | 'warning' | 'critical'
 */
import { GameConfig } from '../config.js';

let _nextNotifId = 1;

export class NotificationSystem {
  /** @param {import('../utils/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;

    /** @type {Array<{id:number, text:string, type:string, timestamp:number}>} */
    this.notifications = [];

    /** Callbacks registered for cleanup. */
    this._off = null;
  }

  init() {
    this._off = this.bus.on('notification:add', ({ text, type = 'info' }) => {
      this.notifications.unshift({
        id: _nextNotifId++,
        text,
        type,
        timestamp: Date.now(),
      });
      if (this.notifications.length > GameConfig.gameplay.ACTIVITY_LOG_MAX) {
        this.notifications.length = GameConfig.gameplay.ACTIVITY_LOG_MAX;
      }
    });
  }

  destroy() {
    if (this._off) {
      this._off();
      this._off = null;
    }
  }
}
