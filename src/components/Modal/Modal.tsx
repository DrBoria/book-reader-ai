import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  onSave,
  saveDisabled,
  saveLoading
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>{children}</DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      {onSave && (
        <Button 
          onClick={onSave} 
          disabled={saveDisabled || saveLoading}
          variant="contained"
        >
          {saveLoading ? 'Saving...' : 'Save'}
        </Button>
      )}
    </DialogActions>
  </Dialog>
);