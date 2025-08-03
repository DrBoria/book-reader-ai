import React, { useState } from "react";
import { BookContent, TaggedContent, Tag } from "../types";
import { BookOpen, FileText, Quote, Star } from "lucide-react";

interface ContentDisplayProps {
  book: BookContent | null;
  selectedTag: string | null;
  taggedContent: TaggedContent[];
  tags?: Tag[];
  isProcessing?: boolean;
  processingProgress?: number;
}

export const ContentDisplay: React.FC<ContentDisplayProps> = ({
  book,
  selectedTag,
  taggedContent,
  tags = [],
  isProcessing = false,
  processingProgress = 0
}) => {
  const [sortBy, setSortBy] = useState<"page" | "relevance">("page");

  const selectedTagInfo = tags.find(tag => tag.id === selectedTag);

  const sortedContent = [...taggedContent].sort((a, b) => {
    if (sortBy === "page") {
      return a.pageNumber - b.pageNumber;
    }
    return b.relevance - a.relevance;
  });

  const renderBookOverview = () => {
    if (!book) {
      return (
        <div className="p-6 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl text-gray-600 mb-2">No book selected</h2>
          <p className="text-gray-500">Choose a book from the sidebar to view its content</p>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="text-center mb-8">
          <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{book.title}</h2>
          {book.author && (
            <p className="text-gray-600 mb-2">by {book.author}</p>
          )}
          <p className="text-sm text-gray-500">
            {book.pages?.length || book.totalPages || 0} pages • Uploaded {new Date(book.uploadedAt).toLocaleDateString()}
          </p>
        </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Select a tag to view content</h3>
        <p className="text-gray-600 mb-4">
          Choose from the tags on the left to see all content related to that topic. 
          You can view the content as a list sorted by page number or relevance.
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Available tags:</strong>
            <ul className="mt-2 space-y-1">
              {tags?.slice(0, 4).map(tag => (
                <li key={tag.id} className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </li>
              )) || <li className="text-gray-500">No tags available</li>}
            </ul>
          </div>
          <div>
            <strong>Book statistics:</strong>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li>Total pages: {book?.pages?.length || book?.totalPages || 0}</li>
              <li>Characters: {book?.pages?.reduce((acc, page) => acc + page.text.length, 0) || 0}</li>
              <li>Average page length: {book?.pages?.length ? Math.round(book.pages.reduce((acc, page) => acc + page.text.length, 0) / book.pages.length) : 0} chars</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderTaggedContent = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            {selectedTagInfo && (
              <div 
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: selectedTagInfo.color }}
              />
            )}
            {selectedTagInfo?.name || "Content"}
          </h2>
          <p className="text-gray-600 mt-1">
            {taggedContent.length} items found
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "page" | "relevance")}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="page">Page Number</option>
            <option value="relevance">Relevance</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {sortedContent.map((content, index) => (
          <div key={content.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-1" />
                Page {content.pageNumber}
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm text-gray-600">
                  {Math.round(content.relevance * 100)}% relevant
                </span>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-start">
                <Quote className="h-4 w-4 text-gray-400 mr-2 mt-1 flex-shrink-0" />
                <blockquote className="text-gray-900 italic">
                  "{content.content}"
                </blockquote>
              </div>
            </div>

            {content.context && (
              <div className="bg-blue-50 rounded p-3 text-sm">
                <strong className="text-blue-900">Context:</strong>
                <p className="text-blue-800 mt-1">{content.context}</p>
              </div>
            )}

            <details className="mt-3">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                View full page context
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 max-h-40 overflow-y-auto">
                {content.originalText}
              </div>
            </details>
          </div>
        ))}

        {taggedContent.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No content found for this tag.</p>
            <p className="text-sm mt-1">
              The AI agent might not have identified relevant content, or the book may not contain information related to this tag.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      {!selectedTag ? renderBookOverview() : renderTaggedContent()}
    </div>
  );
};
