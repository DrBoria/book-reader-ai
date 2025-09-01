import React, { useState } from 'react';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Stack
} from '@mui/material';
import { Modal } from './common/Modal';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (categoryData: {
    name: string;
    description?: string;
    color?: string;
    dataType?: 'text' | 'date' | 'number';
  }) => Promise<void>;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onAddCategory,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [dataType, setDataType] = useState<'text' | 'date' | 'number'>('text');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onAddCategory({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        dataType,
      });
      onClose();
      setName('');
      setDescription('');
      setColor('#3B82F6');
      setDataType('text');
    } catch (error) {
      console.error('Failed to add category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Add New Category"
      onSave={handleSubmit}
      saveDisabled={isLoading || !name.trim()}
      saveLoading={isLoading}
    >
      <Stack spacing={3}>
        <TextField
          label="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          disabled={isLoading}
          inputProps={{ maxLength: 500 }}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          disabled={isLoading}
          inputProps={{ maxLength: 1500 }}
        />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={isLoading}
            sx={{ width: 80 }}
          />
          <TextField
            label="Hex Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            fullWidth
            disabled={isLoading}
            inputProps={{ pattern: '^#[0-9A-Fa-f]{6}$' }}
          />
        </Box>
        <FormControl fullWidth>
          <InputLabel>Data Type</InputLabel>
          <Select
            value={dataType}
            onChange={(e) => setDataType(e.target.value as 'text' | 'date' | 'number')}
            disabled={isLoading}
            label="Data Type"
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="number">Number</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Modal>
  );
};