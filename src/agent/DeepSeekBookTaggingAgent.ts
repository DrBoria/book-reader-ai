import { Ollama } from "ollama/browser";
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

export class DeepSeekBookTaggingAgent {
  private ollama: Ollama;
  private graph: any;
  private currentState: BookTaggingState;
  private modelName: string;

  constructor(ollamaHost = "http://localhost:11434", modelName = "deepseek-r1:7b") {
    this.ollama = new Ollama({ host: ollamaHost });
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
      { id: "time", name: "Time", description: "Temporal references and periods", color: "#3B82F6", type: "default" },
      { id: "people", name: "People", description: "Mentioned persons and characters", color: "#EF4444", type: "default" },
      { id: "theme", name: "Theme", description: "Main topics and concepts", color: "#10B981", type: "default" },
      { id: "location", name: "Location", description: "Mentioned places and locations", color: "#F59E0B", type: "default" }
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
          content: "📚 Book processed successfully. Ready for content analysis.",
          timestamp: new Date()
        }],
        isProcessing: false,
        currentStep: "tag"
      };
    }
    return { currentStep: "ready" };
  }

  // Node: Tag content using DeepSeek R1 (main AI tagging logic)
  private async tagContentNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    if (!state.currentBook) {
      return { 
        messages: [{
          role: "assistant",
          content: "❌ No book available for analysis.",
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
          console.log(`Processed pages: ${processedPages}/${state.currentBook.pages.length}`);
        }
      } catch (error) {
        console.error(`Error processing page ${page.pageNumber}:`, error);
      }
    }

    return {
      taggedContent: newTaggedContent,
      messages: [{
        role: "assistant",
        content: `🏷️ Analyzed ${newTaggedContent.length} content fragments from ${state.currentBook.pages.length} pages.`,
        timestamp: new Date()
      }],
      currentStep: "complete"
    };
  }

  // Node: Answer user queries using DeepSeek R1
  private async answerQueryNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    if (!state.userQuery || !state.currentBook) {
      return {
        messages: [{
          role: "assistant",
          content: "❓ No query or book available for analysis.",
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

  // AI-powered tagging using DeepSeek R1
  private async tagPageContent(
    text: string, 
    pageNumber: number, 
    tags: Tag[]
  ): Promise<TaggedContent[]> {
    const prompt = this.buildTaggingPrompt(text, tags);
    
    try {
      const response = await this.ollama.chat({
        model: this.modelName,
        messages: [{ 
          role: "user", 
          content: prompt 
        }],
        options: {
          temperature: 0.1, // Low temperature for more accurate results
          top_p: 0.9
        }
      });

      const content = response.message.content || "";
      return this.parseTaggingResponse(content, text, pageNumber);
    } catch (error) {
      console.error("Error analyzing content with DeepSeek:", error);
      return [];
    }
  }

  private buildTaggingPrompt(text: string, tags: Tag[]): string {
    const tagDescriptions = tags.map(tag => 
      `${tag.name}: ${tag.description}`
    ).join(", ");

    return `<thinking>
I need to analyze the text and extract information for the following tags: ${tagDescriptions}.

I should find relevant fragments in the text for each tag and assess their relevance.
</thinking>

Analyze the following text and extract information for these tags: ${tagDescriptions}.

Text: "${text}"

Return ONLY a JSON array of objects in this format:
[
  {
    "tagId": "tag_id",
    "content": "relevant text excerpt",
    "relevance": 0.8,
    "context": "brief explanation"
  }
]

Do not add any additional text - only the JSON array.`;
  }

  private parseTaggingResponse(response: string, originalText: string, pageNumber: number): TaggedContent[] {
    try {
      // Extract JSON from response (DeepSeek might add extra text)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn("No JSON found in DeepSeek response");
        return [];
      }

      const cleanedResponse = jsonMatch[0];
      const parsed = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(parsed)) {
        console.warn("Response is not an array:", parsed);
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
      console.error("Error parsing DeepSeek response:", error);
      // Try simple heuristics for content extraction
      return this.fallbackTagExtraction(response, originalText, pageNumber);
    }
  }

  private fallbackTagExtraction(response: string, originalText: string, pageNumber: number): TaggedContent[] {
    // Simple heuristics if JSON parsing failed
    const results: TaggedContent[] = [];
    
    // Search for time mentions
    const timePatterns = [
      /\b\d{4}\s*(AD|BC|CE|BCE)?\b/g, // years
      /\b\d{1,2}\s*(January|February|March|April|May|June|July|August|September|October|November|December)/gi,
      /\b(at\s+that\s+time|then|later|earlier|after|before|during|when)\b/gi
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
            context: "Automatically extracted",
            originalText
          });
        });
      }
    });
    
    return results.slice(0, 3); // Limit the number
  }

  private findRelevantContent(query: string, taggedContent: TaggedContent[]): TaggedContent[] {
    const lowerQuery = query.toLowerCase();
    return taggedContent.filter(content =>
      content.content.toLowerCase().includes(lowerQuery) ||
      content.context?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit for better performance
  }

  private async generateAnswer(query: string, content: TaggedContent[]): Promise<string> {
    const contextText = content.map(c => 
      `Page ${c.pageNumber}: "${c.content}" (Context: ${c.context})`
    ).join("\n");

    const prompt = `<thinking>
The user asked: "${query}"

I have relevant content from the book:
${contextText}

I need to provide a detailed answer based on this content, including page references.
</thinking>

Based on the book content, answer this question: "${query}"

Relevant content:
${contextText}

Provide a detailed answer with page references and quotes from the book where applicable.`;

    try {
      const response = await this.ollama.chat({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        options: {
          temperature: 0.3,
          top_p: 0.9
        }
      });

      return response.message.content || "Could not generate a response.";
    } catch (error) {
      console.error("Error generating answer with DeepSeek:", error);
      return "❌ Error processing your question. Make sure DeepSeek R1 is running locally.";
    }
  }

  // Check if DeepSeek model is available
  async checkModelAvailability(): Promise<boolean> {
    try {
      const models = await this.ollama.list();
      return models.models.some(model => model.name.includes('deepseek'));
    } catch (error) {
      console.error("Error checking model availability:", error);
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
      console.error("Error processing book:", error);
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
      
      return lastMessage?.content || "No response generated.";
    } catch (error) {
      console.error("Error answering question:", error);
      return "❌ Error processing your question.";
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