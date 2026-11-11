export type ReviewCompletion = { completedOn: string; nextDate: string };
export type ReviewSchedule = {
  nextDate: string | null;
  intervalMonths: number;
  history: ReviewCompletion[];
};
export type ReviewStatus = 'Overdue' | 'Due today' | 'Scheduled' | 'Not scheduled';
export const reviewStorageKey = 'hula-customer-reviews-v1';
export const utcToday = () => new Date().toISOString().slice(0, 10);
export const validReviewDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value >= '2000-01-01' &&
  value <= '9998-12-31' &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const validInterval = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 24;
export function addReviewMonths(date: string, months: number): string {
  if (!validReviewDate(date) || !Number.isInteger(months)) throw new Error('Invalid review date');
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}
export function normaliseReview(value: unknown): ReviewSchedule {
  const p = (value && typeof value === 'object' ? value : {}) as Partial<ReviewSchedule>;
  const history = Array.isArray(p.history)
    ? p.history
        .filter(
          (h): h is ReviewCompletion =>
            !!h &&
            validReviewDate(h.completedOn) &&
            validReviewDate(h.nextDate) &&
            h.nextDate > h.completedOn,
        )
        .map(({ completedOn, nextDate }) => ({ completedOn, nextDate }))
        .sort((a, b) => a.completedOn.localeCompare(b.completedOn))
        .filter((h, i, all) => i === 0 || h.completedOn !== all[i - 1].completedOn)
    : [];
  return {
    nextDate: validReviewDate(p.nextDate) ? p.nextDate : null,
    intervalMonths:
      typeof p.intervalMonths === 'number' && validInterval(p.intervalMonths)
        ? p.intervalMonths
        : 3,
    history,
  };
}
export const reviewStatus = (review: ReviewSchedule | undefined, today: string): ReviewStatus =>
  !review?.nextDate
    ? 'Not scheduled'
    : review.nextDate < today
      ? 'Overdue'
      : review.nextDate === today
        ? 'Due today'
        : 'Scheduled';
export function completeReview(
  review: ReviewSchedule,
  completedOn: string,
  nextDate: string,
  today: string,
): ReviewSchedule {
  const previous = review.history.at(-1)?.completedOn;
  if (
    !validReviewDate(completedOn) ||
    !validReviewDate(nextDate) ||
    completedOn > today ||
    nextDate <= today ||
    (previous && completedOn <= previous)
  )
    throw new Error(
      'Choose a valid completion date after the last review and a future next review date.',
    );
  return { ...review, nextDate, history: [...review.history, { completedOn, nextDate }] };
}
export function reviewCounts(reviews: Array<ReviewSchedule | undefined>, today: string) {
  const month = today.slice(0, 7),
    nextMonth = addReviewMonths(`${month}-01`, 1).slice(0, 7);
  return {
    overdue: reviews.filter((r) => reviewStatus(r, today) === 'Overdue').length,
    thisMonth: reviews.filter(
      (r) => r?.nextDate && r.nextDate >= today && r.nextDate.startsWith(month),
    ).length,
    nextMonth: reviews.filter((r) => r?.nextDate?.startsWith(nextMonth)).length,
    unscheduled: reviews.filter((r) => !r?.nextDate).length,
    completed: reviews.filter((r) => r?.history.some((h) => h.completedOn.startsWith(month)))
      .length,
  };
}
export function readReviews(today = utcToday()): Record<string, ReviewSchedule> {
  const base = (nextDate: string, intervalMonths: number): ReviewSchedule => ({
    nextDate,
    intervalMonths,
    history: [],
  });
  const monthStart = `${today.slice(0, 7)}-01`;
  const defaults = {
    acme: base(
      new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10),
      3,
    ),
    globex: base(`${addReviewMonths(monthStart, 1).slice(0, 7)}-15`, 6),
    northstar: base(
      new Date(Date.parse(`${today}T00:00:00Z`) - 10 * 86400000).toISOString().slice(0, 10),
      3,
    ),
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(reviewStorageKey) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
    return {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(parsed).map(([id, value]) => [id, normaliseReview(value)]),
      ),
    };
  } catch {
    return defaults;
  }
}
