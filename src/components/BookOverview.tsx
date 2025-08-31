import React from "react";
import { observer } from "mobx-react-lite";
import { BookContent, Tag } from "../types";
import { BookOpen } from "lucide-react";

interface BookOverviewProps {
  book: BookContent | null;
  tags?: Tag[];
}

export const BookOverview: React.FC<BookOverviewProps> = observer(({
  book,
  tags = []
}) => {
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
          {book.pages?.length || 0} pages • Uploaded {new Date(book.uploadedAt).toLocaleDateString()}
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
            <ul className="mt-2 space-y-1 max-h-32 overflow-hidden">
              {tags?.slice(0, 8).map(tag => (
                <li key={tag.id} className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </li>
              )) || <li className="text-gray-500">No tags available</li>}
              {tags && tags.length > 8 && (
                <li className="text-gray-400 text-xs">+{tags.length - 8} more tags...</li>
              )}
            </ul>
          </div>
          <div>
            <strong>Book statistics:</strong>
            <ul className="mt-2 space-y-1 text-gray-600">
              <li>Total pages: {book?.pages?.length || 0}</li>
              <li>Characters: {book?.pages?.reduce((acc, page) => acc + page.text.length, 0) || 0}</li>
              <li>Average page length: {book?.pages?.length ? Math.round(book.pages.reduce((acc, page) => acc + page.text.length, 0) / book.pages.length) : 0} chars</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});