import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface ProcessingUpdate {
  progress: number;
  currentPage: number;
  totalPages: number;
  newContent: any[];
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class WebSocketService {
  @WebSocketServer()
  private server!: Server;

  emitBookProcessingUpdate(bookId: string, update: ProcessingUpdate): void {
    if (!this.server) {
      console.warn('WebSocket server not initialized');
      return;
    }

    this.server.to(`book-${bookId}`).emit('book-processing-update', {
      bookId,
      ...update,
    });
  }

  emitBookProcessingComplete(bookId: string): void {
    if (!this.server) {
      console.warn('WebSocket server not initialized');
      return;
    }

    this.server.to(`book-${bookId}`).emit('book-processing-complete', {
      bookId,
    });
  }

  emitBookProcessingError(bookId: string, error: string): void {
    if (!this.server) {
      console.warn('WebSocket server not initialized');
      return;
    }

    this.server.to(`book-${bookId}`).emit('book-processing-error', {
      bookId,
      error,
    });
  }

  @SubscribeMessage('subscribe-to-book')
  handleSubscribeToBook(
    @MessageBody() data: { bookId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(`book-${data.bookId}`);
    return { success: true, message: `Subscribed to book-${data.bookId}` };
  }

  @SubscribeMessage('unsubscribe-from-book')
  handleUnsubscribeFromBook(
    @MessageBody() data: { bookId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(`book-${data.bookId}`);
    return { success: true, message: `Unsubscribed from book-${data.bookId}` };
  }

  handleConnection(socket: Socket, bookId?: string) {
    if (bookId) {
      socket.join(`book-${bookId}`);
    }
  }
}
