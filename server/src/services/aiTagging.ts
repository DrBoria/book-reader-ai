import { OpenAI } from 'openai';
import { config } from '../config';
import { Tag, TaggedContent, TagCategory } from '../types';

export class AITaggingService {
  private openai: OpenAI;

  constructor() {
    const cleanHost = config.lmStudio.host.replace(/\/$/, '');
    this.openai = new OpenAI({
      baseURL: `${cleanHost}/v1`,
      apiKey: 'lm-studio'
    });
  }

  async tagPageContent(
    text: string,
    pageNumber: number, 
    bookId: string,
    categories: TagCategory[]
  ): Promise<{
    tags: Tag[];
    taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[];
  }> {
    // Skip if text is too short or meaningless
    if (text.trim().length < 50 || this.isLowQualityContent(text)) {
      console.log(`Skipping page ${pageNumber} - low quality content`);
      return { tags: [], taggedContent: [] };
    }

    try {
      console.log(`Attempting AI tagging for page ${pageNumber}...`);
      
      // Check if LM Studio is available
      const testResponse = await fetch(`${config.lmStudio.host}/v1/models`);
      if (!testResponse.ok) {
        throw new Error('LM Studio not available');
      }

      // Writer + Reviewer system
      const result = await this.extractEntitiesWithReview(text, pageNumber, bookId, categories);
      
      if (result.tags.length === 0) {
        console.log(`No entities found by AI for page ${pageNumber}, using fallback`);
        return this.fallbackEntityExtraction(text, pageNumber, bookId, categories);
      }
      
      return result;
    } catch (error) {
      console.log(`AI tagging failed for page ${pageNumber}:`, error instanceof Error ? error.message : String(error));
      console.log('Using enhanced fallback extraction...');
      return this.fallbackEntityExtraction(text, pageNumber, bookId, categories);
    }
  }

  private isLowQualityContent(text: string): boolean {
    const lowQualityPatterns = [
      /^page\s+\d+\s*$/i,
      /^index$/i,
      /^table\s+of\s+contents$/i,
      /^\s*\d+\s*$/,
      /^copyright/i,
      /^published\s+by/i
    ];
    
    return lowQualityPatterns.some(pattern => pattern.test(text.trim())) ||
           text.split(/\s+/).length < 10; // Less than 10 words
  }

  private buildTaggingPrompt(text: string, categories: TagCategory[]): string {
    const categoryDescriptions = categories.map(cat => 
      `- "${cat.name}": ${cat.description || 'Extract relevant entities for this category'}`
    ).join('\n');

    return `You are a precise entity extraction system. Extract entities from the given text based on these categories.

Categories to extract:
${categoryDescriptions}

Instructions:
- Return ONLY a JSON array with NO explanations, <think> tags, or additional text
- Extract specific, meaningful entities that clearly belong to each category
- Each entity should have high confidence (0.7+) and clear relevance
- Extract a short relevant text fragment that contains the entity

Required JSON format:
[{"category":"category_name","value":"extracted_entity","content":"short_text_fragment","confidence":0.85}]

Text to analyze: "${text}"`;
  }

  private async extractEntitiesWithReview(
    text: string,
    pageNumber: number, 
    bookId: string,
    categories: TagCategory[]
  ): Promise<{
    tags: Tag[];
    taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[];
  }> {
    const maxIterations = 2; // Prevent infinite loops
    let currentIteration = 0;

    while (currentIteration < maxIterations) {
      console.log(`Writer attempt ${currentIteration + 1} for page ${pageNumber}`);

      // WRITER: Extract entities
      const writerPrompt = this.buildTaggingPrompt(text, categories);
      const writerResponse = await this.openai.chat.completions.create({
        model: config.lmStudio.model,
        messages: [{ role: 'user', content: writerPrompt }],
        temperature: 0.1,
        max_tokens: 1500,
        top_p: 0.9
      });

      const writerContent = writerResponse.choices[0].message.content || '';
      console.log(`Writer response for page ${pageNumber}:`, writerContent.substring(0, 200));

      // Parse writer response
      const result = this.parseEntityExtractionResponse(writerContent, text, pageNumber, bookId, categories);
      
      if (result.tags.length === 0) {
        console.log(`Writer found no entities on iteration ${currentIteration + 1}`);
        break;
      }

      // REVIEWER: Validate the extraction
      const reviewPrompt = this.buildReviewPrompt(text, categories, writerContent);
      const reviewResponse = await this.openai.chat.completions.create({
        model: config.lmStudio.model,
        messages: [{ role: 'user', content: reviewPrompt }],
        temperature: 0.1,
        max_tokens: 800,
        top_p: 0.9
      });

      const reviewContent = reviewResponse.choices[0].message.content || '';
      console.log(`Reviewer response for page ${pageNumber}:`, reviewContent.substring(0, 150));

      // Check if reviewer approves
      const reviewResult = this.parseReviewResponse(reviewContent);
      
      if (reviewResult.approved) {
        console.log(`✅ Reviewer approved extraction for page ${pageNumber}`);
        return result;
      } else {
        console.log(`❌ Reviewer rejected extraction for page ${pageNumber}:`, reviewResult.feedback);
        // Continue to next iteration with feedback
        currentIteration++;
      }
    }

    console.log(`Max iterations reached for page ${pageNumber}, returning last result`);
    return { tags: [], taggedContent: [] };
  }

