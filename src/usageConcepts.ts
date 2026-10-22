import { addDays, addHours } from 'date-fns';
import { dateAt, inRange, type Customer, type Range } from './data';

// Independent fabricated audit sources. These are never inferred from an SOS,
// check-in, provider configuration or a presumed installation.
export function usageConcepts(customer: Customer, range: Range, asOf: string) {
  const people = customer.users.filter((user) => user.enabled).slice(0, 120);
  const count = customer.id === 'globex' ? 64 : customer.id === 'northstar' ? 16 : 40;
  const stamp = (index: number) => `${dateAt((index * 7) % 365)}T11:30:00.000Z`;
  const calls = Array.from({ length: count }, (_, index) => {
    const user = people[index % people.length];
    return {
      id: `${customer.id}-call-action-${index}`,
      userId: user.id,
      traveller: user.name,
      email: user.email,
      time: stamp(index),
      action: 'App call button pressed',
      source: 'Fictional app call audit',
      outcome: 'Answer/outcome not recorded',
    };
  }).filter((record) => inRange(record.time, range) && record.time <= asOf);
  const messages = Array.from({ length: count * 3 }, (_, index) => {
    const sender = people[index % people.length];
    return {
      id: `${customer.id}-message-${index}`,
      sender: sender.name,
      email: sender.email,
      time: stamp(index),
      channel: index % 2 ? 'Chat' : 'SMS',
      recipients: 2 + (index % 4),
      source: 'Fictional message audit',
    };
  }).filter((record) => inRange(record.time, range) && record.time <= asOf);
  const tickets = Array.from({ length: Math.ceil(count / 2) }, (_, index) => {
    const user = people[index % people.length];
    return {
      id: `${customer.id}-support-${index}`,
      reference: `DEMO-${customer.initials}-${index + 1}`,
      traveller: user.name,
      email: user.email,
      time: stamp(index),
      tier: ['Tier 1', 'Tier 2', 'Tier 3'][index % 3],
      category: ['Security', 'Medical', 'Intelligence', 'Platform', 'Other'][index % 5],
      status: index % 3 ? 'Open' : 'Resolved (mock case)',
      source: index % 2 ? 'Mock Ops register' : 'Mock support-ticket register',
    };
  }).filter((record) => inRange(record.time, range) && record.time <= asOf);
  const preferences = customer.users.map((user, index) => {
    const eligible = user.enabled && user.mobile;
    const enabled = eligible && index % 3 !== 0;
    const candidate = `${dateAt(index % 90)}T10:15:00.000Z`;
    const observation =
      enabled && index % 5 === 0 && candidate >= user.createdAt && candidate <= asOf
        ? candidate
        : null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      eligible,
      enabled,
      lastObservation: observation,
      reportingInPeriod: !!observation && inRange(observation, range),
      source: 'Fictional preference and location-observation records',
    };
  });
  const welcomes = customer.users.flatMap((user) => {
    const time = addHours(new Date(`${user.createdAt.replace(/Z$/, '')}Z`), 6).toISOString();
    if (!inRange(time, range) || time > asOf) return [];
    const end = addDays(new Date(time), 30).toISOString();
    const engagement = customer.activities
      .filter(
        (activity) =>
          activity.userId === user.id &&
          activity.date >= time &&
          activity.date <= end &&
          activity.date <= asOf,
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return [
      {
        id: `${user.id}-welcome`,
        userId: user.id,
        name: user.name,
        email: user.email,
        time,
        firstEngagement: engagement?.date || null,
        engagementSource: engagement?.source || 'No recorded evidence',
        outcome: engagement
          ? 'Subsequent engagement recorded'
          : end > asOf
            ? 'Follow-up window open'
            : 'No follow-up evidence in 30 days',
        source: 'Fictional welcome-email send audit; delivery not inferred',
      },
    ];
  });
  return {
    calls,
    messages,
    tickets,
    preferences,
    welcomes,
    locationEnabled: preferences.filter((record) => record.enabled),
    reporters: preferences.filter((record) => record.reportingInPeriod),
    welcomeEngaged: welcomes.filter((record) => record.firstEngagement),
    messageSends: messages.reduce((sum, message) => sum + message.recipients, 0),
  };
}
