import {
  defaultWidgets,
  health,
  loadWidgets,
  normaliseWidgets,
  validThreshold,
} from './dashboardModel';
import type { Customer } from './data';
export type HealthPolicy = {
  engagement: boolean;
  threshold: number;
  allocation: boolean;
  manualUnhealthy: boolean;
  reason: string;
};
export const defaultPolicy = (): HealthPolicy => ({
  engagement: true,
  threshold: 50,
  allocation: false,
  manualUnhealthy: false,
  reason: '',
});
export function normalisePolicy(value: unknown): HealthPolicy {
  if (!value || typeof value !== 'object') return defaultPolicy();
  const p = value as Partial<HealthPolicy>;
  return {
    engagement: typeof p.engagement === 'boolean' ? p.engagement : true,
    threshold:
      typeof p.threshold === 'number' && validThreshold(String(p.threshold)) ? p.threshold : 50,
    allocation: p.allocation === true,
    manualUnhealthy: p.manualUnhealthy === true,
    reason: typeof p.reason === 'string' ? p.reason.slice(0, 240) : '',
  };
}
export function reviewHealth(
  customer: Customer,
  policy: HealthPolicy,
  limit: number | null = customer.limit,
) {
  const observed = health(customer, policy.threshold);
  const checks: Array<{ name: string; status: 'Pass' | 'Fail' | 'Unknown'; detail: string }> = [];
  if (policy.engagement)
    checks.push({
      name: 'Recorded engagement',
      status:
        observed.rate === null ? 'Unknown' : observed.rate > policy.threshold ? 'Pass' : 'Fail',
      detail:
        observed.rate === null
          ? 'No enabled-account denominator'
          : `${observed.rate.toFixed(1)}% · must be above ${policy.threshold}%`,
    });
  if (policy.allocation)
    checks.push({
      name: 'Configured capacity',
      status: limit === null ? 'Unknown' : observed.enabled > limit ? 'Fail' : 'Pass',
      detail:
        limit === null
          ? 'Configured limit unavailable'
          : `${observed.enabled.toLocaleString()} enabled / ${limit.toLocaleString()} configured`,
    });
  const status =
    policy.manualUnhealthy || checks.some((c) => c.status === 'Fail')
      ? 'Unhealthy'
      : !checks.length || checks.some((c) => c.status === 'Unknown')
        ? 'Not assessable'
        : 'Healthy';
  return {
    ...observed,
    status,
    checks,
    reason: policy.manualUnhealthy
      ? `Manual override: ${policy.reason || 'No reason recorded'}`
      : checks
          .filter((c) => c.status !== 'Pass')
          .map((c) =>
            c.status === 'Unknown'
              ? c.detail
              : c.name === 'Recorded engagement'
                ? 'Recorded engagement is at or below the review threshold.'
                : 'Enabled accounts exceed the configured customer limit.',
          )
          .join(' · ') ||
        (!checks.length ? 'No health checks enabled' : 'All selected checks pass'),
  };
}
export const layoutKey = (customerId: string) => `hula-overview-v3:${customerId}`;
export function readCustomerLayout(customerId: string): string[] {
  try {
    const saved = localStorage.getItem(layoutKey(customerId));
    if (saved !== null) return normaliseWidgets(JSON.parse(saved));
  } catch {
    return [...defaultWidgets];
  }
  return loadWidgets();
}
export function readPolicies(): Record<string, HealthPolicy> {
  try {
    const data = JSON.parse(localStorage.getItem('hula-health-policies-v1') || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data).map(([id, value]) => [id, normalisePolicy(value)]),
    );
  } catch {
    return {};
  }
}
export function readCadences(): Record<string, number | null> {
  try {
    const value = JSON.parse(localStorage.getItem('hula-feed-cadences-v1') || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, hours]) =>
          hours === null ||
          (typeof hours === 'number' && Number.isInteger(hours) && hours >= 1 && hours <= 720),
      ),
    ) as Record<string, number | null>;
  } catch {
    return {};
  }
}
