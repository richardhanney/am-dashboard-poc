import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
export type OverviewCapture = {
  customer: string;
  from: string;
  to: string;
  audience: string;
  asOf: string;
  generatedAt: string;
  cards: Array<{
    id: string;
    title: string;
    definition: string;
    wide: boolean;
    content: ReactNode;
  }>;
};
export default function OverviewReport({
  capture,
  onClose,
}: {
  capture: OverviewCapture | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(capture)}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      className="overview-report-dialog"
      aria-labelledby="overview-report-title"
    >
      <DialogTitle id="overview-report-title">Overview report</DialogTitle>
      <DialogContent>
        {capture && (
          <div className="overview-report-page">
            <Typography className="report-classification" variant="caption" component="p">
              FICTIONAL UX PROTOTYPE · No real customer data
            </Typography>
            <Typography component="h1" variant="h2">
              {capture.customer}
            </Typography>
            <Typography>
              {capture.from} — {capture.to} UTC · {capture.audience}
            </Typography>
            <Typography variant="caption">
              Data as of {capture.asOf} · report generated {capture.generatedAt} ·{' '}
              {capture.cards.length} selected cards
            </Typography>
            <Alert severity="info">
              Includes the selected Overview cards in order, using the global customer/date/audience
              scope. Current account/configuration cards retain their account-wide scope. Table
              previews contain the first 10 rows; local card searches, map selections and pagination
              are not included.
            </Alert>
            <Typography variant="caption" component="p" sx={{ mb: 2 }}>
              Commercial 365-day active-user definition to be validated separately.
            </Typography>
            <div className="overview-report-cards">
              {capture.cards.map((card) => (
                <Paper
                  component="section"
                  key={card.id}
                  variant="outlined"
                  className={card.wide ? 'report-card report-card-wide' : 'report-card'}
                >
                  <Typography component="h2" variant="h6">
                    {card.title}
                  </Typography>
                  <Typography variant="caption" component="p">
                    {card.definition}
                  </Typography>
                  {card.content}
                </Paper>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
      <DialogActions className="report-print-controls">
        <Button onClick={onClose}>Close report</Button>
        <Button variant="contained" onClick={() => window.print()}>
          Print / save PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
