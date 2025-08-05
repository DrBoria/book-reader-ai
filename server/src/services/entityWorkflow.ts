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
    let previousFeedback: string | undefined;

    while (currentIteration < maxIterations) {
      console.log(`🔄 Workflow iteration ${currentIteration + 1} for page ${input.pageNumber}`);

      // Step 1: Writer extracts entities
      const writerInput: WriterInput = {
        text: input.text,
        pageNumber: input.pageNumber,
        bookId: input.bookId,
        categories: input.categories,
        previousFeedback
      };

      const writerOutput = await this.writer.extractEntities(writerInput);

      if (writerOutput.entities.length === 0) {
        console.log(`❌ Writer found no entities`);
        break;
      }

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
        return this.convertToWorkflowOutput(reviewerOutput.approvedEntities!, input);
      } else {
        console.log(`❌ Reviewer rejected entities: ${reviewerOutput.feedback}`);
        previousFeedback = reviewerOutput.feedback;
        currentIteration++;
      }
    }

    console.log(`❌ Max iterations reached, no approved result`);
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

    for (const entity of entities) {
      const category = input.categories.find(c => c.name.toLowerCase() === entity.category.toLowerCase());
      if (!category) continue;

      // Validate data type
      const normalizedValue = normalizeEntityByDataType(entity.value, category.dataType || 'text');
      if (!isValidEntityForDataType(normalizedValue, category.dataType || 'text')) {
        console.log(`❌ Entity "${entity.value}" failed data type validation for ${category.dataType}`);
        continue;
      }

      const tagId = this.generateId();
      const tag: Tag = {
        id: tagId,
        name: normalizedValue,
        categoryId: category.id,
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
        context: `${category.name}: ${entity.value}`,
        originalText: input.text
      });
    }

    return { tags, taggedContent };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
