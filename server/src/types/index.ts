export interface TagCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type?: "default" | "custom";
  keywords?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type?: "default" | "dynamic";
  categoryId?: string;
  bookId?: string;
  value?: string;
  confidence?: number;
  contentCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookContent {
  id: string;
  title: string;
  author?: string;
  filename: string;
  totalPages: number;
  uploadedAt: Date;
  processedAt?: Date;
  status: "uploading" | "processing" | "completed" | "error";
}

export interface BookPage {
  id: string;
  bookId: string;
  pageNumber: number;
  text: string;
  processedAt?: Date;
}

export interface TaggedContent {
  id: string;
  bookId: string;
  pageId: string;
  tagId: string;
  content: string;
  pageNumber: number;
  relevance: number;
  context?: string;
  originalText?: string;  // Full page text for context
  createdAt: Date;
}

export interface ProcessingJob {
  id: string;
  bookId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  currentPage?: number;
  totalPages: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  type: "user" | "assistant";
  content: string;
  references?: ContentReference[];
  timestamp: Date;
}

export interface ContentReference {
  bookId: string;
  pageNumber: number;
  chapter?: string;
  quote: string;
  tagId?: string;
}

export interface SearchQuery {
  query?: string;
  searchTerms?: string[];
  bookIds?: string[];
  tagIds?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  content: TaggedContent;
  book: BookContent;
  score: number;
  highlights: string[];
}
