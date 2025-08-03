import { OpenAI } from "openai";
import { StateGraph, START, END, BaseMessage, addMessages, GraphState } from "../langgraph/StateGraph";
import { Tag, BookContent, TaggedContent, AgentState } from "../types";

// Define the agent's state structure following LangGraph patterns
interface BookTaggingState extends GraphState {
  messages: BaseMessage[];
  currentBook: BookContent | null;
  tags: Tag[];
  taggedContent: TaggedContent[];
  isProcessing: boolean;
  currentStep: string;
  userQuery: string;
}

export class LMStudioBookTaggingAgent {
  private openai: OpenAI;
  private graph: any;
  private currentState: BookTaggingState;
  private modelName: string;

  constructor(lmStudioHost = "http://192.168.1.178:1234", modelName = "deepseek/deepseek-r1-0528-qwen3-8b") {
    // Configure OpenAI client to use LM Studio
    // Ensure proper URL formatting - remove trailing slash if present
    const cleanHost = lmStudioHost.replace(/\/$/, '');
    this.openai = new OpenAI({ 
      baseURL: `${cleanHost}/v1`,
      apiKey: "lm-studio", // LM Studio не требует настоящий API ключ
      dangerouslyAllowBrowser: true
    });
    this.modelName = modelName;
    
    this.currentState = {
      messages: [],
      currentBook: null,
      tags: this.getDefaultTags(),
      taggedContent: [],
      isProcessing: false,
      currentStep: "ready",
      userQuery: ""
    };
    
    this.graph = this.createGraph();
  }

  private getDefaultTags(): Tag[] {
    return [
      { id: "time", name: "Время", description: "Временные ссылки и периоды", color: "#3B82F6", type: "default" },
      { id: "people", name: "Люди", description: "Упоминаемые лица и персонажи", color: "#EF4444", type: "default" },
      { id: "theme", name: "Тема", description: "Основные темы и концепции", color: "#10B981", type: "default" },
      { id: "location", name: "Локация", description: "Упоминаемые места", color: "#F59E0B", type: "default" }
    ];
  }

  private createGraph() {
    // Create StateGraph with proper state definition following LangGraph patterns
    const workflow = new StateGraph<BookTaggingState>({
      messages: {
        reducer: addMessages,
        default: () => []
      },
      currentBook: {
        reducer: (current: BookContent | null, update: BookContent | null) => update ?? current,
        default: () => null
      },
      tags: {
        reducer: (current: Tag[], update: Tag[]) => update.length > 0 ? update : current,
        default: () => this.getDefaultTags()
      },
      taggedContent: {
        reducer: (current: TaggedContent[], update: TaggedContent[]) => [...current, ...update],
        default: () => []
      },
      isProcessing: {
        reducer: (current: boolean, update: boolean) => update,
        default: () => false
      },
      currentStep: {
        reducer: (current: string, update: string) => update || current,
        default: () => "ready"
      },
      userQuery: {
        reducer: (current: string, update: string) => update || current,
        default: () => ""
      }
    });

    // Add nodes (functions that process the state)
    workflow.addNode("processBook", this.processBookNode.bind(this));
    workflow.addNode("tagContent", this.tagContentNode.bind(this));
    workflow.addNode("answerQuery", this.answerQueryNode.bind(this));
    workflow.addNode("complete", this.completeNode.bind(this));

    // Add edges following LangGraph routing patterns
    workflow.addEdge(START, "processBook");
    
    workflow.addConditionalEdge(
      "processBook",
      this.routeAfterProcessing.bind(this),
      {
        "tag": "tagContent",
        "query": "answerQuery", 
        "complete": "complete"
      }
    );
    
    workflow.addEdge("tagContent", "complete");
    workflow.addEdge("answerQuery", "complete");
    workflow.addEdge("complete", END);

    return workflow.compile();
  }

