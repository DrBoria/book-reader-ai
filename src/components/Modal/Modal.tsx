import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
  showSubmit?: boolean;
  submitButtonVariant?: 'contained' | 'outlined' | 'text';
  submitButtonColor?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  onSubmit,
  disabled,
  isLoading,
  submitText = 'Save',
  cancelText = 'Cancel',
  showSubmit = true,
  submitButtonVariant = 'contained',
  submitButtonColor = 'primary'
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>{children}</DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{cancelText}</Button>
      {showSubmit && onSubmit && (
        <Button 
          onClick={onSubmit} 
          disabled={disabled || isLoading}
          variant={submitButtonVariant}
          color={submitButtonColor}
        >
          {isLoading ? 'Loading...' : submitText}
        </Button>
      )}
    </DialogActions>
  </Dialog>
);