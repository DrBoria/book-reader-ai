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

  async createCategory(category: { name: string; description?: string; color?: string }): Promise<TagCategory | null> {
    const response = await apiClient.post<TagCategory>('/tags/categories', category);
    
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

  async deleteTag(tagId: string): Promise<void> {
    const response = await apiClient.delete(`/tags/${tagId}`);
    
    if (response.error) {
      console.error('Failed to delete tag:', response.error);
      throw new Error(response.error);
    }
  }

  async bulkDeleteTags(tagIds: string[]): Promise<number> {
    const response = await apiClient.delete<{ deletedCount: number }>('/tags', { tagIds });
    
    if (response.error) {
      console.error('Failed to bulk delete tags:', response.error);
      throw new Error(response.error);
    }

    return response.data?.deletedCount || 0;
  }

  async updateCategoryKeywords(categoryId: string, keywords: string[]): Promise<TagCategory | null> {
    try {
      const response = await apiClient.put<TagCategory>(`/tags/categories/${categoryId}/keywords`, { keywords });
      
      if (response.error) {
        console.error('Failed to update category keywords:', response.error);
        return null;
      }

      return response.data || null;
    } catch (error) {
      console.error('Failed to update category keywords:', error);
      return null;
    }
  }

  async cleanupDuplicateTags(): Promise<{ success: boolean, mergedGroups: number, totalMerged: number, message: string } | null> {
    try {
      const response = await apiClient.post<{ success: boolean, mergedGroups: number, totalMerged: number, message: string }>('/tags/cleanup-duplicates');
      
      if (response.error) {
        console.error('Failed to cleanup duplicate tags:', response.error);
        return null;
      }

      return response.data || null;
    } catch (error) {
      console.error('Failed to cleanup duplicate tags:', error);
      return null;
    }
  }
}

export const tagService = new TagService();
