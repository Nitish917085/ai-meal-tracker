import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar, type AlertColor } from '@mui/material';

interface Toast {
  message: string;
  severity: AlertColor;
}

interface FeedbackValue {
  /** Show a transient toast. Success/info render black, errors render red. */
  notify: (message: string, severity?: AlertColor) => void;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

/** App-wide toast provider so every page reports success the same way. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((message: string, severity: AlertColor = 'success') => {
    setToast({ message, severity });
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 80, md: 24 } }}
      >
        <Alert
          variant="filled"
          severity={toast?.severity ?? 'success'}
          onClose={() => setToast(null)}
          sx={{ minWidth: 280 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}
