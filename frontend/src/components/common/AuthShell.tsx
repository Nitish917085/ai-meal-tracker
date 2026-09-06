import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { BrandMark } from './BrandMark';

/** Centered card layout shared by login, register and password-reset pages. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <BrandMark size={56} sx={{ mx: 'auto', mb: 2 }} />
            <Typography variant="h5">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {children}
          {footer && (
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }} color="text.secondary">
              {footer}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
