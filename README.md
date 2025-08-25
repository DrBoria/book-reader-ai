# Book Reader AI Agent

AI-powered book analysis system with real-time tagging and intelligent chat interface.

## Quick Install

```bash
# 1. Install pnpm
npm install -g pnpm

# 2. Setup everything
pnpm run setup

# 3. Start LM Studio with any model (tested on Claude 3.7 - works good, deepseek - not recommended)
# 4. Start app
pnpm run dev
```

## Architecture

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Express.js + TypeScript
- **Database**: Neo4j (Graph Database)
- **Queue**: Redis + Bull Queue
- **AI**: LM Studio + Claude 3.7 model
- **Real-time**: WebSocket (Socket.io)

## Features

1. **PDF Upload & Processing**: Upload books and process them asynchronously
2. **AI Tagging**: Automatic content tagging using DeepSeek R1 via LM Studio
3. **Graph Database**: Store tagged content in Neo4j for fast retrieval
4. **Real-time Updates**: See processing progress in real-time
5. **Smart Chat**: Ask questions about your books with AI-powered responses
6. **Custom Tags**: Create and manage your own content tags

## Prerequisites

- **Node.js** (v18+)
- **Docker** (for Neo4j + Redis)
- **LM Studio** with DeepSeek R1 model

## Setup

### 1. Install pnpm
```bash
npm install -g pnpm
```

### 2. Install & Setup
```bash
pnpm run setup
```

### 3. Configure Environment
```bash
cp server/.env.example server/.env
cp .env.example .env.local
```

**Important:** Edit both `.env` files and replace `localhost` with your LM Studio IP address if running on a different machine.

### 4. Start LM Studio
- Download from https://lmstudio.ai/
- Load **claude-3.7-sonnet-reasoning-gemma3-12b** model
- Start server on port 1234
- Update IP in `.env` files if needed

### 5. Run App
```bash
pnpm run dev
```

## Running the Application

### Quick Start with Docker

```bash
# 1. Start databases
cd server
./scripts/setup.sh

# 2. Configure LM Studio
# Open LM Studio, load DeepSeek R1 model, start local server

# 3. Start backend (new terminal)
npm run dev

# 4. Start frontend (new terminal)
cd ..
npm run dev
```

### Detailed Steps

#### 1. Start Backend Services

```bash
# Start Neo4j and Redis with Docker
cd server
docker-compose up -d

# Or use setup script for automatic configuration
./scripts/setup.sh

# Start LM Studio server
# Open LM Studio, load DeepSeek R1 model, start local server
```

#### 2. Start Application

```bash
# Terminal 1: Start backend server  
cd server
npm run dev

# Terminal 2: Start frontend
cd ..
npm run dev
```

#### 3. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health  
- **Neo4j Browser**: http://localhost:7474 (neo4j/password)
- **Redis**: localhost:6379

## Usage

1. **Upload a Book**: Drop a PDF file to start processing
2. **Monitor Progress**: Watch real-time processing updates
3. **Explore Tags**: Browse content by time, people, themes, locations
4. **Create Custom Tags**: Add your own content categories
5. **Chat with AI**: Ask questions about your books
6. **Search Content**: Find specific information across all books

## API Endpoints

### Books
- `POST /api/books/upload` - Upload and process a book
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get specific book
- `GET /api/books/:id/job-status` - Get processing status

### Tags
- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create custom tag
- `GET /api/tags/:id/content` - Get content by tag
- `DELETE /api/tags/:id` - Delete custom tag

### Search
- `POST /api/search/content` - Search content
- `POST /api/search/chat` - Chat with AI

## Troubleshooting

### Common Issues

1. **LM Studio Connection Failed**
   - Ensure LM Studio is running on correct port
   - Check model is loaded and server started
   - Verify firewall settings

2. **Neo4j Connection Failed**
   - Ensure Docker Compose is running: `docker-compose ps`
   - Restart Neo4j: `docker-compose restart neo4j`  
   - Check Neo4j logs: `docker-compose logs neo4j`
   - Verify credentials in .env (default: neo4j/password)

3. **Redis Connection Failed**
   - Ensure Docker Compose is running: `docker-compose ps`
   - Restart Redis: `docker-compose restart redis`
   - Check Redis logs: `docker-compose logs redis`

4. **File Upload Fails**
   - Check file size limits
   - Ensure upload directory exists
   - Verify permissions

### Debug Mode

Set `NODE_ENV=development` in server/.env for detailed logs.

### Docker Commands

```bash
# Stop all services
docker-compose down

# Restart services  
docker-compose restart

# View logs
docker-compose logs -f

# Clear data (WARNING: will delete all data!)
docker-compose down -v
```

## Development

### Project Structure

```
book-reader-ai/
├── src/                    # Frontend React app
│   ├── components/         # UI components
│   ├── services/          # API services
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
├── server/                # Backend Express app
│   ├── src/
│   │   ├── database/      # Neo4j connection
│   │   ├── repositories/  # Data access layer
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── types/         # Server types
│   └── uploads/           # File storage
└── README.md
```

### Adding Features

1. **New Tag Types**: Extend Tag interface and update AI prompts
2. **Additional AI Models**: Modify AITaggingService
3. **New Content Types**: Update database schema and parsers
4. **Enhanced Search**: Extend SearchService capabilities

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details.
