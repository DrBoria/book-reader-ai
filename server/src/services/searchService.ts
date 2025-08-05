import { database } from '../database/neo4j';
import { SearchQuery, SearchResult, TaggedContent, ContentReference } from '../types';
import { AITaggingService } from './aiTagging';
import { config } from '../config';
import { OpenAI } from 'openai';
import neo4j from 'neo4j-driver';

export class SearchService {
  private aiService: AITaggingService;
  private openai: OpenAI;

  constructor() {
    this.aiService = new AITaggingService();
    
    const cleanHost = config.lmStudio.host.replace(/\/$/, '');
    this.openai = new OpenAI({
      baseURL: `${cleanHost}/v1`,
      apiKey: 'lm-studio'
    });
  }



  async searchContent(query: SearchQuery): Promise<SearchResult[]> {
    const session = await database.getSession();
    try {
      let cypher = `
        MATCH (b:Book)-[:HAS_PAGE]->(p:Page)-[:HAS_CONTENT]->(c:Content)-[:TAGGED_AS]->(t:Tag)
      `;
      
      // Handle search terms - either single query or array of terms
      const searchTerms = query.searchTerms || (query.query ? [query.query] : []);
      
      console.log('Search terms:', searchTerms);
      
      if (searchTerms.length > 0) {
        // Build OR conditions for each search term
        const searchConditions = searchTerms.map((_, index) => `
          (toLower(c.content) CONTAINS toLower($term${index})
          OR toLower(c.context) CONTAINS toLower($term${index})
          OR toLower(c.originalText) CONTAINS toLower($term${index}))
        `).join(' OR ');
        
        cypher += ` WHERE ${searchConditions}`;
      }
      
      const params: any = {};
      
      // Add search term parameters
      searchTerms.forEach((term, index) => {
        params[`term${index}`] = term;
      });
      
      // Handle additional filters
      let hasWhereClause = searchTerms.length > 0;
      
      if (query.bookIds && query.bookIds.length > 0) {
        cypher += hasWhereClause ? ` AND b.id IN $bookIds` : ` WHERE b.id IN $bookIds`;
        params.bookIds = query.bookIds;
        hasWhereClause = true;
      }
      
      if (query.tagIds && query.tagIds.length > 0) {
        cypher += hasWhereClause ? ` AND t.id IN $tagIds` : ` WHERE t.id IN $tagIds`;
        params.tagIds = query.tagIds;
        hasWhereClause = true;
      }
      
      cypher += `
        RETURN c, b, t, p.pageNumber as pageNumber
        ORDER BY c.relevance DESC, c.createdAt DESC
        LIMIT $limit
      `;
      
      params.limit = neo4j.int(Math.floor(Number(query.limit) || 20));
      
      const result = await session.run(cypher, params);
      
      return result.records.map(record => {
        const content = record.get('c').properties;
        const book = record.get('b').properties;
        const tag = record.get('t').properties;
        const pageNumber = record.get('pageNumber');
        
        // Simple text matching score
        const searchQuery = query.query || '';
        const score = this.calculateRelevanceScore(searchQuery, content.content);
        const highlights = this.extractHighlights(searchQuery, content.content);
        
        return {
          content: {
            id: content.id || '',
            bookId: content.bookId || '',
            pageId: content.pageId || '',
            tagId: tag.id || '',
            content: content.content || '',
            pageNumber: pageNumber || 0,
            relevance: content.relevance || 0,
            context: content.context || '',
            originalText: content.originalText || '',
            createdAt: content.createdAt ? new Date(content.createdAt).toISOString() : new Date().toISOString()
          } as TaggedContent,
          book: {
            id: book.id || '',
            title: book.title || 'Untitled',
            author: book.author || 'Unknown Author',
            filename: book.filename || '',
            totalPages: book.totalPages || 0,
            uploadedAt: book.uploadedAt ? new Date(book.uploadedAt).toISOString() : new Date().toISOString(),
            processedAt: book.processedAt ? new Date(book.processedAt).toISOString() : undefined,
            status: book.status || 'completed'
          },
          score,
          highlights: highlights || []
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
          createdAt: content.createdAt ? new Date(content.createdAt).toISOString() : new Date().toISOString(),
          content: content.content || '',
          relevance: content.relevance || 0,
          context: content.context || '',
          originalText: content.originalText || '',
          tagId: tagId
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
    try {
      // Step 1: AI analyzes question and decides what data to retrieve
      const searchStrategy = await this.analyzeQuestionForSearch(question);
      console.log('Search strategy:', searchStrategy);
      
      // Step 2: Execute database queries based on AI analysis
      const relevantData = await this.retrieveRelevantData(searchStrategy, bookIds, tagId);
      
      if (relevantData.length === 0) {
        return {
          answer: "I couldn't find relevant information in the loaded books.",
          references: []
        };
      }
      
      // Step 3: AI generates answer using only relevant data
      const contextText = relevantData.slice(0, 10).map(result => 
        `Book: "${result.book.title}", Page ${result.content.pageNumber}: "${result.content.content}"`
      ).join('\n\n');
      
      const answer = await this.generateAnswerWithContext(question, contextText);
      
      const references: ContentReference[] = relevantData.slice(0, 10).map(result => ({
        bookId: result.book.id,
        pageNumber: result.content.pageNumber,
        quote: result.content.content,
        tagId: result.content.tagId
      }));
      
      return { answer, references };
    } catch (error) {
      console.error('Error in answerQuestion:', error);
      return {
        answer: "An error occurred while processing the question.",
        references: []
      };
    }
  }

  private async getCategoriesWithKeywords(): Promise<Array<{name: string; keywords: string[]}>> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (cat:TagCategory)
        RETURN cat.name as name, cat.keywords as keywords
        ORDER BY cat.name
      `);
      
      return result.records.map(record => ({
        name: record.get('name'),
        keywords: record.get('keywords') || []
      }));
    } finally {
      await session.close();
    }
  }

  private async analyzeQuestionForSearch(question: string): Promise<{
    categories: string[];
    keywords: string[];
    timeFrame?: string;
    needsSpecific: boolean;
  }> {
    try {
      // First, get all categories with their keywords from database
      const categoriesWithKeywords = await this.getCategoriesWithKeywords();
      
      const categoryGuidelines = categoriesWithKeywords.map(cat => 
        `- If question contains keywords: [${cat.keywords.join(', ')}] → include "${cat.name}"`
      ).join('\n');

      const prompt = `Analyze this question and determine the best search strategy for a graph database containing books, tags, and content.

Question: "${question}"

Available tag categories: ${categoriesWithKeywords.map(c => `"${c.name}"`).join(', ')}

Return a JSON object with:
- categories: array of relevant tag categories 
- keywords: array of important keywords from the question
- timeFrame: if question asks about time/dates, specify the time period
- needsSpecific: boolean - true if question needs specific facts, false if asking for general overview

Guidelines:
${categoryGuidelines}
- Extract meaningful keywords regardless of language
- If question is general/broad, set needsSpecific to false

Examples:
{"categories": ["Time", "People"], "keywords": ["war", "leaders"], "timeFrame": "1940s", "needsSpecific": true}
{"categories": ["Location"], "keywords": ["action", "events"], "needsSpecific": true}

Response:`;

      const response = await this.openai.chat.completions.create({
        model: config.lmStudio.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });

      const content = response.choices[0].message.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback - simple keyword extraction
      return {
        categories: [],
        keywords: question.toLowerCase().split(/\s+/).filter(word => word.length > 3),
        needsSpecific: true
      };
    } catch (error) {
      console.error('Failed to analyze question:', error);
      return {
        categories: [],
        keywords: question.toLowerCase().split(/\s+/).filter(word => word.length > 3),
        needsSpecific: true
      };
    }
  }

  private async retrieveRelevantData(
    strategy: { categories: string[]; keywords: string[]; timeFrame?: string; needsSpecific: boolean },
    bookIds?: string[],
    tagId?: string
  ): Promise<SearchResult[]> {
    const session = await database.getSession();
    try {
      let cypher = `
        MATCH (b:Book)-[:HAS_PAGE]->(p:Page)-[:HAS_CONTENT]->(c:Content)-[:TAGGED_AS]->(t:Tag)
        MATCH (t)-[:BELONGS_TO]->(cat:TagCategory)
      `;
      
      const params: any = {};
      const conditions: string[] = [];
      
      // Filter by categories if specified
      if (strategy.categories.length > 0) {
        // Map English category names to database IDs
        const categoryMapping: Record<string, string> = {
          'Time': 'time',
          'People': 'people', 
          'Location': 'location'
        };
        
        const categoryIds = strategy.categories.map(cat => categoryMapping[cat]).filter(Boolean);
        if (categoryIds.length > 0) {
          conditions.push('cat.id IN $categoryIds');
          params.categoryIds = categoryIds;
        }
      }
      
      // Filter by keywords in content
      if (strategy.keywords.length > 0) {
        const keywordConditions = strategy.keywords.map((_, index) => 
          `toLower(c.content) CONTAINS toLower($keyword${index}) OR toLower(c.originalText) CONTAINS toLower($keyword${index})`
        );
        conditions.push(`(${keywordConditions.join(' OR ')})`);
        
        strategy.keywords.forEach((keyword, index) => {
          params[`keyword${index}`] = keyword;
        });
      }
      
      // Filter by time frame if specified
      if (strategy.timeFrame) {
        conditions.push('toLower(c.content) CONTAINS toLower($timeFrame) OR toLower(t.name) CONTAINS toLower($timeFrame)');
        params.timeFrame = strategy.timeFrame;
      }
      
      // Add book and tag filters
      if (bookIds && bookIds.length > 0) {
        conditions.push('b.id IN $bookIds');
        params.bookIds = bookIds;
      }
      
      if (tagId) {
        conditions.push('t.id = $tagId');
        params.tagId = tagId;
      }
      
      if (conditions.length > 0) {
        cypher += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      cypher += `
        RETURN c, b, t, p.pageNumber as pageNumber
        ORDER BY c.relevance DESC, c.createdAt DESC
        LIMIT $limit
      `;
      
      params.limit = neo4j.int(strategy.needsSpecific ? 10 : 20);
      
      console.log('Executing cypher:', cypher);
      console.log('With params:', params);
      
      const result = await session.run(cypher, params);
      
      return result.records.map(record => {
        const content = record.get('c').properties;
        const book = record.get('b').properties;
        const tag = record.get('t').properties;
        const pageNumber = record.get('pageNumber');
        
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
          score: parseFloat(content.relevance) || 0.5
        };
      });
    } finally {
      await session.close();
    }
  }

  private async generateAnswerWithContext(question: string, context: string): Promise<string> {
    try {
      const prompt = `Answer the following question based on the provided book content. Give a direct, informative answer in the same language as the question.

Question: ${question}

Book content:
${context}

Instructions:
- Answer directly and specifically
- Use information from the book content
- If you find specific dates, names, or places, mention them
- Keep the answer concise but informative
- Answer in the same language as the question`;

      const response = await this.openai.chat.completions.create({
        model: config.lmStudio.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content || `Sorry, I couldn't generate an answer based on the available content.`;
      
      // Remove <think> tags from DeepSeek responses
      return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    } catch (error) {
      console.error('Failed to generate AI answer:', error);
      return `Based on the book content, please refer to the provided references for information about: ${question}`;
    }
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
