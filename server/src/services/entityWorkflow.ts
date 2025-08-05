import { EntityWriter, WriterInput, WriterOutput } from './entityWriter';
import { EntityReviewer, ReviewerInput, ReviewerOutput } from './entityReviewer';
import { Tag, TagCategory } from '../types';
import { isValidEntityForDataType, normalizeEntityByDataType } from '../utils/dataTypeNormalization';

export interface WorkflowInput {
  text: string;
  pageNumber: number;
  bookId: string;
  categories: TagCategory[];
}

export interface WorkflowOutput {
  tags: Tag[];
  taggedContent: Array<{
    tagId: string;
    content: string;
    pageNumber: number;
    relevance: number;
    context: string;
    originalText: string;
  }>;
}

export class EntityWorkflow {
  private writer: EntityWriter;
  private reviewer: EntityReviewer;

  constructor() {
    this.writer = new EntityWriter();
    this.reviewer = new EntityReviewer();
  }

  async processEntities(input: WorkflowInput): Promise<WorkflowOutput> {
    const maxIterations = 3;
    let currentIteration = 0;
    let previousFeedback: string[] = [];

    while (currentIteration < maxIterations) {
      console.log(`🔄 Workflow iteration ${currentIteration + 1} for page ${input.pageNumber}`);

      // Step 1: Writer extracts entities
      const feedbackToUse = previousFeedback.length > 0 ? previousFeedback[previousFeedback.length - 1] : '';
      const writerInput: WriterInput = {
        text: input.text,
        pageNumber: input.pageNumber,
        bookId: input.bookId,
        categories: input.categories,
        previousFeedback: feedbackToUse
      };

      const writerOutput = await this.writer.extractEntities(writerInput);

      if (writerOutput.entities.length === 0) {
        console.log(`❌ Writer found no entities, attempting with broader criteria`);
        currentIteration++;
        continue;
      }
      
      console.log(`✅ Writer found ${writerOutput.entities.length} entities`);

      // Step 2: Reviewer validates entities
      const reviewerInput: ReviewerInput = {
        text: input.text,
        categories: input.categories,
        extractedEntities: writerOutput.entities,
        writerReasoning: writerOutput.reasoning
      };

      const reviewerOutput = await this.reviewer.reviewEntities(reviewerInput);

      if (reviewerOutput.approved) {
        console.log(`✅ Reviewer approved all entities`);
        console.log(`📊 Found ${reviewerOutput.approvedEntities?.length || 0} entities for page ${input.pageNumber}`);
        return this.convertToWorkflowOutput(reviewerOutput.approvedEntities!, input);
      } else {
        console.log(`❌ Reviewer rejected entities: ${reviewerOutput.feedback}`);
        
        // Always collect feedback and continue to next iteration
        const specificFeedback = reviewerOutput.feedback || 'Previous extraction was rejected, please try different entities';
        
        // Always add the feedback to ensure retry happens
        if (!previousFeedback.includes(specificFeedback)) {
          previousFeedback.push(specificFeedback);
        }

        // Add contextual guidance based on common issues
        const contextualGuidance = this.getContextualGuidance(specificFeedback, writerOutput.entities || []);
        if (contextualGuidance && !previousFeedback.includes(contextualGuidance)) {
          previousFeedback.push(contextualGuidance);
        }

        // Continue to next iteration - always retry with feedback
        currentIteration++;
        
        // Break immediately if we get exact same feedback twice
        if (previousFeedback.length >= 2 && 
            previousFeedback.slice(-2).every(f => f === previousFeedback[previousFeedback.length - 1])) {
          console.log('Breaking feedback loop - same feedback received twice');
          break;
        }
        
        // Force retry with feedback - don't skip to next page
        console.log(`🔄 Retrying with feedback: ${specificFeedback}`);
      }
    }

    console.log(`❌ Max iterations reached, no approved result for page ${input.pageNumber}`);
    return { tags: [], taggedContent: [] };
  }

