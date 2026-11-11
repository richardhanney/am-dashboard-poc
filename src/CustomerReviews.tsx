import { useState } from 'react';
import {
  Alert,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { format, isValid, parseISO } from 'date-fns';
import type { Customer } from './data';
import {
  addReviewMonths,
  completeReview,
  normaliseReview,
  reviewCounts,
  reviewStatus,
  validInterval,
  validReviewDate,
  type ReviewSchedule,
} from './reviews';
import DashboardRecords from './DashboardRecords';
const dateLabel = (date?: string | null) =>
  date ? format(parseISO(date), 'dd MMM yyyy') : 'Not scheduled';
const dateString = (date: Date | null) =>
  date && isValid(date) ? format(date, 'yyyy-MM-dd') : null;
const colour = (status: string) =>
  status === 'Overdue' ? 'warning' : status === 'Due today' ? 'info' : 'default';
function ReviewDate({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  onError,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  minDate?: string;
  maxDate?: string;
  onError?: (error: boolean) => void;
}) {
  return (
    <DesktopDatePicker
      label={label}
      value={value ? parseISO(value) : null}
      onChange={(date) => {
        const value = dateString(date);
        if (date === null || validReviewDate(value)) onChange(value);
      }}
      onError={(error) => onError?.(!!error)}
      minDate={parseISO(minDate || '2000-01-01')}
      maxDate={parseISO(maxDate || '9998-12-31')}
      format="dd/MM/yyyy"
      enableAccessibleFieldDOMStructure={false}
      slotProps={{ textField: { size: 'small', fullWidth: true } }}
    />
  );
}
export function CustomerReview({
  customer,
  review,
  today,
  onChange,
}: {
  customer: Customer;
  review: ReviewSchedule;
  today: string;
  onChange: (review: ReviewSchedule) => void;
}) {
  const [mode, setMode] = useState<'schedule' | 'complete' | null>(null);
  const [nextDate, setNextDate] = useState<string | null>(review.nextDate);
  const [interval, setInterval] = useState(String(review.intervalMonths));
  const [completedOn, setCompletedOn] = useState<string | null>(today);
  const [dateError, setDateError] = useState(false);
  const [cleared, setCleared] = useState(false);
  const status = reviewStatus(review, today),
    last = review.history.at(-1)?.completedOn;
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const open = (value: 'schedule' | 'complete') => {
    setDateError(false);
    setCleared(false);
    setInterval(String(review.intervalMonths));
    setCompletedOn(today);
    setNextDate(
      value === 'complete' ? addReviewMonths(today, review.intervalMonths) : review.nextDate,
    );
    setMode(value);
  };
  let completion: ReviewSchedule | null = null;
  try {
    if (completedOn && nextDate) completion = completeReview(review, completedOn, nextDate, today);
  } catch {
    /* Validation is shown beside the controls. */
  }
  const valid =
    !dateError &&
    validInterval(Number(interval)) &&
    (mode === 'schedule'
      ? nextDate
        ? !last || nextDate > last
        : cleared || !review.nextDate
      : !!completion);
  return (
    <Paper
      component="section"
      variant="outlined"
      className="customer-review-panel"
      aria-label={`Account reviews for ${customer.name}`}
    >
      <div className="review-schedule-summary">
        <EventAvailableOutlinedIcon color="action" />
        <div>
          <Typography component="h2" variant="h6">
            Account review
          </Typography>
          <Typography variant="body2">
            <strong>Next review: {dateLabel(review.nextDate)}</strong> · Every{' '}
            {review.intervalMonths} {review.intervalMonths === 1 ? 'month' : 'months'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {last ? `Last completed ${dateLabel(last)}` : 'No completed review recorded'} · Dates
            use today (UTC), independently of reporting filters
          </Typography>
        </div>
        <Chip size="small" color={colour(status)} label={status} />
      </div>
      <div className="review-actions">
        <Button variant="outlined" size="small" onClick={() => open('schedule')}>
          Edit review schedule
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => open('complete')}
          disabled={!!last && last >= today}
        >
          Mark review complete
        </Button>
      </div>
      <Dialog
        open={mode !== null}
        onClose={() => setMode(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="review-dialog-title"
      >
        <DialogTitle id="review-dialog-title">
          {mode === 'complete' ? 'Complete account review' : 'Review schedule'} · {customer.name}
        </DialogTitle>
        <DialogContent>
          <div className="review-form">
            <Typography variant="body2">
              {mode === 'complete'
                ? 'Acknowledge the completed review and confirm the next review date. The suggested date uses your review interval from the completion date.'
                : 'Choose the next review date and the interval used to suggest future reviews. Clear the date to leave this customer unscheduled.'}
            </Typography>
            <TextField
              size="small"
              label="Review interval (months)"
              type="number"
              value={interval}
              error={!validInterval(Number(interval))}
              helperText="1–24 months"
              slotProps={{ htmlInput: { min: 1, max: 24, step: 1 } }}
              onChange={(e) => {
                const value = e.target.value;
                setInterval(value);
                if (mode === 'complete' && completedOn && validInterval(Number(value)))
                  setNextDate(addReviewMonths(completedOn, Number(value)));
              }}
            />
            {mode === 'complete' && (
              <ReviewDate
                label="Completed on (UTC)"
                value={completedOn}
                maxDate={today}
                minDate={
                  last
                    ? new Date(Date.parse(`${last}T00:00:00Z`) + 86400000)
                        .toISOString()
                        .slice(0, 10)
                    : undefined
                }
                onChange={(date) => {
                  setCompletedOn(date);
                  if (date && validInterval(Number(interval)))
                    setNextDate(addReviewMonths(date, Number(interval)));
                }}
              />
            )}
            <ReviewDate
              label="Next review date (UTC)"
              onError={setDateError}
              value={nextDate}
              minDate={
                mode === 'complete'
                  ? tomorrow
                  : last
                    ? new Date(Date.parse(`${last}T00:00:00Z`) + 86400000)
                        .toISOString()
                        .slice(0, 10)
                    : undefined
              }
              onChange={(date) => {
                setNextDate(date);
                setCleared(false);
              }}
            />
            {mode === 'complete' && !completion && (
              <Alert severity="info">
                Choose a completion date up to today, after the last recorded review, and a next
                review date after today.
              </Alert>
            )}
            {mode === 'schedule' && !nextDate && !cleared && review.nextDate && (
              <Typography variant="caption" color="error">
                Choose a valid date or use Clear next review date to leave this customer
                unscheduled.
              </Typography>
            )}
            {mode === 'schedule' && (
              <Button
                size="small"
                onClick={() => {
                  setNextDate(null);
                  setCleared(true);
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear next review date
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              Schedules and completion history are saved in this browser only; they are not shared
              with other account managers.
            </Typography>
            {review.history.length > 0 && (
              <div>
                <Typography component="h3" variant="subtitle2">
                  Review history ({review.history.length})
                </Typography>
                <ul className="review-history">
                  {[...review.history].reverse().map((entry) => (
                    <li key={entry.completedOn}>
                      Completed {dateLabel(entry.completedOn)} · Next review set to{' '}
                      {dateLabel(entry.nextDate)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMode(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!valid}
            onClick={() => {
              onChange(
                mode === 'complete' && completion
                  ? { ...completion, intervalMonths: Number(interval) }
                  : { ...review, nextDate, intervalMonths: Number(interval) },
              );
              setMode(null);
            }}
          >
            {mode === 'complete' ? 'Confirm review completed' : 'Save review schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
export function PortfolioReviews({
  customers,
  reviews,
  today,
  onSelect,
}: {
  customers: Customer[];
  reviews: Record<string, ReviewSchedule>;
  today: string;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState('outstanding');
  const counts = reviewCounts(
    customers.map((c) => reviews[c.id]),
    today,
  );
  const month = today.slice(0, 7),
    nextMonth = addReviewMonths(`${month}-01`, 1).slice(0, 7);
  const groups = [
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'thisMonth', label: 'Due this month', count: counts.thisMonth },
    { id: 'nextMonth', label: 'Due next month', count: counts.nextMonth },
    { id: 'unscheduled', label: 'Not scheduled', count: counts.unscheduled },
    { id: 'completed', label: 'Reviewed this month', count: counts.completed },
  ];
  const rows = customers
    .flatMap((customer) => {
      const r = reviews[customer.id] || normaliseReview(null),
        status = reviewStatus(r, today);
      const completedThisMonth = r.history.some((h) => h.completedOn.startsWith(month));
      const match =
        filter === 'all' ||
        (filter === 'outstanding' &&
          (!r.nextDate || r.nextDate.startsWith(month) || r.nextDate < today)) ||
        (filter === 'overdue' && status === 'Overdue') ||
        (filter === 'thisMonth' &&
          !!r.nextDate &&
          r.nextDate >= today &&
          r.nextDate.startsWith(month)) ||
        (filter === 'nextMonth' && r.nextDate?.startsWith(nextMonth)) ||
        (filter === 'unscheduled' && !r.nextDate) ||
        (filter === 'completed' && completedThisMonth);
      return match
        ? [
            {
              id: customer.id,
              name: customer.name,
              nextDate: r.nextDate,
              date: dateLabel(r.nextDate),
              status,
              interval: `Every ${r.intervalMonths} months`,
              last: dateLabel(r.history.at(-1)?.completedOn).replace(
                'Not scheduled',
                'No review recorded',
              ),
            },
          ]
        : [];
    })
    .sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999'));
  return (
    <Paper
      component="section"
      variant="outlined"
      className="portfolio-reviews"
      aria-labelledby="portfolio-reviews-title"
    >
      <Typography component="h3" variant="h5" id="portfolio-reviews-title">
        Customer reviews
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Plan account reviews across your customers. As of {dateLabel(today)} UTC · independent of
        reporting dates and audience filters · saved in this browser.
      </Typography>
      <div className="review-counts">
        {groups.map((group) => (
          <ButtonBase
            className="review-count"
            key={group.id}
            aria-pressed={filter === group.id}
            onClick={() => setFilter(group.id)}
          >
            <Typography component="span" variant="h5">
              {group.count}
            </Typography>
            <Typography component="span" variant="body2">
              {group.label}
            </Typography>
          </ButtonBase>
        ))}
      </div>
      <TextField
        select
        size="small"
        label="Show reviews"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ width: 280, maxWidth: '100%' }}
      >
        <MenuItem value="outstanding">Needs attention</MenuItem>
        {groups.map((group) => (
          <MenuItem key={group.id} value={group.id}>
            {group.label}
          </MenuItem>
        ))}
        <MenuItem value="all">All customers</MenuItem>
      </TextField>
      <Typography variant="caption">
        Needs attention includes overdue, due this month and unscheduled customers. Due this month
        counts today through month end; overdue reviews are counted separately. Reviewed this month
        counts customers with a completion, regardless of their next due date. Select a customer to
        manage its schedule.
      </Typography>
      <DashboardRecords
        title="Customer review schedule"
        toolbar={false}
        rows={rows}
        onRow={(row) => onSelect(String(row.id))}
        columns={[
          { field: 'name', headerName: 'Customer' },
          { field: 'date', headerName: 'Next review' },
          { field: 'status', headerName: 'Review status' },
          { field: 'interval', headerName: 'Interval' },
          { field: 'last', headerName: 'Last completed' },
        ]}
      />
    </Paper>
  );
}
