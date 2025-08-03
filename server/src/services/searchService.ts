import { database } from '../database/neo4j';
import { SearchQuery, SearchResult, TaggedContent, ContentReference } from '../types';
import { AITaggingService } from './aiTagging';

export class SearchService {
  private aiService: AITaggingService;

  constructor() {
    this.aiService = new AITaggingService();
  }

  async searchContent(query: SearchQuery): Promise<SearchResult[]> {
    const session = await database.getSession();
    try {
      let cypher = `
        MATCH (b:Book)-[:HAS_PAGE]->(p:Page)-[:HAS_CONTENT]->(c:Content)-[:TAGGED_AS]->(t:Tag)
        WHERE toLower(c.content) CONTAINS toLower($query)
        OR toLower(c.context) CONTAINS toLower($query)
      `;
      
      const params: any = { query: query.query };
      
      if (query.bookIds && query.bookIds.length > 0) {
        cypher += ` AND b.id IN $bookIds`;
        params.bookIds = query.bookIds;
      }
      
      if (query.tagIds && query.tagIds.length > 0) {
        cypher += ` AND t.id IN $tagIds`;
        params.tagIds = query.tagIds;
      }
      
      cypher += `
        RETURN c, b, t, p.pageNumber as pageNumber
        ORDER BY c.relevance DESC, c.createdAt DESC
        LIMIT $limit
      `;
      
      params.limit = query.limit || 20;
      
      const result = await session.run(cypher, params);
      
      return result.records.map(record => {
        const content = record.get('c').properties;
        const book = record.get('b').properties;
        const tag = record.get('t').properties;
        const pageNumber = record.get('pageNumber');
        
        // Simple text matching score
        const score = this.calculateRelevanceScore(query.query, content.content);
        const highlights = this.extractHighlights(query.query, content.content);
        
        return {
          content: {
            ...content,
            pageNumber,
            createdAt: new Date(content.createdAt)
          } as TaggedContent,
          book: {
            ...book,
            uploadedAt: new Date(book.uploadedAt),
            processedAt: book.processedAt ? new Date(book.processedAt) : undefined
          },
          score,
          highlights
        };
      });
    } finally {
      await session.close();
    }
  }

  async getContentByTag(tagId: string, bookId?: string): Promise<TaggedContent[]> {
    const session = await database.getSession();
    try {
      let cypher = `
        MATCH (p:Page)-[:HAS_CONTENT]->(c:Content)-[:TAGGED_AS]->(t:Tag {id: $tagId})
      `;
      
      const params: any = { tagId };
      
      if (bookId) {
        cypher = `
          MATCH (b:Book {id: $bookId})-[:HAS_PAGE]->(p:Page)-[:HAS_CONTENT]->(c:Content)-[:TAGGED_AS]->(t:Tag {id: $tagId})
        `;
        params.bookId = bookId;
      }
      
      cypher += `
        RETURN c, p.pageNumber as pageNumber
        ORDER BY c.relevance DESC, c.createdAt DESC
      `;
      
      const result = await session.run(cypher, params);
      
      return result.records.map(record => {
        const content = record.get('c').properties;
        const pageNumber = record.get('pageNumber');
        
        return {
          ...content,
          pageNumber,
          createdAt: new Date(content.createdAt)
        } as TaggedContent;
      });
    } finally {
      await session.close();
    }
  }

  async answerQuestion(question: string, bookIds?: string[], tagId?: string): Promise<{
    answer: string;
    references: ContentReference[];
  }> {
    // Find relevant content
    const searchQuery: SearchQuery = {
      query: question,
      bookIds,
      limit: 10
    };
    
    if (tagId) {
      searchQuery.tagIds = [tagId];
    }
    
    const searchResults = await this.searchContent(searchQuery);
    
    if (searchResults.length === 0) {
      return {
        answer: "Извините, я не нашел релевантной информации в загруженных книгах.",
        references: []
      };
    }
    
    // Prepare context for AI
    const contextText = searchResults.map(result => 
      `Книга: "${result.book.title}", Страница ${result.content.pageNumber}: "${result.content.content}"`
    ).join('\n\n');
    
    // Generate answer using AI
    const answer = await this.generateAnswerWithContext(question, contextText);
    
    // Prepare references
    const references: ContentReference[] = searchResults.map(result => ({
      bookId: result.book.id,
      pageNumber: result.content.pageNumber,
      quote: result.content.content,
      tagId: result.content.tagId
    }));
    
    return { answer, references };
  }

  private async generateAnswerWithContext(question: string, context: string): Promise<string> {
    // This would use the AI service to generate a comprehensive answer
    // For now, return a simple response
    return `На основе найденной информации в книгах:\n\n${context}\n\nОтвет на вопрос "${question}" можно найти в указанных фрагментах выше.`;
  }

  private calculateRelevanceScore(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Simple scoring: exact matches get higher scores
    if (contentLower.includes(queryLower)) {
      const position = contentLower.indexOf(queryLower);
      const relativePosition = position / content.length;
      return Math.max(0.5, 1 - relativePosition);
    }
    
    // Word-based matching
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    
    const matchingWords = queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word))
    );
    
    return matchingWords.length / queryWords.length;
  }

  private extractHighlights(query: string, content: string, maxLength = 200): string[] {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    const highlights: string[] = [];
    let startIndex = 0;
    
    while (true) {
      const index = contentLower.indexOf(queryLower, startIndex);
      if (index === -1) break;
      
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + queryLower.length + 50);
      const highlight = content.substring(start, end);
      
      highlights.push(highlight);
      startIndex = index + queryLower.length;
      
      if (highlights.length >= 3) break; // Limit highlights
    }
    
    return highlights;
  }
}
