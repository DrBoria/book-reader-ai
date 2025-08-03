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

    const prompt = this.buildTaggingPrompt(text, categories);
    
    try {
      console.log(`Attempting AI tagging for page ${pageNumber}...`);
      
      // Check if LM Studio is available
      const testResponse = await fetch(`${config.lmStudio.host}/v1/models`);
      if (!testResponse.ok) {
        throw new Error('LM Studio not available');
      }
      
      const response = await this.openai.chat.completions.create({
        model: config.lmStudio.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
        top_p: 0.9
      });

      const content = response.choices[0].message.content || '';
      console.log(`AI response for page ${pageNumber}:`, content.substring(0, 200));
      
      const result = this.parseEntityExtractionResponse(content, text, pageNumber, bookId, categories);
      
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
    return `Extract entities from text. Return ONLY a JSON array with NO explanations or <think> tags.

Categories: 
- "люди" (PEOPLE): Only real person names with first+last name (e.g. "John Smith", "Albert Einstein")
- "время" (TIME): Dates, years, periods, eras (e.g. "1941", "Medieval period") 
- "локации" (LOCATION): Cities, countries, regions (e.g. "London", "Germany")

Format:
[{"category":"люди","value":"John Smith","content":"text fragment","confidence":0.8}]

STRICT RULES:
- PEOPLE must be actual human names with first+last name, NOT titles, organizations, concepts
- REJECT: "The First", "Editorial Board", "Computing Technology", "Publication Data", "Some Remarks"
- REJECT: Text with newlines \\n, generic terms, non-names, organizations
- Only extract if confidence >= 0.7
- Return pure JSON array only

Text: "${text}"`;
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

    // Extract ALL potential entities first
    const allTimeEntities = this.extractTimeEntities(text);
    const allLocationEntities = this.extractLocationEntities(text);
    const allPeopleEntities = this.extractPeopleEntities(text);

    // Find TIME category for time extraction
    const timeCategory = categories.find(c => c.name.toLowerCase() === 'время' || c.name === 'TIME');
    if (timeCategory) {
      for (const timeValue of allTimeEntities) {
        // Ensure this entity is not better suited for another category
        if (this.isValidPersonName(timeValue) || this.looksLikePlaceName(timeValue)) {
          console.log(`Rejected time entity "${timeValue}" - looks like person/place`);
          continue;
        }

        const tag: Tag = {
          id: this.generateId(),
          name: timeValue,
          categoryId: timeCategory.id,
          value: timeValue,
          bookId,
          confidence: 0.9, // High confidence for time patterns
          createdAt: new Date()
        };
        tags.push(tag);

        const content: Omit<TaggedContent, 'bookId' | 'pageId'> = {
          id: this.generateId(),
          tagId: tag.id,
          content: this.extractRelevantFragment(text, timeValue),
          pageNumber,
          relevance: 0.7,
          context: `Time period: ${timeValue}`,
          originalText: text,
          createdAt: new Date()
        };
        taggedContent.push(content);
      }
    }

    // Find LOCATION category for location extraction
    const locationCategory = categories.find(c => c.name.toLowerCase() === 'локации' || c.name === 'LOCATION');
    if (locationCategory) {
      for (const locationName of allLocationEntities) {
        // Skip if it's already processed as time or looks like a person name
        if (allTimeEntities.includes(locationName) || this.isValidPersonName(locationName)) {
          console.log(`Rejected location "${locationName}" - duplicate or person name`);
          continue;
        }

        const tag: Tag = {
          id: this.generateId(),
          name: locationName,
          categoryId: locationCategory.id,
          value: locationName,
          bookId,
          confidence: 0.8, // Higher confidence for locations
          createdAt: new Date()
        };
        tags.push(tag);

        const content: Omit<TaggedContent, 'bookId' | 'pageId'> = {
          id: this.generateId(),
          tagId: tag.id,
          content: this.extractRelevantFragment(text, locationName),
          pageNumber,
          relevance: 0.6,
          context: `Location: ${locationName}`,
          originalText: text,
          createdAt: new Date()
        };
        taggedContent.push(content);
      }
    }

    // Find PEOPLE category for people extraction  
    const peopleCategory = categories.find(c => c.name.toLowerCase() === 'люди' || c.name === 'PEOPLE');
    if (peopleCategory) {
      for (const personName of allPeopleEntities) {
        // Skip if already processed in other categories
        if (allTimeEntities.includes(personName) || allLocationEntities.includes(personName)) {
          console.log(`Rejected person "${personName}" - already used in other category`);
          continue;
        }

        // Additional validation - must actually be a valid person name
        if (!this.isValidPersonName(personName)) {
          console.log(`Rejected person "${personName}" - failed person validation`);
          continue;
        }

        const tag: Tag = {
          id: this.generateId(),
          name: personName,
          categoryId: peopleCategory.id,
          value: personName,
          bookId,
          confidence: 0.8, // Higher confidence for people
          createdAt: new Date()
        };
        tags.push(tag);

        const content: Omit<TaggedContent, 'bookId' | 'pageId'> = {
          id: this.generateId(),
          tagId: tag.id,
          content: this.extractRelevantFragment(text, personName),
          pageNumber,
          relevance: 0.8,
          context: `Person mentioned: ${personName}`,
          originalText: text,
          createdAt: new Date()
        };
        taggedContent.push(content);
      }
    }

    console.log(`Fallback extracted ${tags.length} entities from page ${pageNumber}`);
    return { tags, taggedContent };
    
  }

  private extractTimeEntities(text: string): string[] {
    const timePatterns = [
      /\b\d{4}\s*-?\s*\d{0,4}\s*г\.?(?:г\.)?/g, // 1941г, 1920-1930гг
      /\b\d{4}\s*-?\s*е\s*годы/g, // 1920-е годы
      /\b\d{1,2}\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s*\d{4}/gi,
      /\b(средневековье|древность|античность|возрождение)/gi,
      /\b\d{1,2}\s*(век|века|столетие)/gi,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{1,2},?\s*\d{4}/gi
    ];

    const matches = new Set<string>();
    for (const pattern of timePatterns) {
      const found = text.match(pattern);
      if (found) {
        found.forEach(match => matches.add(match.trim()));
      }
    }
    
    return Array.from(matches).slice(0, 3); // Limit to 3 time entities per page
  }

  private extractPeopleEntities(text: string): string[] {
    // Pattern for proper names: First Last (both capitalized, both alpha)
    const namePattern = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g;
    const matches = text.match(namePattern) || [];
    
    const validNames = new Set<string>();
    
    for (const match of matches) {
      const name = match.trim();
      if (this.isValidPersonName(name)) {
        validNames.add(name);
      }
    }
    
    return Array.from(validNames).slice(0, 5);
  }

  private extractLocationEntities(text: string): string[] {
    const matches = new Set<string>();
    
    // Generic patterns for location detection
    const locationPatterns = [
      // Prepositions indicating location: "in City", "from Country", "to Place"  
      /\b(?:in|from|to|at|near|around)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g,
      // Geographic terms: "City of X", "State of Y", "Province of Z"
      /\b(?:city|state|province|region|area|district|county)\s+of\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/gi,
      // Capitalized words that might be places (but filter out obvious non-places)
      /\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{3,})?\b/g
    ];

    for (const pattern of locationPatterns) {
      const found = text.match(pattern);
      if (found) {
        found.forEach(match => {
          let location = match.trim();
          
          // Clean up prepositions
          location = location.replace(/^(?:in|from|to|at|near|around|city|state|province|region|area|district|county)\s+(?:of\s+)?/i, '');
          
          if (this.isValidLocationName(location)) {
            matches.add(location);
          }
        });
      }
    }
    
    return Array.from(matches).slice(0, 3);
  }

  private isValidLocationName(name: string): boolean {
    const cleanName = name.trim();
    
    // Must be 3+ characters, start with capital
    if (cleanName.length < 3 || !/^[A-Z]/.test(cleanName)) return false;
    
    // Must be alphabetic with optional spaces  
    if (!/^[A-Za-z\s]+$/.test(cleanName)) return false;
    
    // Generic structural checks only - no hardcoded lists
    // Reject if it looks like a title (ends with common suffixes)
    if (/\b(ing|tion|sion|ment|ness|able|ible|ful|less|ward|wise)$/i.test(cleanName)) return false;
    
    // Reject if it contains common article/preposition patterns
    if (/\b(the|and|or|but|for|nor|yet|so)\b/i.test(cleanName)) return false;
    
    return true;
  }

  private isValidPersonName(name: string): boolean {
    // Clean the name first
    const cleanName = name.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Must have exactly 2 words (first + last name)
    const words = cleanName.split(' ');
    if (words.length !== 2) return false;
    
    // Both words must be alphabetic only
    if (!words.every(word => /^[A-Z][a-z]+$/.test(word))) return false;
    
    // Each word must be 3+ characters
    if (!words.every(word => word.length >= 3)) return false;
    
    // Must not contain special characters or numbers
    if (!/^[A-Za-z\s]+$/.test(cleanName)) return false;
    
    return true;
  }

  private looksLikePlaceName(name: string): boolean {
    const cleanName = name.trim();
    
    // Common place name patterns - generic checks only
    if (cleanName.length < 3) return false;
    
    // Single capitalized word could be a place
    if (/^[A-Z][a-z]{2,}$/.test(cleanName)) return true;
    
    // Two words where second is common place suffix
    if (/\b(City|Town|County|State|Province|Region|Area|Valley|River|Lake|Mountain|Hill|Park|Street|Avenue|Boulevard)$/i.test(cleanName)) return true;
    
    return false;
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
