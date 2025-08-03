import { apiClient } from './api';
import { SearchQuery, SearchResult, ContentReference } from '../types';

export interface ChatResponse {
  question: string;
  answer: string;
  references: ContentReference[];
  timestamp: string;
}

export class SearchService {
  async searchContent(query: SearchQuery): Promise<SearchResult[]> {
    const response = await apiClient.post<SearchResult[]>('/search/content', query);
    
    if (response.error) {
      console.error('Search failed:', response.error);
      return [];
    }

    return response.data || [];
  }

  async askQuestion(question: string, bookIds?: string[], tagId?: string): Promise<ChatResponse | null> {
    const response = await apiClient.post<ChatResponse>('/search/chat', {
      question,
      bookIds,
      tagId,
      sessionId: this.getSessionId()
    });
    
    if (response.error) {
      console.error('Chat failed:', response.error);
      throw new Error(response.error);
    }

    return response.data || null;
  }

  private getSessionId(): string {
    let sessionId = localStorage.getItem('chat-session-id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chat-session-id', sessionId);
    }
    return sessionId;
  }
}

export const searchService = new SearchService();
