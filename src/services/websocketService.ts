import { io, Socket } from 'socket.io-client';
import { TaggedContent } from '../types';

export interface ProcessingUpdate {
  bookId: string;
  progress: number;
  currentPage: number;
  totalPages: number;
  newContent: Omit<TaggedContent, 'bookId' | 'pageId'>[];
}

export interface ProcessingComplete {
  bookId: string;
}

export interface ProcessingError {
  bookId: string;
  error: string;
}

export interface NewTaggedContent {
  bookId: string;
  content: TaggedContent[];
}

export type WebSocketEventHandler<T = any> = (data: T) => void;

export class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<WebSocketEventHandler>> = new Map();

  connect(url = 'http://localhost:3001'): void {
    if (this.socket?.connected) return;

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.socket.on('book-processing-update', (data: ProcessingUpdate) => {
      this.emit('processing-update', data);
    });

    this.socket.on('book-processing-complete', (data: ProcessingComplete) => {
      this.emit('processing-complete', data);
    });

    this.socket.on('book-processing-error', (data: ProcessingError) => {
      this.emit('processing-error', data);
    });

    this.socket.on('new-tagged-content', (data: NewTaggedContent) => {
      this.emit('new-content', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinBook(bookId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-book', bookId);
    }
  }

  leaveBook(bookId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-book', bookId);
    }
  }

  on(event: string, handler: WebSocketEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: WebSocketEventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();
