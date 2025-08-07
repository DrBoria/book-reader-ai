import { database } from '../database/neo4j';
import { SearchQuery, SearchResult, TaggedContent, ContentReference, BookContent } from '../types';
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
      
      return result.records.map((record: any) => {
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
            createdAt: content.createdAt ? new Date(content.createdAt) : new Date()
          } as TaggedContent,
          book: {
            id: book.id || '',
            title: book.title || 'Untitled',
            author: book.author || 'Unknown Author',
            filename: book.filename || '',
            totalPages: book.totalPages || 0,
            uploadedAt: book.uploadedAt ? new Date(book.uploadedAt) : new Date(),
            processedAt: book.processedAt ? new Date(book.processedAt) : undefined,
            status: book.status || 'completed'
          } as BookContent,
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
          createdAt: content.createdAt ? new Date(content.createdAt) : new Date(),
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
      
      // Step 3: AI generates answer using relevant data from multiple books
      // Group results by book to ensure we get information from all books
      const resultsByBook = new Map<string, typeof relevantData>();
      relevantData.forEach(result => {
        const bookId = result.book.id;
        if (!resultsByBook.has(bookId)) {
          resultsByBook.set(bookId, []);
        }
        resultsByBook.get(bookId)!.push(result);
      });
      
      console.log('Results distribution by book:');
      for (const [bookId, bookResults] of resultsByBook) {
        const bookTitle = bookResults[0]?.book.title || 'Unknown';
        console.log(`- "${bookTitle}": ${bookResults.length} results`);
      }
      
      // If we have multiple books but results from only one, try to get more results
      const requestedBooks = bookIds?.length || 0;
      const booksWithResults = resultsByBook.size;
      
      if (requestedBooks > 1 && booksWithResults === 1) {
        console.log(`WARNING: Requested ${requestedBooks} books but only found results in ${booksWithResults} book(s)`);
        console.log('This might indicate that other books don\'t contain relevant content for this query');
      }
      
      // Take top results from each book to ensure multi-book coverage
      const balancedResults: typeof relevantData = [];
      const targetTotalResults = 1000; // Increased from 15
      const minPerBook = 50; // Minimum results per book if available
      const maxPerBook = Math.max(minPerBook, Math.floor(targetTotalResults / Math.max(resultsByBook.size, 1)));
      
      console.log(`Taking max ${maxPerBook} results per book (min ${minPerBook}) for balanced coverage`);
      
      for (const [bookId, bookResults] of resultsByBook) {
        const selectedResults = bookResults.slice(0, maxPerBook);
        balancedResults.push(...selectedResults);
        console.log(`- Selected ${selectedResults.length} results from "${bookResults[0]?.book.title}"`);
      }
      
      // Sort by relevance and take top results overall
      balancedResults.sort((a, b) => b.score - a.score);
      const finalResults = balancedResults.slice(0, targetTotalResults);
      
      console.log(`Final context includes ${finalResults.length} results from ${resultsByBook.size} books`);
      
      const contextText = finalResults.map(result => 
        `Book: "${result.book.title}" by ${result.book.author} (ID: ${result.book.id}), Page ${result.content.pageNumber}: "${result.content.content}"`
      ).join('\n\n');
      
      const answer = await this.generateAnswerWithContext(question, contextText);
      
      const references: ContentReference[] = finalResults.map(result => ({
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
- timeFrame: ONLY include if question specifically asks about a narrow time period like "1940s" or "19th century". For general questions about history, origins, or invention - DO NOT include timeFrame.
- needsSpecific: boolean - true if question needs specific facts, false if asking for general overview

Guidelines:
${categoryGuidelines}
- Extract meaningful keywords regardless of language
- If question is general/broad, set needsSpecific to false
- For questions about "first", "origin", "history", "development", "invention" - do NOT specify timeFrame
- Expand keywords to include related terms: for "computers" also include "calculator", "machine", "device", "technology", "digital", "electronic"
- Only include timeFrame for questions like "what happened in 1940s" or "events of 19th century"

Examples:
{"categories": ["Time", "People"], "keywords": ["war", "leaders"], "timeFrame": "1940s", "needsSpecific": true}
{"categories": ["Technology"], "keywords": ["computers", "calculator", "machine", "device", "technology", "invention", "history"], "needsSpecific": false}
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
      // If searching multiple books, query each book separately to ensure balanced results
      if (bookIds && bookIds.length > 1) {
        console.log(`Multi-book search: querying ${bookIds.length} books separately`);
        const allResults: SearchResult[] = [];
        const resultsPerBook = strategy.needsSpecific ? 8 : 15; // Results per book
        
        for (const bookId of bookIds) {
          const bookResults = await this.queryBookForResults(session, strategy, [bookId], tagId, resultsPerBook);
          allResults.push(...bookResults);
          console.log(`Found ${bookResults.length} results in book: ${bookResults[0]?.book.title || bookId}`);
        }
        
        return allResults;
      } else {
        // Single book or no book filter - use original logic
        return await this.queryBookForResults(session, strategy, bookIds, tagId, strategy.needsSpecific ? 20 : 40);
      }
    } finally {
      await session.close();
    }
  }

  private async queryBookForResults(
    session: any,
    strategy: { categories: string[]; keywords: string[]; timeFrame?: string; needsSpecific: boolean },
    bookIds?: string[],
    tagId?: string,
    limit: number = 20
  ): Promise<SearchResult[]> {
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
    
    // Filter by keywords in content - use flexible matching
    if (strategy.keywords.length > 0) {
      const keywordConditions = strategy.keywords.map((_, index) => 
        `(
          toLower(c.content) CONTAINS toLower($keyword${index}) OR 
          toLower(c.originalText) CONTAINS toLower($keyword${index}) OR
          toLower(t.name) CONTAINS toLower($keyword${index})
        )`
      );
      conditions.push(`(${keywordConditions.join(' OR ')})`);
      
      strategy.keywords.forEach((keyword, index) => {
        params[`keyword${index}`] = keyword;
      });
    }
    
    // Filter by time frame if specified - only for specific year formats
    if (strategy.timeFrame) {
      // Only apply time filter for specific year formats (e.g., "1940s", "1940", "19th century")
      const yearPattern = /^\d{4}s?$|^\d{1,2}(st|nd|rd|th) century$/;
      if (yearPattern.test(strategy.timeFrame)) {
        conditions.push('toLower(c.content) CONTAINS toLower($timeFrame) OR toLower(t.name) CONTAINS toLower($timeFrame)');
        params.timeFrame = strategy.timeFrame;
      }
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
    
    // Add basic quality filtering (less restrictive)
    const qualityConditions = [
      'size(c.content) > 10',  // Reduced minimum content length
      'NOT (c.content =~ "^\\s*\\d+\\s*$")'  // Exclude just page numbers
    ];
    
    if (conditions.length > 0) {
      cypher += ` WHERE ${conditions.join(' AND ')} AND ${qualityConditions.join(' AND ')}`;
    } else {
      cypher += ` WHERE ${qualityConditions.join(' AND ')}`;
    }
    
    cypher += `
      RETURN c, b, t, p.pageNumber as pageNumber
      ORDER BY c.relevance DESC, c.createdAt DESC
      LIMIT $limit
    `;
    
    params.limit = neo4j.int(limit);
    
    if (bookIds && bookIds.length === 1) {
      console.log(`Querying single book: ${bookIds[0]}`);
    }
    
    const result = await session.run(cypher, params);
    
    return result.records.map((record: any) => {
      const content = record.get('c').properties;
      const book = record.get('b').properties;
      const tag = record.get('t').properties;
      const pageNumber = record.get('pageNumber');
      
      return {
        content: {
          id: content.id || '',
          bookId: book.id || '',
          pageId: content.pageId || '',
          tagId: tag.id || '',
          content: content.content || '',
          pageNumber: pageNumber || 0,
          relevance: parseFloat(content.relevance) || 0.5,
          context: content.context || '',
          originalText: content.originalText || '',
          createdAt: content.createdAt ? new Date(content.createdAt) : new Date()
        } as TaggedContent,
        book: {
          id: book.id || '',
          title: book.title || 'Untitled',
          author: book.author || 'Unknown Author',
          filename: book.filename || '',
          totalPages: book.totalPages || 0,
          uploadedAt: book.uploadedAt ? new Date(book.uploadedAt) : new Date(),
          processedAt: book.processedAt ? new Date(book.processedAt) : undefined,
          status: book.status || 'completed'
        } as BookContent,
        score: parseFloat(content.relevance) || 0.5,
        highlights: [] // Add empty highlights array for now
      };
    });
  }

  private async generateAnswerWithContext(question: string, context: string): Promise<string> {
    try {
      const prompt = `You must answer the question using ONLY the exact format shown below. Do not deviate from this format.

Question: ${question}

Book content from multiple sources:
${context}

MANDATORY FORMAT - Follow this EXACTLY:

**Statement 1:** [Write a detailed point about the topic - 2-4 sentences]

> **Quote from [Book Title] (ID: [book-id]), Page [X]:** "[Exact quote 1 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Y]:** "[Exact quote 2 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Z]:** "[Exact quote 3 from the content above]"

**Statement 2:** [Write another detailed point about the topic - 2-4 sentences]

> **Quote from [Book Title] (ID: [book-id]), Page [X]:** "[Exact quote 1 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Y]:** "[Exact quote 2 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Z]:** "[Exact quote 3 from the content above]"

**Statement 3:** [Write another detailed point about the topic - 2-4 sentences]

> **Quote from [Book Title] (ID: [book-id]), Page [X]:** "[Exact quote 1 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Y]:** "[Exact quote 2 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Z]:** "[Exact quote 3 from the content above]"

**Statement 4:** [Write another detailed point about the topic - 2-4 sentences]

> **Quote from [Book Title] (ID: [book-id]), Page [X]:** "[Exact quote 1 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Y]:** "[Exact quote 2 from the content above]"
> **Quote from [Book Title] (ID: [book-id]), Page [Z]:** "[Exact quote 3 from the content above]"

CRITICAL RULES:
1. Generate 4-6 detailed statements maximum
2. Each statement should be 2-4 sentences with comprehensive explanation
3. Each statement must be followed by 2-10 supporting quotes from different books/pages
4. Use ONLY quotes from the provided content above
5. Include exact book title, book ID, and page number for every quote in the format: "Quote from [Title] (ID: [id]), Page [X]"
6. Do not add any introduction, conclusion, or additional text
7. Start directly with "**Statement 1:**"
8. Answer in the same language as the question
9. Ensure quotes come from multiple different books when available`;

      const response = await this.openai.chat.completions.create({
        model: config.lmStudio.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 15000
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
