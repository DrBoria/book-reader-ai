import React, { useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDropzone } from 'react-dropzone';
import { useStore } from '../stores';
import { useNavigate } from 'react-router-dom';
import { booksService } from '../services/api';

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

      bookStore.addBook(newBook);
      setUploadStatus('success');
      
      // Redirect to books page after successful upload
      setTimeout(() => {
        navigate('/books');
      }, 1000);
    } catch (error) {
      console.error('Upload failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadStatus('error');
    } finally {
      uiStore.setProcessing(false);
      uiStore.setProcessingProgress(0);
    }
  }, [bookStore, uiStore, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Upload New Book</h2>
      
      <div className="max-w-2xl mx-auto">
        {uploadStatus === 'idle' && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop your PDF file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Maximum file size: 50MB
                </p>
              </div>
            </div>
          </div>
        )}

        {uploadStatus === 'uploading' && (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-lg font-medium">Uploading and processing...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{uploadProgress}%</p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="text-center space-y-4">
            <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-green-600">Upload successful!</p>
            <p className="text-sm text-gray-600">Redirecting to books...</p>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="text-center space-y-4">
            <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-red-600">Upload failed</p>
            <p className="text-sm text-gray-600">{errorMessage}</p>
            <button
              onClick={resetUpload}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
});