import React, { useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { useStore } from '../stores';
import { useNavigate } from 'react-router-dom';
import { booksService } from '../services/api';
import { Typography, Button, LinearProgress, CircularProgress, Alert } from '@mui/material';
import { Upload as UploadIcon, CheckCircle, Error, CloudUpload } from '@mui/icons-material';
import { Container } from '../components/common/Container';
import { ContentCard } from '../components/common/ContentCard';

export const UploadPage: React.FC = observer(() => {
  const { bookStore, uiStore } = useStore();
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      setErrorMessage('Please upload a PDF file');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      uiStore.setProcessing(true);
      uiStore.setProcessingProgress(0);

      const formData = new FormData();
      formData.append('book', file);
      formData.append('title', file.name.replace('.pdf', ''));
      formData.append('author', 'Unknown');

      const newBook = await booksService.uploadBook(file);
      setUploadProgress(100);
      uiStore.setProcessingProgress(100);

      await bookStore.createBook(newBook);
      setUploadStatus('success');
      
      setTimeout(() => {
        navigate('/books');
      }, 1000);
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMsg = error instanceof Error ? error.message || String(error) : 'Upload failed';
      setErrorMessage(errorMsg);
      setUploadStatus('error');
    } finally {
      uiStore.setProcessing(false);
      uiStore.setProcessingProgress(0);
    }
  }, [bookStore, uiStore, navigate]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  return (
    <Container type="narrow">
      <Typography variant="h4" gutterBottom>
        Upload New Book
      </Typography>
      
      <ContentCard type="page" fullWidth>
        {uploadStatus === 'idle' && (
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <ContentCard 
              type="upload" 
              elevation={1}
              fullWidth
              sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            >
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <CloudUpload fontSize="large" />
                <Typography variant="h6" gutterBottom>
                  Drop your PDF file here, or click to select
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Maximum file size: 50MB
                </Typography>
              </div>
            </ContentCard>
          </div>
        )}

        {uploadStatus === 'uploading' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CircularProgress />
            <Typography variant="h6" gutterBottom>
              Uploading and processing...
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="body2">
              {uploadProgress}%
            </Typography>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle color="success" />
            <Typography variant="h6" gutterBottom>
              Upload successful!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to books...
            </Typography>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Error color="error" />
            <Typography variant="h6" gutterBottom>
              Upload failed
            </Typography>
            <Alert severity="error" style={{ marginBottom: '1rem' }}>
              {errorMessage}
            </Alert>
            <Button
              variant="contained"
              onClick={resetUpload}
              startIcon={<UploadIcon />}
            >
              Try Again
            </Button>
          </div>
        )}
      </ContentCard>
    </Container>
  );
});