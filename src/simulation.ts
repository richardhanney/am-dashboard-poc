import { addDays, addMinutes } from 'date-fns';
import { customers, type Customer } from './data';

export type DemoEvent = { id: string; customerId: string; time: string; text: string };
export type Simulation = {
  customers: Customer[];
  now: string;
  revision: number;
  ticks: Record<string, number>;
  events: DemoEvent[];
};
export const initialSimulation = (): Simulation => ({
  customers,
  now: '2026-10-07T18:00:00.000Z',
  revision: 0,
  ticks: {},
  events: [],
});
export const demoClock = (now: string) => `${now.slice(0, 16).replace('T', ' ')} UTC`;

// One immutable update supplies every card, chart, map, receipt and export.
// Advancing demo time never contacts a service or modifies the baseline fixtures.
export function advanceSimulation(state: Simulation, customerId: string): Simulation {
  const source = state.customers.find((customer) => customer.id === customerId);
  if (!source) return state;
  const tick = state.ticks[customerId] || 0;
  const now = addMinutes(new Date(state.now), 5).toISOString();
  const id = `${customerId}-demo-${tick + 1}`;
  const next = { ...source };
  const user = source.users.at(-1)!;
  const trip = source.trips[tick % source.trips.length];
  let text: string;
  switch (tick % 8) {
    case 0: {
      const created = {
        id,
        name: `Avery Demo ${tick + 1}`,
        email: `demo.${customerId}.${tick + 1}@example.com`,
        group: 'Travellers',
        enabled: true,
        mobile: true,
        registeredFrom: now,
        createdAt: now,
        creationSource: 'HR import',
      };
      next.users = [...source.users, created];
      next.activities = [
        ...source.activities,
        { id: `${id}-activity`, userId: id, date: now, source: 'Mobile session', platform: 'iOS' },
      ];
      text = `${created.name} · profile created and iOS engagement recorded`;
      break;
    }
    case 1: {
      const engaged =
        source.users.find(
          (u) =>
            u.enabled &&
            !source.activities.some(
              (a) => a.userId === u.id && a.date.slice(0, 10) === now.slice(0, 10),
            ),
        ) || user;
      next.activities = [
        ...source.activities,
        { id, userId: engaged.id, date: now, source: 'Web sign-in', platform: 'Web' },
      ];
      text = `${engaged.name} · portal engagement recorded`;
      break;
    }
    case 2: {
      const journey = {
        ...trip,
        id,
        userId: user.id,
        traveller: user.name,
        booking: `DEMO-${customerId.toUpperCase()}-${tick + 1}`,
        start: now.slice(0, 10),
        end: addDays(new Date(now), 3).toISOString().slice(0, 10),
        origin: trip.destination === 'Singapore' ? 'Paris' : 'Singapore',
      };
      next.trips = [...source.trips, journey];
      next.ingestions = [
        ...source.ingestions,
        {
          id: `${id}-feed`,
          time: now,
          provider: journey.provider,
          booking: journey.booking,
          status: 'Accepted',
        },
      ];
      next.integrations = source.integrations.map((integration) =>
        integration.provider === journey.provider ? { ...integration, lastUsed: now } : integration,
      );
      text = `${journey.origin} → ${journey.destination} · itinerary and feed receipt recorded`;
      break;
    }
    case 3:
      next.checkins = [
        ...source.checkins,
        {
          id,
          userId: user.id,
          traveller: user.name,
          requested: now,
          completed: null,
          status: 'Pending',
          location: trip.destination,
        },
      ];
      text = `${user.name} · check-in request sent`;
      break;
    case 4: {
      const pending = [...source.checkins]
        .reverse()
        .find(
          (check) =>
            check.status === 'Pending' && check.requested.slice(0, 10) === now.slice(0, 10),
        );
      if (pending)
        next.checkins = source.checkins.map((check) =>
          check.id === pending.id ? { ...check, status: 'Completed', completed: now } : check,
        );
      next.receivedCheckins = [
        ...source.receivedCheckins,
        {
          id,
          userId: pending?.userId || user.id,
          traveller: pending?.traveller || user.name,
          time: now,
          location: pending?.location || trip.destination,
          requestId: pending?.id || null,
          source: pending ? 'Scheduled response' : 'Traveller-initiated',
        },
      ];
      text = `${pending?.traveller || user.name} · check-in received${pending ? ' and request completed' : ''}`;
      break;
    }
    case 5:
      next.alerts = [
        ...source.alerts,
        {
          id,
          alert: `Travel advisory · ${trip.destination}`,
          risk: trip.risk,
          type: 'Travel briefing',
          recipients: source.users
            .filter((u) => u.enabled)
            .slice(-3)
            .map((u) => u.id),
          date: now,
          location: trip.destination,
          channel: 'Email',
          targeting: 'Itinerary destination',
        },
      ];
      text = `Travel advisory · 3 recorded recipient sends · delivery not inferred`;
      break;
    case 6:
      next.ingestions = [
        ...source.ingestions,
        { id, time: now, provider: trip.provider, booking: trip.booking, status: 'Accepted' },
      ];
      text = `${trip.provider} · PNR update accepted for ${trip.booking}`;
      break;
    default:
      next.sos = [
        ...source.sos,
        {
          id,
          userId: user.id,
          traveller: user.name,
          time: now,
          location: trip.destination,
          status: 'Acknowledged',
          acknowledgement: 'Fictional assistance acknowledgement; no case outcome inferred',
        },
      ];
      text = `${user.name} · fictional SOS record acknowledged`;
  }
  return {
    ...state,
    now,
    revision: state.revision + 1,
    customers: state.customers.map((customer) => (customer.id === customerId ? next : customer)),
    ticks: { ...state.ticks, [customerId]: tick + 1 },
    events: [{ id, customerId, time: now, text }, ...state.events].slice(0, 32),
  };
}
