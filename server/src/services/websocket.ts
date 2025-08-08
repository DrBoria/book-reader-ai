
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { TaggedContent } from '../types';

export interface ProcessingUpdate {
  progress: number;
  currentPage: number;
  totalPages: number;
  newContent: Omit<TaggedContent, 'bookId' | 'pageId'>[];
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server: Server): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ["http://localhost:3000"], // Frontend dev server
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-book', (bookId: string) => {
        socket.join(`book-${bookId}`);
        console.log(`Client ${socket.id} joined book ${bookId}`);
      });

      socket.on('leave-book', (bookId: string) => {
        socket.leave(`book-${bookId}`);
        console.log(`Client ${socket.id} left book ${bookId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  emitBookProcessingUpdate(bookId: string, update: ProcessingUpdate): void {
    if (!this.io) return;
    
    this.io.to(`book-${bookId}`).emit('book-processing-update', {
      bookId,
      ...update
    });
  }

  emitBookProcessingComplete(bookId: string): void {
    if (!this.io) return;
    
    this.io.to(`book-${bookId}`).emit('book-processing-complete', {
      bookId
    });
  }

  emitBookProcessingError(bookId: string, error: string): void {
    if (!this.io) return;
    
    this.io.to(`book-${bookId}`).emit('book-processing-error', {
      bookId,
      error
    });
  }

  emitNewTaggedContent(bookId: string, content: TaggedContent[]): void {
    if (!this.io) return;
    
    this.io.to(`book-${bookId}`).emit('new-tagged-content', {
      bookId,
      content
    });
  }
}
