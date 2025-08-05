import { EntityWorkflow } from './entityWorkflow';
import { Tag, TaggedContent, TagCategory } from '../types';
import { isValidEntityForDataType, normalizeEntityByDataType } from '../utils/dataTypeNormalization';

export class AITaggingService {
  private workflow: EntityWorkflow;

  constructor() {
    this.workflow = new EntityWorkflow();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
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
    if (text.trim().length < 50) {
      console.log(`Skipping page ${pageNumber} - low quality content`);
      return { tags: [], taggedContent: [] };
    }

    try {
      console.log(`🚀 Starting AI tagging for page ${pageNumber}`);
      
      const workflowResult = await this.workflow.processEntities({
        text,
        pageNumber,
        bookId,
        categories
      });

      if (workflowResult.tags.length === 0) {
        console.log(`❌ No entities found for page ${pageNumber}`);
        return { tags: [], taggedContent: [] };
      }

      // Map WorkflowOutput to expected format
      const mappedResult = {
        tags: workflowResult.tags,
        taggedContent: workflowResult.taggedContent.map(item => ({
          ...item,
          id: this.generateId(),
          createdAt: new Date()
        }))
      };

      console.log(`✅ Found ${mappedResult.tags.length} entities for page ${pageNumber}`);
      return mappedResult;

    } catch (error) {
      console.error('AI tagging failed:', error);
      return { tags: [], taggedContent: [] };
    }
  }

  private isLowQualityContent(text: string): boolean {
    const words = text.trim().split(/\s+/);
    return words.length < 10; // Only check word count, no hardcoded patterns
  }

  private buildTaggingPrompt(text: string, categories: TagCategory[], previousFeedback?: string): string {
    const categoryDescriptions = categories.map(cat => {
      const keywords = cat.keywords && cat.keywords.length > 0 
        ? `\n  Keywords: ${cat.keywords.join(', ')}`
        : '';
      const dataType = cat.dataType ? ` [type: ${cat.dataType}]` : '';
      
      // Use ONLY category descriptions and keywords from database schema - NO hardcoded patterns
      
      return `- "${cat.name}"${dataType}:\n  Description: ${cat.description || 'Extract relevant entities for this category'}${keywords}`;
    }).join('\n\n');

    const feedbackSection = previousFeedback ? `

IMPORTANT - Previous reviewer feedback to address:
"${previousFeedback}"

Please correct the issues mentioned in the feedback above.` : '';

    return `You are a precise entity extraction system. Extract meaningful entities from the given text and assign them to the most appropriate category.

Categories to extract:
${categoryDescriptions}

Data type guidelines:
- [type: date] - Extract years, dates, time periods, decades (e.g., "1945", "1970s", "1961-1975")
- [type: text] - Extract ACTUAL names of people, places, organizations, concepts (NOT common words, NOT numbers or years)
- [type: number] - Extract numeric values, quantities, measurements

CRITICAL Guidelines for text categories:
- Extract only actual proper nouns that represent specific named entities
- Focus on entities that would be capitalized in the middle of sentences, not just at sentence beginnings
- Analyze the context around each entity to determine if it's a substantive proper noun
- Avoid extracting function words, articles, prepositions, or common grammatical elements
- Ensure extracted entities are genuine examples of what the category description specifies
- Use the category keywords as guidance for what types of entities to look for

Additional rules:
- Extract only entities that clearly and specifically belong to each category
- ALLOW entities to belong to MULTIPLE categories if they fit (e.g., "Howard Aiken" can be both in "Люди" and "Ideas from the Past")
- STRICTLY respect data types - do NOT put years/dates in text categories
- STRICTLY respect data types - do NOT put names/places in date categories
- Return ONLY a JSON array with NO explanations or additional text${feedbackSection}

Required JSON format:
[{"category":"category_name","value":"extracted_entity","content":"short_text_fragment","confidence":0.85}]

Text to analyze: "${text}"`;
  }


  
  /**
   * Final validation to ensure data type compliance after reviewer approval
   */


