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

export class BookTaggingAgent {
  private openai: OpenAI;
  private graph: any;
  private currentState: BookTaggingState;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
    
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
      { id: "time", name: "Time", description: "Temporal references", color: "#3B82F6", type: "default" },
      { id: "people", name: "People", description: "Mentioned persons", color: "#EF4444", type: "default" },
      { id: "theme", name: "Theme", description: "Main topics", color: "#10B981", type: "default" },
      { id: "location", name: "Location", description: "Places mentioned", color: "#F59E0B", type: "default" }
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
          content: "Book processed successfully. Ready for tagging.",
          timestamp: new Date()
        }],
        isProcessing: false,
        currentStep: "tag"
      };
    }
    return { currentStep: "ready" };
  }

  // Node: Tag content using OpenAI (main AI tagging logic)
  private async tagContentNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    if (!state.currentBook) {
      return { 
        messages: [{
          role: "assistant",
          content: "No book available for tagging.",
          timestamp: new Date()
        }]
      };
    }

    const newTaggedContent: TaggedContent[] = [];
    
    // Process each page following the tagging workflow
    for (const page of state.currentBook.pages) {
      const pageTaggedContent = await this.tagPageContent(
        page.text, 
        page.pageNumber, 
        state.tags
      );
      newTaggedContent.push(...pageTaggedContent);
    }

    return {
      taggedContent: newTaggedContent,
      messages: [{
        role: "assistant",
        content: `Tagged ${newTaggedContent.length} content pieces from ${state.currentBook.pages.length} pages.`,
        timestamp: new Date()
      }],
      currentStep: "complete"
    };
  }

  // Node: Answer user queries (AI-powered Q&A)
  private async answerQueryNode(state: BookTaggingState): Promise<Partial<BookTaggingState>> {
    if (!state.userQuery || !state.currentBook) {
      return {
        messages: [{
          role: "assistant",
          content: "No query or book available.",
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

  // AI-powered tagging using OpenAI
  private async tagPageContent(
    text: string, 
    pageNumber: number, 
    tags: Tag[]
  ): Promise<TaggedContent[]> {
    const prompt = this.buildTaggingPrompt(text, tags);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });

      const content = response.choices[0].message.content || "";
      return this.parseTaggingResponse(content, text, pageNumber);
    } catch (error) {
      console.error("Error tagging content:", error);
      return [];
    }
  }

  private buildTaggingPrompt(text: string, tags: Tag[]): string {
    const tagDescriptions = tags.map(tag => 
      `${tag.name}: ${tag.description}`
    ).join(", ");

    return `Analyze the following text and extract information for these tags: ${tagDescriptions}.

Text: "${text}"

Return a JSON array of objects with format:
{
  "tagId": "tag_id",
  "content": "relevant text excerpt",
  "relevance": 0.8,
  "context": "brief explanation"
}

Only return the JSON array, no additional text.`;
  }

  private parseTaggingResponse(response: string, originalText: string, pageNumber: number): TaggedContent[] {
    try {
      // Clean the response to extract JSON
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
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
      console.error("Error parsing tagging response:", error);
      return [];
    }
  }

  private findRelevantContent(query: string, taggedContent: TaggedContent[]): TaggedContent[] {
    const lowerQuery = query.toLowerCase();
    return taggedContent.filter(content =>
      content.content.toLowerCase().includes(lowerQuery) ||
      content.context?.toLowerCase().includes(lowerQuery)
    );
  }

  private async generateAnswer(query: string, content: TaggedContent[]): Promise<string> {
    const contextText = content.map(c => 
      `Page ${c.pageNumber}: "${c.content}" (Context: ${c.context})`
    ).join("\n");

    const prompt = `Based on the following book content, answer this question: "${query}"

Relevant content:
${contextText}

Provide a detailed answer with page references where applicable.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      });

      return response.choices[0].message.content || "I couldn't generate a response.";
    } catch (error) {
      console.error("Error generating answer:", error);
      return "Error processing your question.";
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
      return "Error processing your question.";
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
