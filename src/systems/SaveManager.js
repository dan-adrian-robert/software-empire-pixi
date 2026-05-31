/**
 * SaveManager
 *
 * Manages up to SLOT_COUNT save slots backed by localStorage.
 * Each slot stores a day-start checkpoint: full company state, ID counters,
 * format version, and a timestamp. Time state is intentionally excluded —
 * loading always starts at the beginning of the saved day, paused.
 *
 * Storage keys: `software-empire:save:0` … `:4`
 */
import { GameConfig } from '../config.js';
import { peekNextId as empNextId }       from '../state/Employee.js';
import { peekNextId as projNextId }      from '../state/Project.js';
import { peekNextId as candNextId }      from '../state/Candidate.js';
import { peekNextId as offNextId }       from '../state/Office.js';
import { peekNextId as furnitureNextId } from '../state/FurnitureItem.js';

const { SLOT_COUNT, STORAGE_PREFIX } = GameConfig.save;

function _key(index) {
  return `${STORAGE_PREFIX}${index}`;
}

/**
 * Build and persist a checkpoint for the given slot.
 * Should be called at day:began (dayProgress === 0, gameSpeed === 0).
 * @param {number} index    0-based slot index.
 * @param {import('./Simulation.js').Simulation} sim
 * @param {string} [saveName]  Optional player-supplied label shown in the Load UI.
 */
export function saveSlot(index, sim, saveName) {
  if (index < 0 || index >= SLOT_COUNT) return;

  const payload = {
    version: GameConfig.meta.version,
    savedAt: new Date().toISOString(),
    saveName: saveName ?? null,
    company: structuredClone(sim.company),
    nextIds: {
      employee:  empNextId(),
      project:   projNextId(),
      candidate: candNextId(),
      office:    offNextId(),
      furniture: furnitureNextId(),
    },
  };

  try {
    localStorage.setItem(_key(index), JSON.stringify(payload));
  } catch (e) {
    console.warn('[SaveManager] Failed to write slot', index, e);
  }
}

/**
 * Read and validate a slot payload.
 * Returns the parsed payload object, or null if the slot is empty / corrupt.
 * @param {number} index
 * @returns {object | null}
 */
export function loadSlot(index) {
  if (index < 0 || index >= SLOT_COUNT) return null;
  const raw = localStorage.getItem(_key(index));
  if (!raw) return null;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.warn('[SaveManager] Corrupt JSON in slot', index);
    return null;
  }

  if (!_validate(payload)) {
    console.warn('[SaveManager] Invalid payload in slot', index);
    return null;
  }

  return payload;
}

/**
 * Returns lightweight metadata for a slot without fully parsing the save.
 * @param {number} index
 * @returns {{ occupied: boolean, saveName?: string, companyName?: string, day?: number, money?: number, savedAt?: string }}
 */
export function getSlotMeta(index) {
  if (index < 0 || index >= SLOT_COUNT) return { occupied: false };
  const raw = localStorage.getItem(_key(index));
  if (!raw) return { occupied: false };

  try {
    const payload = JSON.parse(raw);
    if (!payload?.company) return { occupied: false };
    return {
      occupied:    true,
      saveName:    payload.saveName ?? null,
      companyName: payload.company.name ?? 'Unknown',
      day:         payload.company.day  ?? 0,
      money:       payload.company.money ?? 0,
      savedAt:     payload.savedAt ?? null,
    };
  } catch {
    return { occupied: false };
  }
}

/**
 * Delete a slot from localStorage.
 * @param {number} index
 */
export function deleteSlot(index) {
  if (index < 0 || index >= SLOT_COUNT) return;
  localStorage.removeItem(_key(index));
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function _validate(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.version !== GameConfig.meta.version) return false;
  if (!payload.company || typeof payload.company !== 'object') return false;
  if (!payload.nextIds || typeof payload.nextIds !== 'object') return false;
  const { employee, project, candidate, office } = payload.nextIds;
  if (typeof employee !== 'number' || typeof project !== 'number'
    || typeof candidate !== 'number' || typeof office !== 'number') return false;
  // furniture counter is optional (added later; defaults gracefully in syncIdCounters)
  return true;
}