  // Node: Process PDF book (following LangGraph node pattern)
  private async processBookNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    if (state.currentBook && state.currentStep === "processBook") {
      return {
        messages: [{
          role: "assistant",
          content: "📚 Книга обработана успешно. Готов к анализу содержимого с помощью DeepSeek R1.",
          timestamp: new Date()
        }],
        isProcessing: false,
        currentStep: "tag"
      };
    }
    return { currentStep: "ready" };
  }

  // Node: Tag content using DeepSeek R1 via LM Studio
  private async tagContentNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    if (!state.currentBook) {
      return { 
        messages: [{
          role: "assistant",
          content: "❌ Нет доступной книги для анализа.",
          timestamp: new Date()
        }]
      };
    }

    const newTaggedContent: TaggedContent[] = [];
    
    // Process each page following the tagging workflow
    let processedPages = 0;
    for (const page of state.currentBook.pages) {
      try {
        const pageTaggedContent = await this.tagPageContent(
          page.text, 
          page.pageNumber, 
          state.tags
        );
        newTaggedContent.push(...pageTaggedContent);
        processedPages++;
        
        // Progress feedback
        if (processedPages % 5 === 0) {
          console.log(`Обработано страниц: ${processedPages}/${state.currentBook.pages.length}`);
        }
      } catch (error) {
        console.error(`Ошибка обработки страницы ${page.pageNumber}:`, error);
      }
    }

    return {
      taggedContent: newTaggedContent,
      messages: [{
        role: "assistant",
        content: `🏷️ Проанализировано ${newTaggedContent.length} фрагментов из ${state.currentBook.pages.length} страниц с помощью DeepSeek R1.`,
        timestamp: new Date()
      }],
      currentStep: "complete"
    };
  }

  // Node: Answer user queries using DeepSeek R1 via LM Studio
  private async answerQueryNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    if (!state.userQuery || !state.currentBook) {
      return {
        messages: [{
          role: "assistant",
          content: "❓ Нет вопроса или книги для анализа.",
          timestamp: new Date()
        }]
      };
    }

    const relevantContent = this.findRelevantContent(state.userQuery, state.taggedContent);
    const answer = await this.generateAnswer(state.userQuery, relevantContent);

    return {
      messages: [
        {
          role: "user",
          content: state.userQuery,
          timestamp: new Date()
        },
        {
          role: "assistant", 
          content: answer,
          timestamp: new Date()
        }
      ],
      userQuery: "",
      currentStep: "complete"
    };
  }

  // Node: Complete processing
  private async completeNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    return {
      isProcessing: false,
      currentStep: "ready"
    };
  }

  // Router function for conditional edges (LangGraph pattern)
  private routeAfterProcessing(state: BookTaggingState): string {
    if (state.userQuery) return "query";
    if (state.currentStep === "tag") return "tag";
    return "complete";
  }

  // AI-powered tagging using DeepSeek R1 via LM Studio
  private async tagPageContent(
    text: string, 
    pageNumber: number, 
    tags: Tag[]
  ): Promise<TaggedContent[]> {
    const prompt = this.buildTaggingPrompt(text, tags);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ 
          role: "user", 
          content: prompt 
        }],
        temperature: 0.1, // Низкая температура для более точных результатов
        max_tokens: 1000,
        top_p: 0.9
      });

      const content = response.choices[0].message.content || "";
      return this.parseTaggingResponse(content, text, pageNumber);
    } catch (error) {
      console.error("Ошибка анализа контента с DeepSeek R1 (LM Studio):", error);
      return [];
    }
  }

  private buildTaggingPrompt(text: string, tags: Tag[]): string {
    const tagDescriptions = tags.map(tag => 
      `${tag.name}: ${tag.description}`
    ).join(", ");

    return `<thinking>
Мне нужно проанализировать текст и извлечь информацию по следующим тегам: ${tagDescriptions}.

Я должен найти в тексте релевантные фрагменты для каждого тега и оценить их релевантность.
</thinking>

Проанализируй следующий текст и извлеки информацию по тегам: ${tagDescriptions}.

Текст: "${text}"

Верни ТОЛЬКО JSON массив объектов в формате:
[
  {
    "tagId": "id_тега",
    "content": "релевантный фрагмент текста",
    "relevance": 0.8,
    "context": "краткое объяснение"
  }
]

Не добавляй никакого дополнительного текста - только JSON массив.`;
  }

  private parseTaggingResponse(response: string, originalText: string, pageNumber: number): TaggedContent[] {
    try {
      // Extract JSON from response (DeepSeek might add extra text)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn("Не найден JSON в ответе DeepSeek");
        return [];
      }

      const cleanedResponse = jsonMatch[0];
      const parsed = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(parsed)) {
        console.warn("Ответ не является массивом:", parsed);
        return [];
      }

      return parsed.map((item: any) => ({
        id: Math.random().toString(36),
        tagId: item.tagId,
        content: item.content,
        pageNumber,
        relevance: item.relevance || 0.5,
        context: item.context,
        originalText
      }));
    } catch (error) {
      console.error("Ошибка парсинга ответа DeepSeek:", error);
      // Fallback простая эвристика
      return this.fallbackTagExtraction(response, originalText, pageNumber);
    }
  }

  private fallbackTagExtraction(response: string, originalText: string, pageNumber: number): TaggedContent[] {
    // Простая эвристика если JSON парсинг не удался
    const results: TaggedContent[] = [];
    
    // Поиск упоминаний времени
    const timePatterns = [
      /\b\d{4}\s*г\.?/g, // годы
      /\b\d{1,2}\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/gi,
      /\b(в\s+то\s+время|тогда|позже|раньше|после|до)/gi
    ];
    
    timePatterns.forEach(pattern => {
      const matches = originalText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          results.push({
            id: Math.random().toString(36),
            tagId: "time",
            content: match,
            pageNumber,
            relevance: 0.6,
            context: "Автоматически извлечено",
            originalText
          });
        });
      }
    });
    
    return results.slice(0, 3); // Ограничиваем количество
  }

  private findRelevantContent(query: string, taggedContent: TaggedContent[]): TaggedContent[] {
    const lowerQuery = query.toLowerCase();
    return taggedContent.filter(content =>
      content.content.toLowerCase().includes(lowerQuery) ||
      content.context?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Ограничиваем для лучшей производительности
  }

  private async generateAnswer(query: string, content: TaggedContent[]): Promise<string> {
    const contextText = content.map(c => 
      `Страница ${c.pageNumber}: "${c.content}" (Контекст: ${c.context})`
    ).join("\n");

    const prompt = `<thinking>
Пользователь задал вопрос: "${query}"

У меня есть релевантный контент из книги:
${contextText}

Мне нужно дать подробный ответ на основе этого контента, указав страницы и цитаты.
</thinking>

На основе содержимого книги ответь на вопрос: "${query}"

Релевантный контент:
${contextText}

Дай подробный ответ с указанием страниц и цитат из книги.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
        top_p: 0.9
      });

      return response.choices[0].message.content || "Не удалось сгенерировать ответ.";
    } catch (error) {
      console.error("Ошибка генерации ответа с DeepSeek R1 (LM Studio):", error);
      return "❌ Ошибка обработки вопроса. Убедитесь, что LM Studio запущен и модель загружена.";
    }
  }

  // Check if LM Studio and model are available
  async checkModelAvailability(): Promise<boolean> {
    try {
      const response = await this.openai.models.list();
      return response.data.some(model => model.id.includes('deepseek'));
    } catch (error) {
      console.error("Ошибка проверки доступности LM Studio:", error);
      return false;
    }
  }

  // Public API methods
  async processBook(content: BookContent): Promise<void> {
    try {
      const result = await this.graph.invoke({
        currentBook: content,
        isProcessing: true,
        currentStep: "processBook"
      });
      
      this.currentState = { ...this.currentState, ...result };
    } catch (error) {
      console.error("Ошибка обработки книги:", error);
      this.currentState.isProcessing = false;
    }
  }

  async answerQuestion(question: string): Promise<string> {
    try {
      const result = await this.graph.invoke({
        ...this.currentState,
        userQuery: question,
        currentStep: "query"
      });
      
      this.currentState = { ...this.currentState, ...result };
      
      // Extract the last assistant message
      const assistantMessages = this.currentState.messages.filter(m => m.role === "assistant");
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      
      return lastMessage?.content || "Ответ не сгенерирован.";
    } catch (error) {
      console.error("Ошибка ответа на вопрос:", error);
      return "❌ Ошибка обработки вопроса.";
    }
  }

  addCustomTag(tag: Omit<Tag, "id" | "type">): string {
    const newTag: Tag = {
      ...tag,
      id: Math.random().toString(36),
      type: "custom"
    };
    this.currentState.tags.push(newTag);
    return newTag.id;
  }

  getState(): AgentState {
    return {
      messages: this.currentState.messages.map(m => ({
        id: Math.random().toString(36),
        type: m.role === "user" ? "user" : "assistant",
        content: m.content,
        timestamp: m.timestamp || new Date()
      })),
      currentBook: this.currentState.currentBook,
      tags: this.currentState.tags,
      taggedContent: this.currentState.taggedContent,
      isProcessing: this.currentState.isProcessing,
      currentStep: this.currentState.currentStep
    };
  }

  getContentByTag(tagId: string): TaggedContent[] {
    return this.currentState.taggedContent.filter(content => content.tagId === tagId);
  }
}
