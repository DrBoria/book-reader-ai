import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';

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
  const [isDragging, setIsDragging] = useState(false);

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

    // Upload each file
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i];
      await uploadFile(upload.file, uploads.length + i);
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
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          
          setUploads(prev => prev.map((upload, i) => 
            i === index ? { ...upload, progress } : upload
          ));
        },
      } as any);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUploads(prev => prev.map((upload, i) => 
        i === index 
          ? { ...upload, progress: 100, status: 'success', message: result.message }
          : upload
      ));

      // Add the new book to the store
      bookStore.addBook({
        id: result.bookId,
        title: file.name.replace('.pdf', ''),
        author: 'Unknown',
        filename: file.name,
        status: 'pending',
        totalPages: 0,
        uploadedAt: new Date().toISOString(),
        pages: [],
      });

    } catch (error) {
      setUploads(prev => prev.map((upload, i) => 
        i === index 
          ? { ...upload, status: 'error', message: error instanceof Error ? error.message : 'Upload failed' }
          : upload
      ));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 5,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const goBack = () => {
    navigate('/books');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Books</h1>
              <p className="text-gray-600 mt-1">Upload your PDF books to start reading and tagging</p>
            </div>
            <button
              onClick={goBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Back to Books
            </button>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive || isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop your PDF files here' : 'Drag & drop PDF files here'}
            </p>
            <p className="text-sm text-gray-600">
              or <span className="text-blue-600 font-medium">click to browse</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Maximum 5 PDF files at once
            </p>
          </div>

          {uploads.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Upload Progress</h3>
              {uploads.map((upload, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{upload.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeUpload(index)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {upload.status === 'uploading' && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Uploading...</span>
                        <span className="text-gray-600">{upload.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {upload.status === 'success' && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Upload completed successfully</span>
                    </div>
                  )}

                  {upload.status === 'error' && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{upload.message || 'Upload failed'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});