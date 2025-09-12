import React, { useState, useEffect } from 'react';
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
import { Modal } from './Modal';
import { TagCategory } from '../../types';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCategory: (categoryId: string, categoryData: {
    name: string;
    description?: string;
    color?: string;
    dataType?: 'text' | 'date' | 'number';
  }) => Promise<void>;
  category: TagCategory | null;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  onClose,
  onUpdateCategory,
  category,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [dataType, setDataType] = useState<'text' | 'date' | 'number'>('text');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setColor(category.color || '#3B82F6');
      const mappedDataType = category.dataType === 'string' ? 'text' : category.dataType;
      setDataType(mappedDataType as 'text' | 'date' | 'number' || 'text');
    }
  }, [category]);

  const handleSubmit = async () => {
    if (!name.trim() || !category) return;

    setIsLoading(true);
    try {
      await onUpdateCategory(category.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        dataType,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Edit Category"
      onSubmit={handleSubmit}
      disabled={isLoading || !name.trim()}
      isLoading={isLoading}
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