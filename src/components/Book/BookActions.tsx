import React, { useState } from 'react';
import { BookContent } from '../../types';
import {
  TextField,
  Button,
  Typography,
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Modal } from '../Modal/Modal';

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
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author || '');
  const [isEditing, setIsEditing] = useState(false);
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

  const handleCancelEdit = () => {
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
    <>
      <Stack direction="row" spacing={1}>
        <Button
          onClick={() => setIsEditing(true)}
          size="small"
          startIcon={<EditIcon />}
        >
          Edit
        </Button>
        
        <Button
          onClick={() => setShowDeleteConfirm(true)}
          size="small"
          startIcon={<DeleteIcon />}
          color="error"
        >
          Delete
        </Button>
      </Stack>

      <Modal
        open={isEditing}
        onClose={handleCancelEdit}
        title="Edit Book"
        onSubmit={handleSave}
        disabled={isDeleting}
        isLoading={isDeleting}
      >
        <Stack spacing={2}>
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
        </Stack>
      </Modal>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Book"
        onSubmit={handleDelete}
        disabled={isDeleting}
        isLoading={isDeleting}
        submitText="Delete"
        submitButtonColor="error"
      >
        <Typography>Are you sure you want to delete this book?</Typography>
      </Modal>
    </>
  );
};
