import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';

/** Red inline link used in auth-page footers. */
export function AuthLink({ to, children }: { to: string; children: string }) {
  return (
    <Link component={RouterLink} to={to} fontWeight={600} underline="hover">
      {children}
    </Link>
  );
}
