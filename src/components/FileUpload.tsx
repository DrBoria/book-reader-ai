import React, { useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

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
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Processing your book...
        </h3>
        <p className="text-gray-600">
          The AI agent is analyzing and tagging your content. This may take a few moments.
        </p>
      </div>
    );
  }

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-medium text-gray-900 mb-2">
        Upload your PDF book
      </h3>
      <p className="text-gray-600 mb-4">
        Drag and drop your PDF file here, or click to browse
      </p>
      
      <div className="flex items-center justify-center">
        <Upload className="h-5 w-5 mr-2 text-blue-600" />
        <span className="text-blue-600 font-medium">Choose PDF file</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="mt-6 text-sm text-gray-500">
        <p className="mb-2">🤖 DeepSeek R1 AI agent automatically:</p>
        <ul className="text-left max-w-md mx-auto space-y-1">
          <li>• 🕒 Extracts temporal references</li>
          <li>• 👥 Identifies mentioned people</li>
          <li>• 🏷️ Categorizes themes and concepts</li>
          <li>• 📍 Finds mentioned places</li>
          <li>• ➕ Allows custom tag creation</li>
          <li>• 💬 Answers questions about the text</li>
        </ul>
        <p className="mt-4 text-xs text-green-600">
          🔒 Fully local processing - your data stays on your computer
        </p>
      </div>
    </div>
  );
};
