export interface Tag {
  id: string;
  name: string;
  description: string;
  color: string;
  type: "default" | "custom";
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
  }[];
}

export interface TagCloud {
  tag: Tag;
  count: number;
  weight: number;
}
