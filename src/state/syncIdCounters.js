/**
 * Helpers to sync module-level ID counters with a save payload.
 * Called by Simulation.loadFromSave() to prevent ID collisions after loading.
 */
import { setNextId as setEmpNextId }       from './Employee.js';
import { setNextId as setProjNextId }      from './Project.js';
import { setNextId as setCandNextId }      from './Candidate.js';
import { setNextId as setOffNextId }       from './Office.js';
import { setNextId as setFurnitureNextId } from './FurnitureItem.js';

/**
 * Restore all ID counters from the `nextIds` block of a save payload.
 * @param {{ employee: number, project: number, candidate: number, office: number, furniture: number }} nextIds
 */
export function syncIdCounters({ employee, project, candidate, office, furniture }) {
  setEmpNextId(employee);
  setProjNextId(project);
  setCandNextId(candidate);
  setOffNextId(office);
  if (typeof furniture === 'number') setFurnitureNextId(furniture);
}
