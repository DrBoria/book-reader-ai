export interface TagCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type?: "default" | "custom" | "system";
  dataType?: "text" | "number" | "date" | "string";
  keywords?: string[];
  tags?: string[];  // Array of tag IDs
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  type?: "default" | "dynamic" | "entity" | "concept" | "keyword" | "custom";
  bookId?: string;  // For dynamic tags
  categoryId?: string;  // For dynamic tags
  value?: string;
  confidence?: number;
  contentCount?: number;  // Server-provided count
  keywords?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookPage {
  pageNumber: number;
  text: string;
  images?: string[];
}

export interface BookContent {
  id: string;
  title: string;
  author?: string;
  pages: BookPage[];
  uploadedAt: Date;
}

export interface TaggedContent {
  id: string;
  tagId: string;
  content: string;
  pageNumber: number;
  relevance: number;
  context?: string;
  originalText: string;
}

export interface AgentState {
  messages: ChatMessage[];
  currentBook: BookContent | null;
  tags: Tag[];
  taggedContent: TaggedContent[];
  isProcessing: boolean;
  currentStep: string;
}

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  references?: {
    pageNumber: number;
    chapter?: string;
    quote: string;
    bookId?: string;
  }[];
}

export interface TagCloud {
  tag: Tag;
  count: number;
  weight: number;
}

export interface ProcessingJob {
  id: string;
  bookId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  currentPage: number;
  totalPages: number;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}
