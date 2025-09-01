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
  ListItemText
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Modal } from '../Modal/Modal';

interface TagManagerProps {
  tags: Tag[];
  categories: TagCategory[];
  onAddCategory: (category: { name: string; description?: string; color?: string; dataType?: string }) => Promise<TagCategory | null>;
  onClose: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  categories,
  onAddCategory,
  onClose
}) => {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  };

  return (
    <>
      <List>
        <ListItem>
          <Typography variant="h6">Categories ({categories.length})</Typography>
          <Button onClick={() => setOpen(true)} startIcon={<AddIcon />}>
            Add
          </Button>
        </ListItem>
        
        {categories.map(category => (
          <ListItem key={category.id}>
            <ListItemText 
              primary={category.name}
              secondary={category.description}
            />
          </ListItem>
        ))}
      </List>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Category"
        onSave={handleAdd}
        saveDisabled={!formData.name.trim()}
      >
        <TextField
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          fullWidth
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Data Type</InputLabel>
          <Select
            value={formData.dataType}
            onChange={(e) => setFormData({...formData, dataType: e.target.value})}
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="number">Number</MenuItem>
            <MenuItem value="date">Date</MenuItem>
          </Select>
        </FormControl>
      </Modal>
    </>
  );
};
