import { Button, CircularProgress } from '@mui/material';

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error';
  disabled?: boolean;
  fullWidth?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  ...props
}) => (
  <Button disabled={loading || props.disabled} {...props}>
    {loading ? <CircularProgress size={24} /> : children}
  </Button>
);