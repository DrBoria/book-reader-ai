# Book Reader AI Agent

AI-powered book analysis system with real-time tagging and intelligent chat interface.

## Architecture

This application consists of:
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Express.js + TypeScript
- **Database**: Neo4j (Graph Database)
- **Queue**: Redis + Bull Queue
- **AI**: LM Studio + DeepSeek R1 model
- **Real-time**: WebSocket (Socket.io)

## Features

1. **PDF Upload & Processing**: Upload books and process them asynchronously
2. **AI Tagging**: Automatic content tagging using DeepSeek R1 via LM Studio
3. **Graph Database**: Store tagged content in Neo4j for fast retrieval
4. **Real-time Updates**: See processing progress in real-time
5. **Smart Chat**: Ask questions about your books with AI-powered responses
6. **Custom Tags**: Create and manage your own content tags

## Prerequisites

### Required Software

1. **Node.js** (v18 or later)
2. **Neo4j** (v5.x)
3. **Redis** (v6.x or later)
4. **LM Studio** with DeepSeek R1 model

### Setup Instructions

#### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

#### 2. Setup Database Services (Docker)

Используем Docker Compose для запуска Neo4j и Redis:

```bash
# Запустить все сервисы в фоне
cd server
docker-compose up -d

# Проверить статус сервисов
docker-compose ps

# Посмотреть логи при необходимости
docker-compose logs neo4j
docker-compose logs redis
```

**Альтернативная установка без Docker:**

<details>
<summary>Ручная установка Neo4j и Redis</summary>

**Neo4j:**
1. Download and install Neo4j Desktop
2. Create a new database  
3. Set password for 'neo4j' user
4. Start the database

**Redis:**
```bash
# macOS с Homebrew
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
```
</details>

#### 3. Setup LM Studio

1. Download LM Studio from https://lmstudio.ai/
2. Install DeepSeek R1 model (or compatible model)
3. Start local server on port 1234
4. Verify model is loaded and accessible

#### 4. Environment Configuration

Create `.env` file in the `server` directory:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here

# LM Studio Configuration
LM_STUDIO_HOST=http://localhost:1234
LM_STUDIO_MODEL=deepseek/deepseek-r1-0528-qwen3-8b

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

Create `.env.local` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## Running the Application

### Быстрый старт с Docker

```bash
# 1. Запустить базы данных
cd server
./scripts/setup.sh

# 2. Настроить LM Studio
# Открыть LM Studio, загрузить модель DeepSeek R1, запустить локальный сервер

# 3. Запустить backend (новый терминал)
npm run dev

# 4. Запустить frontend (новый терминал)
cd ..
npm run dev
```

### Подробные шаги

#### 1. Start Backend Services

```bash
# Запустить Neo4j и Redis с Docker
cd server
docker-compose up -d

# Или использовать setup скрипт для автоматической настройки
./scripts/setup.sh

# Запустить LM Studio сервер
# Открыть LM Studio, загрузить DeepSeek R1 модель, запустить локальный сервер
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
# Остановить все сервисы
docker-compose down

# Перезапустить сервисы  
docker-compose restart

# Просмотр логов
docker-compose logs -f

# Очистить данные (ВНИМАНИЕ: удалит все данные!)
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