  private convertToWorkflowOutput(
    entities: Array<{
      category: string;
      value: string;
      content: string;
      confidence: number;
    }>,
    input: WorkflowInput
  ): WorkflowOutput {
    const tags: Tag[] = [];
    const taggedContent: Array<{
      tagId: string;
      content: string;
      pageNumber: number;
      relevance: number;
      context: string;
      originalText: string;
    }> = [];

    console.log(`🔍 Processing ${entities.length} entities for page ${input.pageNumber}`);
    console.log(`Available categories: ${input.categories.map(c => c.name).join(', ')}`);
    
    for (const entity of entities) {
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
      
      const category = input.categories.find(c => 
        c.name.toLowerCase() === entityCategoryLower || 
        c.name.toLowerCase() === mappedName.toLowerCase() ||
        c.name === entity.category
      );
      
      if (!category) {
        console.log(`❌ No category found for entity: ${entity.category} -> ${entity.value}`);
        console.log(`Available categories: ${input.categories.map(c => c.name).join(', ')}`);
        // Allow the entity to pass through anyway
        const defaultCategory = input.categories[0];
        if (!defaultCategory) {
          continue;
        }
        // Use the first available category as fallback
        Object.defineProperty(entity, '_fallbackCategory', { value: true });
      } else {
        console.log(`✅ Processing entity: ${entity.category} -> ${entity.value} (${category.dataType})`);
      }

      let normalizedValue = entity.value;
      let categoryToUse = category;
      
      // If no category was found, use the first available category
      if (!category) {
        categoryToUse = input.categories[0];
        if (!categoryToUse) {
          continue; // Skip if no categories at all
        }
      }
      
      // Ensure categoryToUse is defined
      if (!categoryToUse) {
        continue;
      }
      
      // Normalize value based on data type, but be permissive
      try {
        normalizedValue = normalizeEntityByDataType(entity.value, categoryToUse.dataType || 'text');
      } catch (error) {
        normalizedValue = entity.value; // Use original value if normalization fails
      }
      
      // Very permissive validation - only skip empty values
      const isValid = normalizedValue.trim().length > 0;
      
      if (!isValid) {
        console.log(`❌ Entity "${entity.value}" failed validation - empty value`);
        continue;
      }

      const tagId = this.generateId();
      const tag: Tag = {
        id: tagId,
        name: normalizedValue,
        categoryId: categoryToUse.id,
        value: normalizedValue,
        bookId: input.bookId,
        confidence: entity.confidence,
        createdAt: new Date()
      };
      tags.push(tag);

      taggedContent.push({
        tagId,
        content: entity.content,
        pageNumber: input.pageNumber,
        relevance: entity.confidence,
        context: `${categoryToUse.name}: ${entity.value}`,
        originalText: input.text
      });
    }

    return { tags, taggedContent };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getContextualGuidance(feedback: string, entities: any[]): string | null {
    if (!feedback) return null;
    
    const lowerFeedback = feedback.toLowerCase();
    
    // Generic guidance based on category descriptions and keywords
    if (lowerFeedback.includes('organizations') && lowerFeedback.includes('technology')) {
      return 'CRITICAL: Use category descriptions and keywords as your guide. Check each category\'s description and keywords to determine the correct placement based on entity type.';
    }
    
    if (lowerFeedback.includes('events') && lowerFeedback.includes('technology')) {
      return 'CRITICAL: Use category descriptions and keywords to distinguish between Events (historical occurrences) and Technology & Concepts (actual products/technologies). Refer to category keywords for guidance.';
    }
    
    if (lowerFeedback.includes('people') && lowerFeedback.includes('organizations')) {
      return 'CRITICAL: Use category descriptions and keywords to distinguish between People (individuals) and Organizations (companies/institutions). Check category keywords for entity type guidance.';
    }
    
    if (lowerFeedback.includes('time') && lowerFeedback.includes('text')) {
      return 'CRITICAL: Use category descriptions and keywords to ensure proper data type matching. Time category should contain temporal entities, text categories should contain proper nouns.';
    }
    
    if (lowerFeedback.includes('generic')) {
      return 'CRITICAL: Extract only specific named entities that match the category descriptions and keywords. Use exact names from the text and verify against category keywords.';
    }
    
    if (lowerFeedback.includes('context')) {
      return 'CRITICAL: Ensure extracted entities match the category descriptions and keywords as defined in the database schema. Use category keywords as definitive guidance.';
    }
    
    // Generic categorization guidance
    if (lowerFeedback.includes('should be in')) {
      return 'SPECIFIC FIX REQUIRED: Use the category descriptions and keywords from the database schema as your definitive guide for proper categorization. Check each category\'s keywords and description.';
    }
    
    return null;
  }
}
