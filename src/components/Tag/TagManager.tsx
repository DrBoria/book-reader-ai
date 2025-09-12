import React, { useState } from "react";
import { Tag, TagCategory } from "../../types";
import {
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Modal } from '../Modal/Modal';
import { EditCategoryModal } from '../Modal/EditCategoryModal';

interface TagManagerProps {
  tags: Tag[];
  categories: TagCategory[];
  onAddCategory: (category: { name: string; description?: string; color?: string; dataType?: string }) => Promise<TagCategory | null>;
  onUpdateCategory: (categoryId: string, category: { name: string; description?: string; color?: string; dataType?: string }) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onClose: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onClose
}) => {
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<TagCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    dataType: 'text'
  });

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    
    await onAddCategory(formData);
    setFormData({ name: '', description: '', color: '#3B82F6', dataType: 'text' });
    setOpenAdd(false);
  };

  const handleEdit = (category: TagCategory) => {
    setEditingCategory(category);
    setOpenEdit(true);
  };

  const handleDelete = (categoryId: string) => {
    setOpenDelete(categoryId);
  };

  const handleConfirmDelete = async () => {
    if (openDelete) {
      await onDeleteCategory(openDelete);
      setOpenDelete(null);
    }
  };

  return (
    <>
      <List>
        <ListItem>
          <Typography variant="h6" gutterBottom>Categories ({categories.length})</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenAdd(true)}
            fullWidth
            sx={{ mb: 2 }}
          >
            Add Category
          </Button>
        </ListItem>
        
        {categories.map(category => (
          <ListItem 
            key={category.id}
            secondaryAction={
              <>
                <IconButton 
                  edge="end" 
                  onClick={() => handleEdit(category)}
                  aria-label="edit"
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  edge="end" 
                  onClick={() => handleDelete(category.id)}
                  aria-label="delete"
                >
                  <DeleteIcon />
                </IconButton>
              </>
            }
          >
            <ListItemText 
              primary={category.name}
              secondary={category.description || 'No description'}
            />
          </ListItem>
        ))}
      </List>

      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Add Category"
        onSubmit={handleAdd}
        submitText="Add"
        submitButtonColor="primary"
      >
        <Stack spacing={3}>
          <TextField
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
            inputProps={{ maxLength: 500 }}
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
            inputProps={{ maxLength: 1500 }}
          />
          <FormControl fullWidth>
            <InputLabel>Data Type</InputLabel>
            <Select
              value={formData.dataType}
              onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
              label="Data Type"
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="number">Number</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Modal>

      <EditCategoryModal
        isOpen={openEdit}
        onClose={() => setOpenEdit(false)}
        onUpdateCategory={onUpdateCategory}
        category={editingCategory}
      />

      <Modal
        open={openDelete !== null}
        onClose={() => setOpenDelete(null)}
        title="Delete Category"
        onSubmit={handleConfirmDelete}
        submitText="Delete"
        submitButtonColor="error"
      >
        <Typography>
          Are you sure you want to delete this category? This action cannot be undone.
        </Typography>
      </Modal>
    </>
  );
};
