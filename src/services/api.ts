declare global {
  interface ImportMeta {
    env: {
      VITE_API_BASE_URL?: string;
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || `HTTP ${response.status}` };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: 'Network error or server unavailable' };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });
  }
}

export interface Book {
  id: string;
  title: string;
  author: string;
  filename: string;
  totalPages?: number;
  uploadedAt: string;
  processedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  filePath?: string;
  size?: number;
  mimetype?: string;
}

export interface CreateBookDto {
  title: string;
  author?: string;
  filename: string;
  totalPages?: number;
  filePath?: string;
  size?: number;
  status?: 'pending' | 'processing' | 'completed' | 'error';
  processedAt?: string;
  uploadedAt?: string;
  mimetype?: string;
}

export interface Tag {
  id: string;
  label?: string;
  name?: string;
  description?: string;
  color?: string;
  type: 'dynamic' | 'default' | 'entity' | 'concept' | 'keyword' | 'custom';
  bookId?: string;
  categoryId?: string;
  value?: string;
  confidence?: number;
  contentCount?: number;
  keywords?: string[];
  createdAt: string | { year: { low: number; high: number }; month: { low: number; high: number }; day: { low: number; high: number }; hour: { low: number; high: number }; minute: { low: number; high: number }; second: { low: number; high: number }; nanosecond: { low: number; high: number }; timeZoneOffsetSeconds: { low: number; high: number } };
  updatedAt: string;
  relevance?: number;
  context?: string;
  originalText?: string;
}

export interface CreateTagDto {
  name: string;
  description?: string;
  color?: string;
  bookId: string;
  value: string;
  confidence: number;
  contentCount: number;
  relevance: number;
  context?: string;
  originalText?: string;
  type?: 'entity' | 'concept' | 'keyword' | 'custom';
}

export interface TaggedContent {
  id: string;
  bookId: string;
  tagId: string;
  content: string;
  pageNumber: number;
  position: number;
  relevance: number;
  context?: string;
  originalText: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  dataType?: 'text' | 'date' | 'number' | 'string';
  keywords?: string[];
  type?: 'default' | 'custom' | 'system';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  dataType?: 'text' | 'date' | 'number' | 'string';
  keywords?: string[];
  type?: 'default' | 'custom' | 'system';
}

export class BooksService {
  constructor(private client: ApiClient) {}

  async getBooks(): Promise<Book[]> {
    const response = await this.client.get<Book[]>('/books');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  async getBook(id: string): Promise<Book> {
    const response = await this.client.get<Book>(`/books/${id}`);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async createBook(book: CreateBookDto): Promise<Book> {
    const response = await this.client.post<Book>('/books', book);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async updateBook(id: string, updates: Partial<CreateBookDto>): Promise<Book> {
    const response = await this.client.post<Book>(`/books/${id}`, updates);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async deleteBook(id: string): Promise<void> {
    const response = await this.client.delete<void>(`/books/${id}`);
    if (response.error) throw new Error(response.error);
  }

  async uploadBook(file: File): Promise<{ bookId: string; message: string }> {
    const formData = new FormData();
    formData.append('book', file);
    
    const response = await this.client.postFormData<{ bookId: string; message: string }>('/books/upload', formData);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }
}

export class TagsService {
  constructor(private client: ApiClient) {}

  async getTags(): Promise<Tag[]> {
    const response = await this.client.get<Tag[]>('/tags');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  async createTag(tag: CreateTagDto): Promise<Tag> {
    const response = await this.client.post<Tag>('/tags', tag);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async deleteTag(id: string): Promise<void> {
    const response = await this.client.delete<void>(`/tags/${id}`);
    if (response.error) throw new Error(response.error);
  }

  async getTaggedContent(): Promise<any[]> {
    const response = await this.client.get<any[]>('/tags/content');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  async tagContent(data: { bookId: string; tagId: string; content: string; pageNumber: number; position: number; relevance: number; context?: string; originalText: string }): Promise<any> {
    const response = await this.client.post<any>('/tags/content', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }
}

export class CategoriesService {
  constructor(private client: ApiClient) {}

  async getCategories(): Promise<Category[]> {
    const response = await this.client.get<Category[]>('/category');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  async createCategory(category: CreateCategoryDto): Promise<Category> {
    const response = await this.client.post<Category>('/category', category);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async deleteCategory(id: string): Promise<void> {
    const response = await this.client.delete<void>(`/category/${id}`);
    if (response.error) throw new Error(response.error);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export const booksService = new BooksService(apiClient);
export const tagsService = new TagsService(apiClient);
export const categoriesService = new CategoriesService(apiClient);
