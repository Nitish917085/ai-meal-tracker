import { useState } from 'react';
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { MealInput } from '../api/meals';
import { MealForm } from './MealForm';
import { ApiError } from '../api/client';

export interface MealFormDialogProps {
  open: boolean;
  title: string;
  /** Initial values (macros + micros included). Omit for a blank form. */
  initial?: MealInput | null;
  /** Stable key so the form resets when a different entry is opened. */
  formKey?: string | number;
  submitLabel?: string;
  onClose: () => void;
  /** Called on save with the full edited entry; resolve to close, throw to show an error. */
  onSubmit: (input: MealInput) => void | Promise<void>;
}

/**
 * Reusable meal editor dialog: renders the shared `MealForm` and delegates the
 * save action to the caller via `onSubmit`. On success it closes itself; on
 * failure it surfaces the error inline. Use it anywhere an entry (or a draft
 * import row) needs editing — the parent owns what "save" means.
 */
export function MealFormDialog({
  open,
  title,
  initial = null,
  formKey,
  submitLabel = 'Save entry',
  onClose,
  onSubmit,
}: MealFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: MealInput) => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(input);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      scroll="paper"
      PaperProps={{ sx: { maxWidth: 720 } }}
      TransitionProps={{ onExited: () => setError(null) }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        {title}
        <IconButton onClick={onClose} aria-label="Close" disabled={submitting}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {open && (
          <MealForm
            key={formKey ?? (initial ? 'edit' : 'new')}
            initial={initial ?? undefined}
            submitLabel={submitLabel}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={fullScreen ? undefined : onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
