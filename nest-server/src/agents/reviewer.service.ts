import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';

interface LMStudioResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

import { Category } from '../category/category.entity';
import { firstValueFrom } from 'rxjs';

export interface ReviewerInput {
  text: string;
  categories: Category[];
  extractedEntities: Array<{
    category: string;
    value: string;
    content: string;
    confidence: number;
  }>;
  writerReasoning: string;
}

export interface ReviewerOutput {
  approved: boolean;
  feedback?: string;
  approvedEntities?: Array<{
    category: string;
    value: string;
    content: string;
    confidence: number;
  }>;
}

@Injectable()
export class EntityReviewer {
  constructor(private readonly httpService: HttpService) { }

  async reviewEntities(input: ReviewerInput): Promise<ReviewerOutput> {
    const categoryInfo = input.categories
      .map((cat) => {
        const keywords =
          cat.keywords && cat.keywords.length > 0
            ? `\n    Keywords: ${cat.keywords.join(', ')}`
            : '';
        const dataType = cat.dataType ? ` [${cat.dataType}]` : '';
        const description =
          cat.description || 'Extract relevant entities for this category';

        return `"${cat.name}"${dataType}:\n    Description: ${description}${keywords}`;
      })
      .join('\n\n- ');

    const entitiesJson = JSON.stringify(input.extractedEntities, null, 2);

    const prompt = `You are a helpful entity categorization reviewer. Your task is to verify if extracted entities are reasonably categorized and provide constructive feedback for improvements.

ORIGINAL TEXT: "${input.text}"

EXTRACTED ENTITIES:
${entitiesJson}

WRITER REASONING: "${input.writerReasoning}"

CATEGORY DEFINITIONS FOR REVIEW:
- ${categoryInfo}

REVIEW GUIDELINES:
- APPROVE entities unless they are clearly and significantly miscategorized
- Allow reasonable interpretations of category boundaries
- Be permissive with category assignments
- Only reject for obvious, major category errors
- Focus on accepting valid extractions

APPROVAL APPROACH:
- APPROVE by default - trust the writer's categorization
- Only REJECT for clearly wrong categorizations
- Be helpful and constructive

RESPOND WITH:
- APPROVED - accept the categorizations
- REJECTED: [specific reason] - only if clearly wrong

Your response:`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${process.env.LM_STUDIO_HOST}${process.env.LM_STUDIO_API_ENDPOINT}`,
          {
            model: process.env.LM_STUDIO_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: parseFloat(process.env.LM_STUDIO_DEFAULT_TEMPERATURE || '0.1'),
            max_tokens: parseInt(process.env.LM_STUDIO_DEFAULT_MAX_TOKENS || '1500'),
            top_p: parseFloat(process.env.LM_STUDIO_DEFAULT_TOP_P || '0.9'),
          },
        ),
      );

      const content = (response.data as any).choices[0].message.content || '';
      const cleaned: string = content.toLowerCase().trim();

      if (cleaned.startsWith('approved')) {
        return {
          approved: true,
          approvedEntities: input.extractedEntities,
        };
      }

      if (cleaned.startsWith('rejected')) {
        const feedback: string = content.replace(/^rejected:?\s*/i, '').trim();
        return {
          approved: false,
          feedback:
            feedback ||
            'Please recategorize based on the specific definitions provided',
        };
      }

      // Check for approval keywords
      if (
        cleaned.includes('approved') ||
        cleaned.includes('accept') ||
        cleaned.includes('correct')
      ) {
        return {
          approved: true,
          approvedEntities: input.extractedEntities,
        };
      }

      // Check for rejection keywords
      if (
        cleaned.includes('rejected') ||
        cleaned.includes('incorrect') ||
        cleaned.includes('wrong')
      ) {
        const feedback: string = content
          .replace(/^.*?(rejected|incorrect|wrong)/i, '')
          .trim();
        return {
          approved: false,
          feedback:
            feedback ||
            'Please recategorize based on the specific definitions provided',
        };
      }

      // Default to rejected with specific guidance
      return {
        approved: false,
        feedback:
          'Please recategorize based on the specific definitions provided',
      };
    } catch (error) {
      console.error('Failed to review entities:', error);
      return {
        approved: false,
        feedback: 'Review service unavailable',
      };
    }
  }
}
