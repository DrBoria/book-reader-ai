# 📚 Book Reader AI Agent (DeepSeek R1)

Интеллектуальная система анализа и разметки PDF книг на базе **DeepSeek R1**. Полностью локальный AI агент, построенный на TypeScript, React и архитектуре LangGraph. Автоматически анализирует PDF книги и размечает контент по времени, людям, темам, локациям и пользовательским тегам.

🔒 **Полная приватность**: все данные обрабатываются локально, ничего не отправляется в интернет!

## ✨ Возможности

### 🤖 Анализ на базе DeepSeek R1
- Автоматическая разметка контента с помощью локальной AI модели
- Умное извлечение временных ссылок, людей, тем и локаций
- Контекстуальное понимание содержания книги
- Оценка релевантности размеченного контента
- **Архитектура LangGraph** - граф узлов и состояний для надежной обработки

### 📖 Book Processing
- PDF file upload and text extraction
- Page-by-page content analysis
- Metadata extraction (title, author)
- Support for various PDF formats

### 🏷️ Smart Tagging System
- **Default Tags**: Time, People, Theme, Location
- **Custom Tags**: Add your own categories
- Tag visualization (list view and tag cloud)
- Color-coded tag system
- Tag relevance scoring

### 💬 Interactive Chat
- Ask questions about your book content
- Get answers with page references and quotes
- Context-aware responses
- Search across all tagged content

### 🎨 Modern UI
- Clean, responsive React interface
- Real-time processing feedback
- Intuitive tag management
- Mobile-friendly design

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+ 
- **Ollama** для запуска DeepSeek R1
- Минимум 8 ГБ RAM (рекомендуется)

### Установка

1. **Установить Ollama и DeepSeek R1**
   ```bash
   # macOS
   brew install ollama
   
   # Linux  
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Запустить Ollama
   ollama serve
   
   # Скачать DeepSeek R1
   ollama pull deepseek-r1:7b
   ```

2. **Установить зависимости проекта**
   ```bash
   pnpm install
   ```

3. **Настроить переменные окружения**
   Создайте файл `.env` в корне проекта:
   ```env
   VITE_OLLAMA_HOST=http://localhost:11434
   VITE_DEEPSEEK_MODEL=deepseek-r1:7b
   ```

4. **Запустить проект**
   ```bash
   pnpm dev
   ```

5. **Открыть в браузере**
   Перейдите на `http://localhost:3000`

📖 **Подробная инструкция:** см. [DEEPSEEK_SETUP.md](./DEEPSEEK_SETUP.md)

## Usage

### 1. Upload a Book
- Click the upload area or drag & drop a PDF file
- The AI agent will automatically process and analyze the content
- Wait for the tagging process to complete

### 2. Explore Tags
- **List View**: Browse tags with counts and descriptions
- **Cloud View**: Visual tag cloud with size based on frequency
- Click any tag to see related content

### 3. View Tagged Content
- See all excerpts related to the selected tag
- Sort by page number or relevance score
- View full page context for each excerpt
- Read AI-generated explanations

### 4. Chat with Your Book
- Ask questions about any topic in the book
- Get responses with specific page references
- Examples:
  - "What time periods are covered?"
  - "Who are the main characters?"
  - "Summarize the themes in chapter 3"

### 5. Manage Tags
- Add custom tags for specific topics
- Choose colors and descriptions
- Create domain-specific categories

## 🏗️ Архитектура

### AI Agent Core (`DeepSeekBookTaggingAgent.ts`)
- **LangGraph архитектура** - граф состояний и узлов для надежной обработки
- Координирует рабочий процесс анализа PDF
- Управляет состоянием и обработкой тегов
- Взаимодействует с локальным DeepSeek R1 через Ollama
- Обеспечивает возможности вопросов-ответов

### LangGraph State Machine (`StateGraph.ts`)
- Собственная реализация паттернов LangGraph для браузера
- Управление состоянием с редьюсерами
- Узлы (nodes) для обработки логики
- Ребра (edges) для маршрутизации между узлами
- Условная маршрутизация на основе состояния

### PDF Processing (`pdfParser.ts`)
- Extracts text from PDF files
- Splits content into logical pages
- Handles metadata extraction
- Supports various PDF structures

### React Components
- **App**: Main application container
- **FileUpload**: PDF upload interface
- **TagPanel**: Tag visualization and selection
- **ContentDisplay**: Tagged content presentation
- **ChatInterface**: Interactive Q&A system
- **TagManager**: Custom tag creation

### Type System
- Comprehensive TypeScript interfaces
- Type-safe AI agent operations
- Structured data models for books, tags, and content

## Project Structure

```
src/
├── agent/
│   └── BookTaggingAgent.ts    # AI agent core logic
├── components/
│   ├── App.tsx               # Main application
│   ├── FileUpload.tsx        # File upload interface
│   ├── TagPanel.tsx          # Tag visualization
│   ├── ContentDisplay.tsx    # Content presentation
│   ├── ChatInterface.tsx     # Chat functionality
│   └── TagManager.tsx        # Tag management
├── types/
│   └── index.ts              # TypeScript interfaces
├── utils/
│   └── pdfParser.ts          # PDF processing
└── main.tsx                  # React entry point
```

## Technical Details

### AI Processing Pipeline
1. **PDF Upload** → Text extraction and page segmentation
2. **Content Analysis** → AI-powered content understanding
3. **Tag Extraction** → Identification of relevant content for each tag
4. **Context Generation** → AI explanations for tagged content
5. **Relevance Scoring** → Quality assessment of tag matches

### Tag Categories
- **Time**: Temporal references (dates, periods, eras)
- **People**: Mentioned individuals, characters, historical figures
- **Theme**: Topics, concepts, main ideas
- **Location**: Places, geographical references
- **Custom**: User-defined categories

## 🔌 Интеграция с AI

Система использует **DeepSeek R1** через Ollama для:
- Анализа контента и разметки тегами
- Генерации объяснений контекста  
- Ответов на вопросы по тексту
- Оценки релевантности найденного контента

### Преимущества локального DeepSeek R1:
- 🔒 **Полная приватность** - данные не покидают ваш компьютер
- 💰 **Бесплатно** - никаких API ключей и подписок
- ⚡ **Быстро** - обработка без сетевых задержек
- 🌐 **Офлайн** - работает без интернета

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Technologies
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **AI**: DeepSeek R1, Ollama, собственная реализация LangGraph паттернов
- **PDF**: PDF.js (pdfjs-dist) для браузерной обработки
- **Build**: Vite, PostCSS
- **Icons**: Lucide React
- **Архитектура**: LangGraph-inspired State Machine

## Future Enhancements

- [ ] Multiple book library management
- [ ] Export tagged content to various formats
- [ ] Advanced search and filtering
- [ ] Book comparison features
- [ ] Collaborative tagging
- [ ] Integration with note-taking apps
- [ ] OCR support for scanned PDFs
- [ ] Multi-language support

## Contributing

This project follows the AI agent patterns described in LangGraph documentation. Contributions are welcome for:

- New tag categories
- UI/UX improvements
- Performance optimizations
- Additional AI model support
- Testing and documentation

## License

MIT License - see LICENSE file for details.