  private buildReviewPrompt(text: string, categories: TagCategory[], writerResponse: string): string {
    const categoryInfo = categories.map(cat => {
      const keywords = cat.keywords && cat.keywords.length > 0 
        ? `\n    Keywords: ${cat.keywords.join(', ')}`
        : '';
      const dataType = cat.dataType ? ` [${cat.dataType}]` : '';
      const description = cat.description || 'No description available';
      
      return `"${cat.name}"${dataType}:\n    Description: ${description}${keywords}`;
    }).join('\n\n- ');
    
    return `You are a quality reviewer for entity extraction. Your goal is to approve reasonable extractions while rejecting clearly wrong ones.

ORIGINAL TEXT: "${text}"

EXTRACTED ENTITIES: ${writerResponse}

AVAILABLE CATEGORIES (use descriptions and keywords to judge appropriateness):
- ${categoryInfo}

Review guidelines (use category descriptions and keywords as your guide):

✅ APPROVE if entities are:
- Proper nouns that match the category's description and keywords
- Correctly typed according to the specified data type
- Actually present in the original text
- Reasonable based on category context

❌ REJECT only if:
- Clear data type violations (wrong data type for category)
- Entities that completely contradict the category description
- Entities not found in the original text
- Common words that don't match category intent based on description/keywords

Evaluation approach:
- Use the detailed category descriptions to judge if entities fit
- Consider the provided keywords as context clues
- Allow entities to fit multiple categories if appropriate
- Focus on whether the entity meaningfully relates to the category's purpose as described

Respond with either:
- "APPROVED" if entities are reasonable proper nouns in correct data types
- "REJECTED: [specific issue]" only for clear violations

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
        console.log('❌ Parsed result is not an array:', typeof parsed);
        return { tags: [], taggedContent: [] };
      }

      console.log(`📋 AI returned ${parsed.length} entities:`, parsed.map(e => `"${e.value}" → ${e.category} (conf: ${e.confidence})`));

      const tags: Tag[] = [];
      const taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[] = [];

      for (const entity of parsed) {
        // Strict validation
        if (!entity.category || !entity.value || entity.value === null || !entity.content) {
          console.log('Skipping invalid entity:', entity);
          continue;
        }
        
        const entityValue = String(entity.value).trim();
        if (!entityValue || entityValue.length < 2) {
          console.log('Skipping empty/short entity:', entityValue);
          continue;
        }
        
        // ALLOW same entity to be used in multiple categories if it fits
        
        // Map English category names to actual system category names
        const categoryNameMapping: { [key: string]: string } = {
          'time': 'Время',
          'people': 'Люди',
          'location': 'Локации',
          'technology & concepts': 'Technology & Concepts',
          'organizations': 'Organizations',
          'events': 'Events',
          'ideas from past': 'Ideas from the Past'
        };
        
        const entityCategoryLower = entity.category.toLowerCase();
        const mappedName = categoryNameMapping[entityCategoryLower] || entity.category;
        
        const category = categories.find(c => 
          c.name.toLowerCase() === entityCategoryLower || 
          c.name.toLowerCase() === mappedName.toLowerCase()
        );
        
        if (!category) {
          console.log('Category not found:', entity.category, 'Available:', categories.map(c => c.name).join(', '));
          continue;
        }

        // Adjust confidence threshold based on category type
        const confidence = Math.max(0, Math.min(1, entity.confidence || 0.5));
        const confidenceThreshold = category.dataType === 'text' ? 0.6 : 0.8; // Lower threshold for people/locations
        
        if (confidence < confidenceThreshold) {
          console.log(`Low confidence entity for ${category.name}:`, entityValue, confidence);
          continue;
        }

        // Create dynamic tag
        const tag: Tag = {
          id: this.generateId(),
          name: entityValue,
          categoryId: category.id,
          value: entityValue,
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
    console.log(`🛡️ Using fallback entity extraction for page ${pageNumber}`);
    console.log(`🎯 Categories to process: ${categories.map(c => `${c.name} (${c.dataType})`).join(', ')}`);
    
    const tags: Tag[] = [];
    const taggedContent: Omit<TaggedContent, 'bookId' | 'pageId'>[] = [];

    // Generic entity extraction patterns
    const potentialEntities = this.extractGenericEntities(text, categories);
    console.log(`📝 Extracted ${potentialEntities.length} potential entities: ${potentialEntities.map(e => `${e.value} (${e.type})`).join(', ')}`);
    
    const usedEntities = new Set<string>(); // Track used entities

    // Distribute entities across user-defined categories without duplication
    for (const category of categories) {
      const relevantEntities = this.filterEntitiesForCategory(potentialEntities, category, text)
        .filter(entity => !usedEntities.has(entity.value.toLowerCase())); // Skip already used
        // NO ARTIFICIAL LIMITS - extract ALL valid entities!
        
      console.log(`🏷️ For category "${category.name}": found ${relevantEntities.length} relevant entities: ${relevantEntities.map(e => e.value).join(', ')}`);
      
      for (const entity of relevantEntities) {
        usedEntities.add(entity.value.toLowerCase());
        
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

  private extractGenericEntities(text: string, categories: TagCategory[] = []): Array<{value: string; confidence: number; type: string}> {
    const entities: Array<{value: string; confidence: number; type: string}> = [];
    
    // Extract capitalized phrases (potential names, places, etc.) - improved pattern
    const capitalizedPhrases = text.match(/\b[A-ZА-Я][a-zа-я]{1,}(?:\s+[A-ZА-Я][a-zа-я]{1,})*(?:\s+[A-ZА-Я][a-zа-я]{1,})*\b/g) || [];
    
    // Analyze sentence position statistics for better filtering
    const sentenceStartsPattern = /[.!?]\s+([A-ZА-Я][a-zа-я]+)/g;
    const sentenceStarts = new Set<string>();
    let match;
    while ((match = sentenceStartsPattern.exec(text)) !== null) {
      sentenceStarts.add(match[1].toLowerCase());
    }
    
    // Also check beginning of text
    const textStartMatch = text.match(/^\s*([A-ZА-Я][a-zа-я]+)/);
    if (textStartMatch) {
      sentenceStarts.add(textStartMatch[1].toLowerCase());
    }
    
    for (const phrase of capitalizedPhrases) {
      if (phrase.length < 3 || phrase.length > 50) continue;
      
      // Check if word appears mostly at sentence starts (likely not a proper noun)
      const firstWord = phrase.split(' ')[0];
      const totalOccurrences = (text.match(new RegExp(`\\b${firstWord}\\b`, 'gi')) || []).length;
      const sentenceStartOccurrences = sentenceStarts.has(firstWord.toLowerCase()) ? 1 : 0;
      
      // If word only appears at sentence starts, it's likely not a proper noun
      if (totalOccurrences > 0 && sentenceStartOccurrences / totalOccurrences > 0.8) {
        continue; // Skip words that mostly appear at sentence beginnings
      }
      
      // Additional quality checks
      if (this.isLikelyProperNoun(phrase, text)) {
        // Higher confidence for multi-word phrases (likely proper names)
        const confidence = phrase.includes(' ') ? 0.8 : 0.7;
        entities.push({
          value: phrase.trim(),
          confidence,
          type: 'capitalized'
        });
      }
    }

    // Extract dates and years - improved pattern
    const dates = text.match(/\b\d{4}(?:s|[\s\-–]\d{4})?\b|\b\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4}\b/g) || [];
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

    // Extract words with title-like patterns (generic pattern without hardcoded titles)
    const titledNames = text.match(/\b[A-ZА-Я][a-z]*\.\s+[A-ZА-Я][a-zа-я]+(?:\s+[A-ZА-Я][a-zа-я]+)*\b/g) || [];
    for (const name of titledNames) {
      // Additional validation that this looks like a title pattern
      if (/^[A-ZА-Я][a-z]{1,10}\.\s/.test(name)) {
        entities.push({
          value: name.trim(),
          confidence: 0.9,
          type: 'titled_name'
        });
      }
    }

    // Extract name patterns - First Last, First Middle Last
    const namePatterns = text.match(/\b[A-ZА-Я][a-zа-я]{2,}\s+[A-ZА-Я][a-zа-я]{2,}(?:\s+[A-ZА-Я][a-zа-я]{2,})?\b/g) || [];
    for (const name of namePatterns) {
      // Skip if it's at sentence start (less likely to be a name)
      const nameIndex = text.indexOf(name);
      const beforeChar = nameIndex > 0 ? text[nameIndex - 1] : '.';
      
      if (!/[.!?]/.test(beforeChar) || this.isLikelyProperNoun(name, text)) {
        entities.push({
          value: name.trim(),
          confidence: 0.75,
          type: 'potential_name'
        });
      }
    }

    // Extract single capitalized words that appear with category-specific context
    const singleWords = text.match(/\b[A-ZА-Я][a-zа-я]{3,}\b/g) || [];
    for (const word of singleWords) {
      // Check if word appears in context suggesting it matches any category keywords
      if (this.hasPersonContext(word, text, categories)) {
        entities.push({
          value: word.trim(),
          confidence: 0.6,
          type: 'contextual_name'
        });
      }
    }

    return entities;
  }
  
  /**
   * Check if a capitalized phrase is likely a proper noun using contextual analysis
   */
  private isLikelyProperNoun(phrase: string, text: string): boolean {
    const lowerPhrase = phrase.toLowerCase();
    
    // Check if it appears in middle of sentences (good sign for proper nouns)
    const midSentencePattern = new RegExp(`[^.!?]\\s+${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const midSentenceMatches = (text.match(midSentencePattern) || []).length;
    
    // If it appears in middle of sentences, likely a proper noun
    if (midSentenceMatches > 0) {
      return true;
    }
    
    // Check for proper noun indicators in surrounding context  
    // Note: Will be validated with category keywords in filterEntitiesForCategory
    
    // Multi-word phrases are more likely to be proper nouns
    if (phrase.includes(' ') && phrase.split(' ').length >= 2) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get contexts around a word (n words before and after)
   */
  private getWordContexts(word: string, text: string, windowSize: number): string[] {
    const contexts: string[] = [];
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - windowSize * 10);
      const end = Math.min(text.length, match.index + word.length + windowSize * 10);
      contexts.push(text.substring(start, end));
    }
    
    return contexts;
  }
  
