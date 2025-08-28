import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Category } from '../category/category.entity';

export interface WriterInput {
  text: string;
  pageNumber: number;
  bookId: string;
  categories: Category[];
  previousFeedback?: string;
}

export interface WriterOutput {
  entities: Array<{
    category: string;
    value: string;
    content: string;
    confidence: number;
  }>;
  reasoning: string;
}

@Injectable()
export class EntityWriter {
  constructor(private readonly httpService: HttpService) {}

  private extractJsonFromContent(content: string): string | null {
    // First, try to extract JSON from markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const potentialJson = match[1].trim();
      if (this.isValidJson(potentialJson)) {
        return potentialJson;
      }
    }

    // Second, try to find JSON array or object directly
    const jsonRegex = /\[[\s\S]*?\]|\{[\s\S]*?\}/;
    const jsonMatch = content.match(jsonRegex);
    if (jsonMatch) {
      const potentialJson = jsonMatch[0];
      if (this.isValidJson(potentialJson)) {
        return potentialJson;
      }
    }

    return null;
  }

  private isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  async extractEntities(input: WriterInput): Promise<WriterOutput> {
    const categoryDescriptions = input.categories
      .map((cat) => {
        const keywords =
          cat.keywords && cat.keywords.length > 0
            ? `\n  Keywords: ${cat.keywords.join(', ')}`
            : '';
        const dataType = cat.dataType ? ` [type: ${cat.dataType}]` : '';

        return `- "${cat.name}"${dataType}:\n  Description: ${cat.description || 'Extract relevant entities for this category'}${keywords}`;
      })
      .join('\n\n');

    const feedbackSection = input.previousFeedback
      ? `

IMPORTANT - Previous reviewer feedback to address:
"${input.previousFeedback}"

Please correct the issues mentioned in the feedback above.`
      : '';

    const prompt = `You are an expert entity extraction system. Analyze the provided text and extract relevant entities based on the given categories.

Categories:
${categoryDescriptions}

Extraction Guidelines:
- Extract specific, meaningful entities that match the category definitions
- Use exact text from the source
- Assign each entity to the most appropriate category
- Provide confidence scores between 0.0 and 1.0
- Include context for each extracted entity

${feedbackSection}

Return a JSON object with:
{
  "entities": [
    {
      "category": "exact category name",
      "value": "extracted entity text",
      "content": "original context from text",
      "confidence": 0.85
    }
  ],
  "reasoning": "Brief explanation of extraction decisions"
}

Text to analyze: "${input.text}"`;

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

      console.log('Raw AI response:', content);

      // Extract JSON from content
      const jsonString = this.extractJsonFromContent(content);

      if (!jsonString) {
        console.log('No JSON found in response');
        return {
          entities: [],
          reasoning: 'No JSON format found in AI response',
        };
      }

      // Parse the JSON directly - no cleaning needed for properly formatted JSON
      const parsed = JSON.parse(jsonString) as any;

      // Extract entities array
      let entities: any[] = [];
      if (Array.isArray(parsed)) {
        entities = parsed;
      } else if (parsed && typeof parsed === 'object' && parsed.entities) {
        entities = (parsed as any).entities;
      }

      // Validate and normalize entities
      const validatedEntities = entities
        .filter((entity: any) => entity && typeof entity === 'object')
        .map(
          (entity: {
            category?: string;
            value?: string;
            content?: string;
            confidence?: number;
          }) => ({
            category: String(entity.category || ''),
            value: String(entity.value || ''),
            content: String(entity.content || ''),
            confidence:
              typeof entity.confidence === 'number' && !isNaN(entity.confidence)
                ? Math.max(0, Math.min(1, entity.confidence))
                : 0.85,
          }),
        )
        .filter(
          (entity: {
            category: string;
            value: string;
            content: string;
            confidence: number;
          }) => entity.category && entity.value,
        );

      return {
        entities: validatedEntities,
        reasoning: parsed?.reasoning || 'Extracted and validated entities',
      };
    } catch (error) {
      console.error('Failed to parse writer response:', error);
      return { entities: [], reasoning: 'Failed to parse response' };
    }
  }
}
