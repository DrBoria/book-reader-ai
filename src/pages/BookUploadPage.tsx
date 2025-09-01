import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { Typography, Button, LinearProgress, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { Upload, File, X } from 'lucide-react';
import { Container } from '../components/common/Container';
import { ContentCard } from '../components/common/ContentCard';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  message?: string;
}

export const BookUploadPage: React.FC = observer(() => {
  const { bookStore } = useStore();
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('Please select PDF files only');
      return;
    }

    const newUploads = pdfFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploads(prev => [...prev, ...newUploads]);

    for (let i = 0; i < newUploads.length; i++) {
      await uploadFile(newUploads[i].file, uploads.length + i);
    }
  }, [uploads.length]);

  const uploadFile = async (file: File, index: number) => {
    const formData = new FormData();
    formData.append('book', file);

    try {
      setUploads(prev => prev.map((upload, i) => 
        i === index ? { ...upload, progress: 0, status: 'uploading' } : upload
      ));

      const response = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploads(prev => prev.map((upload, i) => 
        i === index 
          ? { ...upload, progress: 100, status: 'success', message: result.message }
          : upload
      ));

      await bookStore.loadBooks();

    } catch (error) {
      setUploads(prev => prev.map((upload, i) => 
        i === index 
          ? { ...upload, status: 'error', message: error instanceof Error ? error.message : 'Upload failed' }
          : upload
      ));
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 5,
  });

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Container type="narrow">
      <ContentCard type="page" fullWidth>
        <Typography variant="h4" gutterBottom>
          Upload Books
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Upload your PDF books to start reading and tagging
        </Typography>
        
        <Button variant="outlined" onClick={() => navigate('/books')} style={{ marginBottom: '1.5rem' }}>
          Back to Books
        </Button>

      <ContentCard 
            {...getRootProps()} 
            type="upload" 
            elevation={1}
            fullWidth
            sx={{ textAlign: 'center', p: 4, cursor: 'pointer' }}
          ><input {...getInputProps()} />
          <Upload size={48} />
          <Typography variant="h6" gutterBottom>
            Drop your PDF files here
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Maximum 5 PDF files at once
          </Typography>
        </ContentCard>

        {uploads.length > 0 && (
          <List>
            {uploads.map((upload, index) => (
              <ListItem key={index}>
                <ContentCard type="list" fullWidth sx={{ p: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ListItemText
                      primary={upload.file.name}
                      secondary={`${(upload.file.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                    <IconButton onClick={() => removeUpload(index)}>
                      <X size={16} />
                    </IconButton>
                  </div>
                  
                  {upload.status === 'uploading' && (
                    <LinearProgress variant="determinate" value={upload.progress} />
                  )}
                  
                  {upload.status === 'success' && (
                    <Typography variant="body2" color="success.main">
                      Upload completed
                    </Typography>
                  )}
                  
                  {upload.status === 'error' && (
                    <Typography variant="body2" color="error.main">
                      {upload.message || 'Upload failed'}
                    </Typography>
                  )}
                </ContentCard>
              </ListItem>
            ))}
          </List>
        )}
      </ContentCard>
    </Container>
  );
});