import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { database } from './database/neo4j';
import { initializeSchema } from './database/initSchema';
import { TagRepository } from './repositories/tagRepository';
import { WebSocketService } from './services/websocket';

// Import routes
import booksRouter from './routes/books';
import tagsRouter from './routes/tags';
import searchRouter from './routes/search';

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Initialize WebSocket
  WebSocketService.getInstance().initialize(server);

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Ensure upload directory exists
  if (!fs.existsSync(config.upload.uploadDir)) {
    fs.mkdirSync(config.upload.uploadDir, { recursive: true });
  }

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Routes
  app.use('/api/books', booksRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/search', searchRouter);

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: config.server.env === 'development' ? error.message : 'Something went wrong'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  try {
    // Test database connection
    console.log('🔌 Connecting to Neo4j...');
    const isConnected = await database.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Neo4j database');
    }
    
    // Initialize schema and default categories
    await initializeSchema();
    
    // Start server
    server.listen(config.server.port, () => {
      console.log(`🚀 Server running on port ${config.server.port}`);
      console.log(`📊 Environment: ${config.server.env}`);
      console.log(`🔍 Health check: http://localhost:${config.server.port}/health`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
