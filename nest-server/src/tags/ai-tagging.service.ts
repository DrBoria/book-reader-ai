import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EntityWorkflow } from '../agents/workflow.service';
import { Category } from '../category/category.entity';
import { Tag } from './entities/tag.entity';
import { TaggedContent } from './entities/tagged-content.entity';
import { fixCommonJsonIssues } from 'src/utils/json';

export interface TaggingInput {
  text: string;
  bookId: string;
  pageNumber: number;
  categories: Category[];
}

export interface TaggingResult {
  tags: Tag[];
  taggedContent: TaggedContent[];
  metadata: {
    totalRetries: number;
    processingTime: number;
    categoriesUsed: string[];
  };
}

@Injectable()
export class AITaggingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly entityWorkflow: EntityWorkflow,
  ) {}

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  async tagPageContent(input: TaggingInput): Promise<TaggingResult> {
    const startTime = Date.now();

    // Skip if text is too short or meaningless
    if (this.isLowQualityContent(input.text)) {
      console.log(`Skipping page ${input.pageNumber} - low quality content`);
      return {
        tags: [],
        taggedContent: [],
        metadata: {
          totalRetries: 0,
          processingTime: 0,
          categoriesUsed: [],
        },
      };
    }

    try {
      console.log(`🚀 Starting AI tagging for page ${input.pageNumber}`);

      const workflowInput = {
        text: input.text,
        categories: input.categories,
        maxRetries: 3,
        pageNumber: input.pageNumber,
        bookId: input.bookId,
      };

      const workflowResult =
        await this.entityWorkflow.processEntities(workflowInput);

      if (workflowResult.entities.length === 0) {
        console.log(`❌ No entities found for page ${input.pageNumber}`);
        return {
          tags: [],
          taggedContent: [],
          metadata: {
            totalRetries: workflowResult.metadata.totalRetries,
            processingTime: 0,
            categoriesUsed: [],
          },
        };
      }

      // Parse the workflow result into proper format
      const result = this.parseEntityExtractionResponse(
        JSON.stringify(workflowResult.entities),
        input.text,
        input.pageNumber,
        input.bookId,
        input.categories,
      );

      const processingTime = Date.now() - startTime;

      return {
        tags: result.tags,
        taggedContent: result.taggedContent,
        metadata: {
          totalRetries: workflowResult.metadata.totalRetries,
          processingTime,
          categoriesUsed: input.categories.map((cat) => cat.name),
        },
      };
    } catch (error) {
      console.error('AI tagging failed:', error);

      // Use fallback extraction
      const fallbackResult = this.fallbackEntityExtraction(
        input.text,
        input.pageNumber,
        input.bookId,
        input.categories,
      );

      const processingTime = Date.now() - startTime;

      return {
        tags: fallbackResult.tags,
        taggedContent: fallbackResult.taggedContent,
        metadata: {
          totalRetries: 0,
          processingTime,
          categoriesUsed: input.categories.map((cat) => cat.name),
        },
      };
    }
  }

  private isLowQualityContent(text: string): boolean {
    const words = text.trim().split(/\s+/);
    return words.length < 10;
  }

  private buildTaggingPrompt(
    text: string,
    categories: Category[],
    previousFeedback?: string,
  ): string {
    const categoryRules = categories
      .map((cat) => {
        const keywords =
          cat.keywords && cat.keywords.length > 0
            ? `Keywords: ${cat.keywords.join(', ')}`
            : '';
        return `- ${cat.name}: ${cat.description}${keywords ? ` (${keywords})` : ''}`;
      })
      .join('\n');

    const feedbackSection = previousFeedback
      ? `

IMPORTANT - Previous reviewer feedback to address:
"${previousFeedback}"

Please correct the issues mentioned in the feedback above.`
      : '';

    return `You are an expert entity extractor for book content analysis. Extract proper nouns that belong to specific categories based on their meaning and context.

Extraction rules:
- Extract only actual proper nouns that represent specific named entities
- Focus on entities that would be capitalized in the middle of sentences, not just at sentence beginnings
- Analyze the context around each entity to determine if it's a substantive proper noun
- Avoid extracting function words, articles, prepositions, or common grammatical elements
- Ensure extracted entities are genuine examples of what the category description specifies
- Use the category keywords as guidance for what types of entities to look for

CATEGORY DEFINITIONS (use descriptions and keywords as your guide):
${categoryRules}

Data type guidelines:
- [type: date] - Extract years, dates, time periods, decades
- [type: text] - Extract ACTUAL names of people, places, organizations, concepts
- [type: number] - Extract numeric values, quantities, measurements

Additional rules:
- Extract only entities that clearly and specifically belong to each category
- ALLOW entities to belong to MULTIPLE categories if they fit
- STRICTLY respect data types - do NOT put years/dates in text categories
- STRICTLY respect data types - do NOT put names/places in date categories
- Company names go in Organizations, their products go in Technology & Concepts
- Return ONLY a JSON array with NO explanations or additional text${feedbackSection}

Required JSON format:
[{"category":"category_name","value":"extracted_entity","content":"short_text_fragment","confidence":0.85}]

Text to analyze: "${text}"`;
  }

  private buildReviewPrompt(
    text: string,
    categories: Category[],
    writerResponse: string,
  ): string {
    const categoryInfo = categories
      .map((cat) => {
        const keywords =
          cat.keywords && cat.keywords.length > 0
            ? `\n    Keywords: ${cat.keywords.join(', ')}`
            : '';
        const dataType = cat.dataType ? ` [data type: ${cat.dataType}]` : '';
        const description = cat.description || 'No description available';

        return `"${cat.name}"${dataType}:\n    Description: ${description}${keywords}`;
      })
      .join('\n\n- ');

    return `You are a quality reviewer for entity extraction. Your goal is to approve reasonable extractions while rejecting clearly wrong ones.

ORIGINAL TEXT: "${text}"

EXTRACTED ENTITIES: ${writerResponse}

AVAILABLE CATEGORIES (use descriptions and keywords as your guide):
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
- Company names placed in Technology & Concepts (they belong in Organizations based on description)
- Products placed in Organizations (they belong in Technology & Concepts based on description)

Evaluation approach:
- Use the detailed category descriptions to judge if entities fit
- Consider the provided keywords as context clues for what belongs in each category
- Allow entities to fit multiple categories if appropriate
- Focus on whether the entity meaningfully relates to the category's purpose as described
- Company names must go in Organizations ("компании, корпорации, учреждения")
- Products and technologies must go in Technology & Concepts ("продукты, системы, технологии")

Respond with either:
- "APPROVED" if entities are reasonable proper nouns in correct data types
- "REJECTED: [specific issue]" only for clear violations

Your response:`;
  }

  private parseReviewResponse(reviewContent: string): {
    approved: boolean;
    feedback: string;
  } {
    const cleaned = reviewContent.toLowerCase().trim();

    if (
      cleaned.includes('approved') ||
      cleaned.includes('good') ||
      cleaned.includes('accept')
    ) {
      return { approved: true, feedback: '' };
    }

    if (
      cleaned.includes('rejected') ||
      cleaned.includes('reject') ||
      cleaned.includes('poor')
    ) {
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
    categories: Category[],
  ): {
    tags: Tag[];
    taggedContent: TaggedContent[];
  } {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log(
          'No JSON array found in response:',
          response.substring(0, 200),
        );
        return { tags: [], taggedContent: [] };
      }

      let jsonString = jsonMatch[0];

      // Try to fix common JSON issues
      jsonString = fixCommonJsonIssues(jsonString);

      console.log('Attempting to parse JSON:', jsonString.substring(0, 300));

      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        console.log('❌ Parsed result is not an array:', typeof parsed);
        return { tags: [], taggedContent: [] };
      }

      console.log(
        `📋 AI returned ${parsed.length} entities:`,
        parsed.map(
          (e) => `"${e.value}" → ${e.category} (conf: ${e.confidence})`,
        ),
      );

      const tags: Tag[] = [];
      const taggedContent: TaggedContent[] = [];

      for (const entity of parsed) {
        // Strict validation
        if (
          !entity.category ||
          !entity.value ||
          entity.value === null ||
          !entity.content
        ) {
          console.log('Skipping invalid entity:', entity);
          continue;
        }

        const entityValue = String(entity.value).trim();
        if (!entityValue || entityValue.length < 2) {
          console.log('Skipping empty/short entity:', entityValue);
          continue;
        }

        const entityCategoryLower = entity.category.toLowerCase();

        const category = categories.find(
          (c) => c.name.toLowerCase() === entityCategoryLower,
        );

        if (!category) {
          console.log(
            'Category not found:',
            entity.category,
            'Available:',
            categories.map((c) => c.name).join(', '),
          );
          continue;
        }

        // Adjust confidence threshold based on category type
        const confidence = Math.max(0, Math.min(1, entity.confidence || 0.5));
        const confidenceThreshold = category.dataType === 'text' ? 0.6 : 0.8; // Lower threshold for people/locations

        if (confidence < confidenceThreshold) {
          console.log(
            `Low confidence entity for ${category.name}:`,
            entityValue,
            confidence,
          );
          continue;
        }

        // Create dynamic tag
        const tag = new Tag();
        tag.id = this.generateId();
        tag.name = entityValue;
        tag.value = entityValue;
        tag.bookId = bookId;
        tag.categoryId = category.id;
        tag.confidence = confidence;
        tags.push(tag);

        // Create tagged content
        const content = new TaggedContent();
        content.id = this.generateId();
        content.tagId = tag.id;
        content.pageId = ''; // This will need to be set properly when pages are created
        content.bookId = bookId;
        content.text = entity.content;
        content.confidence = confidence;
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

  private fallbackEntityExtraction(
    text: string,
    pageNumber: number,
    bookId: string,
    categories: Category[],
  ): {
    tags: Tag[];
    taggedContent: TaggedContent[];
  } {
    console.log(`🛡️ Using fallback entity extraction for page ${pageNumber}`);

    const tags: Tag[] = [];
    const taggedContent: TaggedContent[] = [];

    // Simple fallback: extract capitalized words as potential entities
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = text.match(capitalizedPattern) || [];

    const uniqueEntities = [
      ...new Set(matches.filter((word) => word.length > 2)),
    ];

    for (const entity of uniqueEntities) {
      const category = categories[0]; // Use first category as fallback
      if (!category) continue;

      const tag = new Tag();
      tag.id = this.generateId();
      tag.name = entity;
      tag.value = entity;
      tag.categoryId = category.id;
      tag.bookId = bookId;
      tag.confidence = 0.5;
      tag.createdAt = new Date().toISOString();
      tags.push(tag);

      const content = new TaggedContent();
      content.id = this.generateId();
      content.tagId = tag.id;
      content.pageId = `page_${pageNumber}`;
      content.bookId = bookId;
      content.text = text.substring(0, 200);
      content.confidence = 0.5;
      content.createdAt = new Date().toISOString();
      taggedContent.push(content);
    }

    return { tags, taggedContent };
  }
}