  private buildReviewPrompt(text: string, categories: TagCategory[], writerResponse: string): string {
    const categoryNames = categories.map(cat => `"${cat.name}"`).join(', ');
    
    return `You are a quality reviewer for entity extraction. Review the extracted entities and determine if they are appropriate.

ORIGINAL TEXT: "${text}"

EXTRACTED ENTITIES: ${writerResponse}

AVAILABLE CATEGORIES: ${categoryNames}

Evaluate:
1. Are the extracted entities truly relevant to their assigned categories?
2. Are the entities specific and meaningful (not generic/vague terms)?
3. Do the entities actually exist in the provided text?
4. Are confidence scores reasonable?

Respond with either:
- "APPROVED" if extraction is good quality
- "REJECTED: [specific feedback]" if extraction needs improvement

Your response:`;
  }

  private parseReviewResponse(reviewContent: string): { approved: boolean; feedback: string } {
    const cleaned = reviewContent.toLowerCase().trim();
    
    if (cleaned.includes('approved') || cleaned.includes('good') || cleaned.includes('accept')) {
      return { approved: true, feedback: '' };
    }
    
    if (cleaned.includes('rejected') || cleaned.includes('reject') || cleaned.includes('poor')) {
      const feedback = reviewContent.replace(/^rejected:?\s*/i, '').trim();
      return { approved: false, feedback };
    }
    
    // Default to approved if unclear
    return { approved: true, feedback: '' };
  }

  private parseEntityExtractionResponse(
    response: string, 
    originalText: string, 
    pageNumber: number,
    bookId: string,
    categories: TagCategory[]
  ): {
    tags: Tag[];
    taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[];
  } {
    try {
      // Extract JSON from response
      let jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log('No JSON array found in response:', response.substring(0, 200));
        return this.fallbackEntityExtraction(originalText, pageNumber, bookId, categories);
      }

      let jsonString = jsonMatch[0];
      
      // Try to fix common JSON issues
      jsonString = this.fixCommonJsonIssues(jsonString);
      
      console.log('Attempting to parse JSON:', jsonString.substring(0, 300));
      
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        console.log('Parsed result is not an array:', typeof parsed);
        return { tags: [], taggedContent: [] };
      }

      const tags: Tag[] = [];
      const taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[] = [];

      for (const entity of parsed) {
        if (!entity.category || !entity.value || !entity.content) continue;
        
        const category = categories.find(c => c.name.toLowerCase() === entity.category.toLowerCase());
        if (!category) continue;

        // Only keep entities with high confidence (80%+)
        const confidence = Math.max(0, Math.min(1, entity.confidence || 0.5));
        if (confidence < 0.8) continue;

        // Create dynamic tag
        const tag: Tag = {
          id: this.generateId(),
          name: entity.value,
          categoryId: category.id,
          value: entity.value,
          bookId,
          confidence,
          createdAt: new Date()
        };
        tags.push(tag);

        // Create tagged content
        const content: Omit<TaggedContent, 'bookId' | 'pageId'> = {
          id: this.generateId(),
          tagId: tag.id,
          content: entity.content,
          pageNumber,
          relevance: confidence,
          context: `${category.name.charAt(0) + category.name.slice(1).toLowerCase()}: ${entity.value}`,
          originalText: originalText,  // Store full page text for context
          createdAt: new Date()
        };
        taggedContent.push(content);
      }

