/**
 * Events
 *
 * Lightweight event emitter for UI-layer cross-component communication.
 * No npm dependencies — just a simple map of event name → listener array.
 *
 * Usage:
 *   import { uiEvents } from './Events.js';
 *
 *   // In a widget:
 *   uiEvents.emit('tabChanged', { tab: 'COMMUNICATION' });
 *
 *   // In a screen:
 *   uiEvents.on('tabChanged', ({ tab }) => this._switchTab(tab));
 *   // Later:
 *   uiEvents.off('tabChanged', handler);
 */

export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} Unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }

  /**
   * Emit an event with an optional payload.
   * @param {string} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  /**
   * Remove all listeners for a given event, or all events if omitted.
   * @param {string} [event]
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

/** Shared UI event bus. Widgets emit, screens/shells subscribe. */
export const uiEvents = new EventEmitter();
