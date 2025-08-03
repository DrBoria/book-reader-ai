import { apiClient } from './api';
import { Tag, TaggedContent, TagCategory } from '../types';

export class TagService {
  async getAllTags(): Promise<Tag[]> {
    const response = await apiClient.get<{ categories: TagCategory[]; tags: Tag[] }>('/tags');
    
    if (response.error) {
      console.error('Failed to fetch tags:', response.error);
      return [];
    }

    // Return only the tags, not categories
    return response.data?.tags || [];
  }

  async getAllCategories(): Promise<TagCategory[]> {
    const response = await apiClient.get<{ categories: TagCategory[]; tags: Tag[] }>('/tags');
    
    if (response.error) {
      console.error('Failed to fetch categories:', response.error);
      return [];
    }

    return response.data?.categories || [];
  }

  async createTag(tag: Omit<Tag, 'id' | 'type' | 'createdAt' | 'updatedAt'>): Promise<Tag | null> {
    const response = await apiClient.post<Tag>('/tags', tag);
    
    if (response.error) {
      console.error('Failed to create tag:', response.error);
      throw new Error(response.error);
    }

    return response.data || null;
  }

  async createCategory(category: { name: string; description?: string; color?: string }): Promise<Tag | null> {
    const response = await apiClient.post<Tag>('/tags/categories', category);
    
    if (response.error) {
      console.error('Failed to create category:', response.error);
      throw new Error(response.error);
    }

    return response.data || null;
  }

  async getContentByTag(tagId: string, bookId?: string): Promise<TaggedContent[]> {
    const endpoint = `/tags/${tagId}/content${bookId ? `?bookId=${bookId}` : ''}`;
    const response = await apiClient.get<TaggedContent[]>(endpoint);
    
    if (response.error) {
      console.error('Failed to fetch tagged content:', response.error);
      return [];
    }

    return response.data || [];
  }

  async deleteTag(tagId: string): Promise<boolean> {
    const response = await apiClient.delete(`/tags/${tagId}`);
    
    if (response.error) {
      console.error('Failed to delete tag:', response.error);
      return false;
    }

    return true;
  }
}

export const tagService = new TagService();
