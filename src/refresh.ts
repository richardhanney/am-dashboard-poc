import { SNAPSHOT } from './data';
import { advanceSimulation, initialSimulation, type Simulation } from './simulation';

export type RefreshSnapshot = Simulation & { refreshedAt: Record<string, string> };
export function initialRefreshSnapshot(): RefreshSnapshot {
  const initial = initialSimulation();
  return {
    ...initial,
    refreshedAt: Object.fromEntries(
      initial.customers.map((customer) => [customer.id, initial.now]),
    ),
  };
}

// A local receipt batch advances the selected customers without changing baseline fixtures.
// Keep new events on the selectable snapshot day; historical date cohorts stay historical.
export function refreshSnapshot(state: RefreshSnapshot, customerIds: string[]): RefreshSnapshot {
  const ids = [...new Set(customerIds)].filter((id) => state.customers.some((c) => c.id === id));
  if (!ids.length) return state;
  let next: Simulation = state;
  const refreshedAt = { ...state.refreshedAt };
  const endOfDay = Date.parse(`${SNAPSHOT}T23:59:59.999Z`);
  for (const id of ids) {
    for (let index = 0; index < 8; index++) {
      const at = new Date(Math.min(Date.parse(next.now) + 5 * 60_000, endOfDay)).toISOString();
      next = advanceSimulation(next, id, at);
    }
    refreshedAt[id] = next.now;
  }
  return { ...next, refreshedAt };
}
