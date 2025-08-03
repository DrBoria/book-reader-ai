import { apiClient } from './api';
import { BookContent, ProcessingJob } from '../types';

export class BookService {
  async uploadBook(file: File, selectedTags: string[]): Promise<{
    bookId: string;
    jobId: string;
    message: string;
  } | null> {
    const formData = new FormData();
    formData.append('book', file);
    formData.append('selectedTags', JSON.stringify(selectedTags));

    const response = await apiClient.postFormData<{
      bookId: string;
      jobId: string;
      message: string;
    }>('/books/upload', formData);

    if (response.error) {
      console.error('Upload failed:', response.error);
      throw new Error(response.error);
    }

    return response.data || null;
  }

  async getAllBooks(): Promise<BookContent[]> {
    const response = await apiClient.get<BookContent[]>('/books');
    
    if (response.error) {
      console.error('Failed to fetch books:', response.error);
      return [];
    }

    return response.data || [];
  }

  async getBook(bookId: string): Promise<BookContent | null> {
    const response = await apiClient.get<BookContent>(`/books/${bookId}`);
    
    if (response.error) {
      console.error('Failed to fetch book:', response.error);
      return null;
    }

    return response.data || null;
  }

  async deleteBook(bookId: string): Promise<boolean> {
    const response = await apiClient.delete(`/books/${bookId}`);
    
    if (response.error) {
      console.error('Failed to delete book:', response.error);
      return false;
    }

    return true;
  }

  async updateBook(bookId: string, updates: { title?: string; author?: string }): Promise<boolean> {
    const response = await apiClient.put(`/books/${bookId}`, updates);
    
    if (response.error) {
      console.error('Failed to update book:', response.error);
      return false;
    }

    return true;
  }

  async getJobStatus(bookId: string): Promise<ProcessingJob | null> {
    const response = await apiClient.get<ProcessingJob>(`/books/${bookId}/status`);
    
    if (response.error) {
      console.error('Failed to fetch job status:', response.error);
      return null;
    }

    return response.data || null;
  }
}

export const bookService = new BookService();
