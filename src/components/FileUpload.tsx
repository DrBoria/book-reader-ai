import React, { useRef } from "react";
import { Typography, Button, CircularProgress } from "@mui/material";
import { Upload, FileText } from "lucide-react";
import { ContentCard } from "./common/ContentCard";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      onFileUpload(file);
    } else {
      alert("Please select a PDF file");
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      onFileUpload(file);
    } else {
      alert("Please drop a PDF file");
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  if (isProcessing) {
    return (
      <ContentCard type="upload" container center spacing={3}>
        <CircularProgress />
        <Typography variant="h6" gutterBottom>
          Processing your book...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The AI agent is analyzing and tagging your content. This may take a few moments.
        </Typography>
      </ContentCard>
    );
  }

  return (
    <ContentCard
      type="upload"
      container
      center
      spacing={3}
      variant="outlined"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <FileText size={64} />
      <Typography variant="h5" gutterBottom>
        Upload your PDF book
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Drag and drop your PDF file here, or click to browse
      </Typography>
      
      <Button
        variant="contained"
        startIcon={<Upload />}
      >
        Choose PDF file
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </ContentCard>
  );
};
