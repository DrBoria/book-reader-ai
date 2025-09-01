import React, { useState } from 'react';
import { BookContent } from '../types';
import {
  TextField,
  Button,
  Typography,
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

interface BookActionsProps {
  book: BookContent;
  onUpdate: (bookId: string, updates: { title?: string; author?: string }) => Promise<boolean>;
  onDelete: (bookId: string) => Promise<boolean>;
}

export const BookActions: React.FC<BookActionsProps> = ({
  book,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    const updates: { title?: string; author?: string } = {};
    
    if (title !== book.title) updates.title = title;
    if (author !== book.author) updates.author = author;
    
    if (Object.keys(updates).length > 0) {
      const success = await onUpdate(book.id, updates);
      if (success) {
        setIsEditing(false);
      } else {
        alert('Failed to update book');
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTitle(book.title);
    setAuthor(book.author || '');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(book.id);
    if (!success) {
      alert('Failed to delete book');
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  return (
    <Stack spacing={2}>
      {isEditing && (
        <>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            fullWidth
            size="small"
          />
        </>
      )}
      
      <Stack direction="row" spacing={1}>
        {isEditing ? (
          <>
            <Button
              onClick={handleSave}
              variant="contained"
              color="success"
              size="small"
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
            <Button
              onClick={handleCancel}
              variant="outlined"
              size="small"
              startIcon={<CloseIcon />}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setIsEditing(true)}
              size="small"
              startIcon={<EditIcon />}
            >
              Edit
            </Button>
            
            {showDeleteConfirm ? (
              <>
                <Typography variant="caption" color="error">
                  Delete?
                </Typography>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  size="small"
                  color="error"
                  variant="contained"
                >
                  {isDeleting ? '...' : 'Yes'}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  size="small"
                  variant="outlined"
                >
                  No
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                size="small"
                startIcon={<DeleteIcon />}
                color="error"
              >
                Delete
              </Button>
            )}
          </>
        )}
      </Stack>
    </Stack>
  );
};
