import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { TaggedContent as TaggedContentType, Tag } from "../types";
import { FileText, Quote, Star } from "lucide-react";

interface TaggedContentProps {
  taggedContent: TaggedContentType[];
  selectedTag: string | null;
  tags?: Tag[];
}

export const TaggedContentDisplay: React.FC<TaggedContentProps> = observer(({ taggedContent, selectedTag, tags }) => {
  const allTags = tags || [];
  const [sortBy, setSortBy] = useState<"page" | "relevance">("page");
  
  const selectedTagInfo = allTags.find(tag => tag.id === selectedTag);

  const sortedContent = [...taggedContent].sort((a, b) => {
    if (sortBy === "page") {
      return a.pageNumber - b.pageNumber;
    }
    return b.relevance - a.relevance;
  });

  if (!selectedTag) {
    return (
      <div className="p-6 text-center">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl text-gray-600 mb-2">No tag selected</h2>
        <p className="text-gray-500">Choose a tag to view its content</p>
      </div>
    );
  }

  return (
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
});