  /**
   * Check if context around a word indicates it's a proper noun
   */
  private hasProperNounIndicators(context: string, word: string, categories: TagCategory[] = []): boolean {
    // Get all keywords from all categories
    const allKeywords = categories.flatMap(cat => cat.keywords || []);
    
    if (allKeywords.length === 0) {
      return false; // No keywords to work with
    }
    
    // Build dynamic pattern from keywords
    const escapedKeywords = allKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const keywordPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\s+`, 'i');
    
    return keywordPattern.test(context);
  }
  
  /**
   * Check if a word appears in context suggesting it's a person's name
   */
  private hasPersonContext(word: string, text: string, categories: TagCategory[] = []): boolean {
    const contexts = this.getWordContexts(word, text, 6);
    
    // Generate patterns dynamically from category keywords
    const allKeywords = categories.flatMap(cat => cat.keywords || []);
    
    if (allKeywords.length === 0) {
      return false; // No keywords to work with
    }
    
    // Build dynamic regex patterns from keywords
    const keywordPattern = new RegExp(`\\b(${allKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s+`, 'i');
    
    for (const context of contexts) {
      if (keywordPattern.test(context)) {
        return true;
      }
    }
    
    return false;
  }

  private filterEntitiesForCategory(
    entities: Array<{value: string; confidence: number; type: string}>,
    category: TagCategory,
    text: string
  ): Array<{value: string; confidence: number}> {
    const results: Array<{value: string; confidence: number}> = [];
    const categoryKeywords = category.keywords || [];
    const categoryDataType = category.dataType || 'text';

    console.log(`🔍 Filtering for category "${category.name}" with keywords: [${categoryKeywords.join(', ')}]`);

    for (const entity of entities) {
      let relevanceScore = 0.0;

      // STRICT data type validation
      if (!isValidEntityForDataType(entity.value, categoryDataType)) {
        console.log(`❌ Entity "${entity.value}" failed data type validation for ${categoryDataType}`);
        continue;
      }

      // Base score for correct data type match
      relevanceScore += 0.3;

      // Enhanced scoring for text categories (people, locations)
      if (categoryDataType === 'text') {
        // Much more aggressive scoring for obvious proper nouns
        if (entity.type === 'titled_name') {
          relevanceScore += 0.5; // Dr. Smith, etc.
        } else if (entity.type === 'potential_name') {
          relevanceScore += 0.4; // John Smith, United States
        } else if (entity.type === 'contextual_name') {
          relevanceScore += 0.3; // Words near keywords
        } else if (entity.type === 'capitalized') {
          // More generous scoring for capitalized words
          relevanceScore += 0.3;
        } else if (entity.type === 'quoted') {
          relevanceScore += 0.2;
        }

        // NO hardcoded pattern matching - let AI reviewer decide everything based on category keywords and descriptions

      } else if (categoryDataType === 'date' && entity.type === 'temporal') {
        relevanceScore += 0.5; // Perfect match for dates
      } else if (categoryDataType === 'number' && /^\d/.test(entity.value)) {
        relevanceScore += 0.4; // Good match for numbers
      }

      // Context-based keyword matching (more flexible)
      const entityIndex = text.indexOf(entity.value);
      if (entityIndex >= 0) {
        const contextWindow = text.substring(
          Math.max(0, entityIndex - 100),
          Math.min(text.length, entityIndex + entity.value.length + 100)
        ).toLowerCase();

        // Check for keyword matches in context
        const matchingKeywords = categoryKeywords.filter(keyword => 
          contextWindow.includes(keyword.toLowerCase())
        );

        if (matchingKeywords.length > 0) {
          relevanceScore += 0.2;
          console.log(`🎯 Keyword match for "${entity.value}": [${matchingKeywords.join(', ')}]`);
        }
      }

      // Additional contextual scoring using category-specific patterns
      if (categoryDataType === 'text') {
        const contextualScore = this.getContextualProperNounScore(entity.value, text, category);
        relevanceScore += contextualScore;
      }

      console.log(`📊 Entity "${entity.value}" (${entity.type}): score ${relevanceScore.toFixed(2)}`);

      // Much lower threshold for text categories - be more inclusive
      const threshold = categoryDataType === 'text' ? 0.4 : 0.6;
      if (relevanceScore >= threshold) {
        const normalizedValue = normalizeEntityByDataType(entity.value, categoryDataType);
        results.push({
          value: normalizedValue,
          confidence: Math.min(0.95, relevanceScore)
        });
        console.log(`✅ Entity "${entity.value}" accepted with score ${relevanceScore.toFixed(2)}`);
      } else {
        console.log(`❌ Entity "${entity.value}" rejected - score ${relevanceScore.toFixed(2)} below threshold ${threshold}`);
      }
    }

    return results; // NO ARTIFICIAL LIMITS - return ALL valid entities!
  }
  



  
  /**
   * Get contextual score for how likely an entity is a proper noun for a specific category
   */
  private getContextualProperNounScore(entityValue: string, text: string, category: TagCategory): number {
    const contexts = this.getWordContexts(entityValue, text, 10);
    let score = 0.0;
    let scoreReasons: string[] = [];
    
    // Use category keywords for contextual matching
    const categoryKeywords = category.keywords || [];
    
    // Check if any category keywords appear near the entity
    for (const context of contexts) {
      const lowerContext = context.toLowerCase();
      for (const keyword of categoryKeywords) {
        if (lowerContext.includes(keyword.toLowerCase())) {
          score += 0.15;
          scoreReasons.push(`keyword "${keyword}" in context`);
          break; // Only count once per context
        }
      }
    }
    
    // Enhanced scoring based on category type and entity patterns
    if (category.dataType === 'text') {
      
      // Build dynamic regex from category keywords for context matching
      if (categoryKeywords.length > 0) {
        const escapedKeywords = categoryKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const keywordPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\s+`, 'i');
        
        for (const context of contexts) {
          if (keywordPattern.test(context)) {
            score += 0.2;
            scoreReasons.push(`keyword pattern match`);
            break;
          }
        }
      }
      
      // Pattern-based scoring (generic patterns)
      
      // Multi-word capitalized phrases (very likely proper nouns)
      if (/^[A-ZА-Я][a-zа-я]+\s+[A-ZА-Я][a-zа-я]+/.test(entityValue)) {
        score += 0.25; // "United States", "John Smith"
        scoreReasons.push(`multi-word proper noun`);
      }
      
      // Title patterns (Dr., Mr., etc.)
      if (/^[A-ZА-Я][a-z]*\.\s+[A-ZА-Я]/.test(entityValue)) {
        score += 0.3; // "Dr. Smith", "Mr. Jones"
        scoreReasons.push(`titled name pattern`);
      }
      
      // Entity appears in middle of sentences (good indicator)
      const midSentenceCount = (text.match(new RegExp(`[^.!?]\\s+${entityValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) || []).length;
      if (midSentenceCount > 0) {
        score += 0.2; // Not just at sentence start
        scoreReasons.push(`appears mid-sentence`);
      }
      
      // Single word proper nouns (4+ chars, capitalized)
      if (/^[A-ZА-Я][a-zа-я]{3,}$/.test(entityValue)) {
        score += 0.15; // "London", "Smith"
        scoreReasons.push(`single proper noun`);
      }
      
      // Look for general proper noun context patterns (no hardcoded words)
      for (const context of contexts) {
        const lowerContext = context.toLowerCase();
        
        // Check if any category keywords appear in nearby context patterns
        // This will catch things like "from London" if "place" is in keywords
        for (const keyword of categoryKeywords) {
          const lowerKeyword = keyword.toLowerCase();
          
          // Build dynamic pattern around each keyword
          const beforePattern = new RegExp(`\\b${lowerKeyword}\\s+[a-zа-я]*\\s*${entityValue.toLowerCase()}`, 'i');
          const afterPattern = new RegExp(`${entityValue.toLowerCase()}\\s+[a-zа-я]*\\s*\\b${lowerKeyword}`, 'i');
          
          if (beforePattern.test(lowerContext) || afterPattern.test(lowerContext)) {
            score += 0.15;
            scoreReasons.push(`dynamic keyword pattern with "${keyword}"`);
            break;
          }
        }
      }
    }
    
    const finalScore = Math.min(0.6, score);
    
    if (scoreReasons.length > 0) {
      console.log(`🎯 Contextual score for "${entityValue}" in "${category.name}": ${finalScore.toFixed(2)} (${scoreReasons.join(', ')})`);
    }
    
    return finalScore;
  }

  private extractKeywordsFromDescription(description: string): string[] {
    // Extract meaningful words from category description  
    return description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private extractRelevantFragment(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return text.substring(0, 200);
    
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + keyword.length + 100);
    
    return text.substring(start, end);
  }
}

