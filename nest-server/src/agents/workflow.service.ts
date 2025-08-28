import { Injectable } from '@nestjs/common';
import { EntityWriter } from './writer.service';
import { EntityReviewer } from './reviewer.service';
import { Category } from '../category/category.entity';

export interface WorkflowInput {
  text: string;
  pageNumber: number;
  bookId: string;
  categories: Category[];
  maxRetries?: number;
}

export interface WorkflowOutput {
  entities: Array<{
    category: string;
    value: string;
    content: string;
    confidence: number;
  }>;
  metadata: {
    totalRetries: number;
    finalApproval: boolean;
    feedbackHistory: string[];
  };
}

@Injectable()
export class EntityWorkflow {
  constructor(
    private readonly entityWriter: EntityWriter,
    private readonly entityReviewer: EntityReviewer,
  ) {}

  async processEntities(input: WorkflowInput): Promise<WorkflowOutput> {
    const maxRetries = input.maxRetries || 3;
    let retryCount = 0;
    const feedbackHistory: string[] = [];
    let lastFeedback = '';

    while (retryCount < maxRetries) {
      // Extract entities
      const extractionResult = await this.entityWriter.extractEntities({
        text: input.text,
        pageNumber: input.pageNumber,
        bookId: input.bookId,
        categories: input.categories,
        previousFeedback: lastFeedback,
      });

      // Review the extracted entities
      const reviewResult = await this.entityReviewer.reviewEntities({
        text: input.text,
        categories: input.categories,
        extractedEntities: extractionResult.entities,
        writerReasoning: extractionResult.reasoning,
      });

      if (reviewResult.approved) {
        return {
          entities: reviewResult.approvedEntities || extractionResult.entities,
          metadata: {
            totalRetries: retryCount,
            finalApproval: true,
            feedbackHistory,
          },
        };
      }

      // If rejected, collect feedback and retry
      if (reviewResult.feedback) {
        feedbackHistory.push(reviewResult.feedback);
        lastFeedback = reviewResult.feedback;
      }

      retryCount++;
    }

    // Return the best attempt after max retries
    const extractionResult = await this.entityWriter.extractEntities({
      text: input.text,
      pageNumber: input.pageNumber,
      bookId: input.bookId,
      categories: input.categories,
      previousFeedback: lastFeedback,
    });

    return {
      entities: extractionResult.entities,
      metadata: {
        totalRetries: retryCount,
        finalApproval: false,
        feedbackHistory,
      },
    };
  }

  generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  getContextualGuidance(text: string, category: string): string {
    return `Look for ${category.toLowerCase()} entities in the text based on the category definition.`;
  }
}
