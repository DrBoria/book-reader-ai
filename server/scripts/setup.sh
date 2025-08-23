#!/bin/bash

echo "🚀 Setting up Book Reader AI development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create uploads directory
mkdir -p uploads

# Start services with Docker Compose
echo "📦 Starting Neo4j and Redis with Docker Compose..."
cd "$(dirname "$0")/.." && docker-compose up -d

# Show status
echo "📊 Docker containers status:"
cd "$(dirname "$0")/.." && docker-compose ps

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if Neo4j is ready
echo "🔍 Checking Neo4j connection..."
for i in {1..30}; do
    if curl -s http://localhost:7474 > /dev/null; then
        echo "✅ Neo4j is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Neo4j failed to start"
        echo "💡 Try checking with: cd \"$(dirname \"$0\")\"/../.. && docker-compose logs neo4j"
        exit 1
    fi
    sleep 2
done

# Check if Redis is ready
echo "🔍 Checking Redis connection..."
for i in {1..30}; do
    # Try docker exec first, fallback to network check
    if (cd "$(dirname "$0")/.." && docker exec book-reader-redis redis-cli ping > /dev/null 2>&1); then
        echo "✅ Redis is ready!"
        break
    elif nc -z localhost 6379 > /dev/null 2>&1; then
        echo "✅ Redis port is accessible!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Redis failed to start"
        echo "💡 Try checking with: cd \"$(dirname \"$0\")\"/../.. && docker-compose logs redis"
        exit 1
    fi
    sleep 1
done

# Initialize database schema
echo "🗄️  Initializing database schema..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Run the TypeScript initialization script
cd "$(dirname "$0")/.."

if command -v tsx &> /dev/null; then
    npx tsx src/database/initSchema.ts
elif command -v ts-node &> /dev/null; then
    npx ts-node src/database/initSchema.ts
else
    echo "⚠️  Neither tsx nor ts-node found, building and running..."
    pnpm build && node dist/database/initSchema.js
fi

if [ $? -eq 0 ]; then
    echo "✅ Database schema initialized successfully!"
else
    echo "❌ Failed to initialize database schema"
    exit 1
fi

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start LM Studio and load DeepSeek R1 model"
echo "2. Run 'pnpm run dev' to start both backend and frontend"
echo ""
echo "🌐 Access points:"
echo "- Neo4j Browser: http://localhost:7474 (neo4j/password)"
echo "- Redis: localhost:6379 (via Docker)"
echo "- API Health Check: http://localhost:3001/health"
echo "- Frontend: http://localhost:5173"
echo ""
echo "🐳 Docker commands:"
echo "- Stop services: docker-compose down"
echo "- View logs: docker-compose logs -f"
echo "- Restart services: docker-compose restart"