      console.log(`Extracted ${tags.length} entities from page ${pageNumber}`);
      return { tags, taggedContent };
    } catch (error) {
      console.error('Failed to parse entity extraction response:', error);
      console.log('Raw AI response:', response.substring(0, 500));
      return { tags: [], taggedContent: [] };
    }
  }

  private fixCommonJsonIssues(jsonString: string): string {
    // Remove trailing commas
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix unterminated strings by finding unmatched quotes
    let fixed = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (escapeNext) {
        escapeNext = false;
        fixed += char;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        fixed += char;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
      }
      
      fixed += char;
    }
    
    // If we ended in a string, close it
    if (inString) {
      fixed += '"';
    }
    
    return fixed;
  }

  private fallbackEntityExtraction(
    text: string, 
    pageNumber: number,
    bookId: string,
    categories: TagCategory[]
  ): {
    tags: Tag[];
    taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[];
  } {
    console.log(`Using fallback entity extraction for page ${pageNumber}`);
    
    const tags: Tag[] = [];
    const taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[] = [];

    // Generic entity extraction patterns
    const potentialEntities = this.extractGenericEntities(text);

    // Distribute entities across user-defined categories
    for (const category of categories) {
      const relevantEntities = this.filterEntitiesForCategory(potentialEntities, category, text);
      
      for (const entity of relevantEntities.slice(0, 3)) { // Limit to 3 per category
        const tag: Tag = {
          id: this.generateId(),
          name: entity.value,
          categoryId: category.id,
          value: entity.value,
          bookId,
          confidence: entity.confidence,
          createdAt: new Date()
        };
        tags.push(tag);

        const content: Omit<TaggedContent, 'bookId' | 'pageId'> = {
          id: this.generateId(),
          tagId: tag.id,
          content: this.extractRelevantFragment(text, entity.value),
          pageNumber,
          relevance: entity.confidence * 0.8,
          context: `${category.name}: ${entity.value}`,
          originalText: text,
          createdAt: new Date()
        };
        taggedContent.push(content);
      }
    }

    console.log(`Fallback extracted ${tags.length} entities from page ${pageNumber}`);
    return { tags, taggedContent };
  }

  private extractGenericEntities(text: string): Array<{value: string; confidence: number; type: string}> {
    const entities: Array<{value: string; confidence: number; type: string}> = [];
    
    // Extract capitalized phrases (potential names, places, etc.)
    const capitalizedPhrases = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
    for (const phrase of capitalizedPhrases) {
      if (phrase.length > 2 && phrase.length < 50) {
        entities.push({
          value: phrase.trim(),
          confidence: 0.7,
          type: 'capitalized'
        });
      }
    }

    // Extract dates and years
    const dates = text.match(/\b\d{4}(?:\s*-\s*\d{4})?\b|\b\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4}\b/g) || [];
    for (const date of dates) {
      entities.push({
        value: date.trim(),
        confidence: 0.9,
        type: 'temporal'
      });
    }

    // Extract quoted phrases
    const quotedPhrases = text.match(/"([^"]{3,30})"/g) || [];
    for (const quoted of quotedPhrases) {
      entities.push({
        value: quoted.replace(/"/g, ''),
        confidence: 0.8,
        type: 'quoted'
      });
    }

    return entities;
  }

  private filterEntitiesForCategory(
    entities: Array<{value: string; confidence: number; type: string}>,
    category: TagCategory,
    text: string
  ): Array<{value: string; confidence: number}> {
    // Use category description to determine relevance
    const categoryKeywords = this.extractKeywordsFromDescription(category.description || '');
    const results: Array<{value: string; confidence: number}> = [];

    for (const entity of entities) {
      // Calculate relevance score based on category description
      let relevanceScore = 0.5; // Base score

      // Check if entity type matches category context
      if (entity.type === 'temporal' && this.descriptionIndicatesTime(category.description || '')) {
        relevanceScore += 0.4;
      } else if (entity.type === 'capitalized' && this.descriptionIndicatesPeople(category.description || '')) {
        relevanceScore += 0.3;
      } else if (entity.type === 'capitalized' && this.descriptionIndicatesLocation(category.description || '')) {
        relevanceScore += 0.3;
      }

      // Boost score if category keywords appear near the entity in text
      const entityIndex = text.indexOf(entity.value);
      if (entityIndex >= 0) {
        const contextWindow = text.substring(
          Math.max(0, entityIndex - 100),
          Math.min(text.length, entityIndex + entity.value.length + 100)
        );
        
        for (const keyword of categoryKeywords) {
          if (contextWindow.toLowerCase().includes(keyword.toLowerCase())) {
            relevanceScore += 0.2;
          }
        }
      }

      if (relevanceScore >= 0.6) {
        results.push({
          value: entity.value,
          confidence: Math.min(0.95, relevanceScore)
        });
      }
    }

    return results.slice(0, 5); // Limit results
  }

  private extractKeywordsFromDescription(description: string): string[] {
    // Extract meaningful words from category description
    return description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !/^(the|and|or|but|for|with|from)$/.test(word));
  }

  private descriptionIndicatesTime(description: string): boolean {
    const timeIndicators = ['time', 'date', 'year', 'period', 'era', 'century', 'decade', 'temporal', 'когда', 'время'];
    return timeIndicators.some(indicator => description.toLowerCase().includes(indicator));
  }

  private descriptionIndicatesPeople(description: string): boolean {
    const peopleIndicators = ['people', 'person', 'name', 'author', 'individual', 'human', 'люди', 'человек', 'имя'];
    return peopleIndicators.some(indicator => description.toLowerCase().includes(indicator));
  }

  private descriptionIndicatesLocation(description: string): boolean {
    const locationIndicators = ['place', 'location', 'city', 'country', 'region', 'где', 'место', 'локация'];
    return locationIndicators.some(indicator => description.toLowerCase().includes(indicator));
  }

  private extractRelevantFragment(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return text.substring(0, 200);
    
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + keyword.length + 100);
    
    return text.substring(start, end);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
