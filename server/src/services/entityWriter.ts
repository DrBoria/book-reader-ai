import { OpenAI } from 'openai';
import { config } from '../config';
import { TagCategory } from '../types';

export interface WriterInput {
  text: string;
  pageNumber: number;
  bookId: string;
  categories: TagCategory[];
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

export class EntityWriter {
  private openai: OpenAI;

  constructor() {
    const cleanHost = config.lmStudio.host.replace(/\/$/, '');
    this.openai = new OpenAI({
      baseURL: `${cleanHost}/v1`,
      apiKey: 'lm-studio'
    });
  }

  async extractEntities(input: WriterInput): Promise<WriterOutput> {
    const categoryDescriptions = input.categories.map(cat => {
      const keywords = cat.keywords && cat.keywords.length > 0 
        ? `\n  Keywords: ${cat.keywords.join(', ')}`
        : '';
      const dataType = cat.dataType ? ` [type: ${cat.dataType}]` : '';
      
      return `- "${cat.name}"${dataType}:\n  Description: ${cat.description || 'Extract relevant entities for this category'}${keywords}`;
    }).join('\n\n');

    const feedbackSection = input.previousFeedback ? `

IMPORTANT - Previous reviewer feedback to address:
"${input.previousFeedback}"

Please correct the issues mentioned in the feedback above.` : '';

    const prompt = `You are a precise entity extraction system. Extract meaningful entities from the given text and assign them to the most appropriate category.

Categories to extract:
${categoryDescriptions}

Data type guidelines:
- [type: date] - Extract years, dates, time periods, decades (e.g., "1945", "1970s", "1961-1975")
- [type: text] - Extract ACTUAL names of people, places, organizations, concepts (NOT common words, NOT numbers or years)
- [type: number] - Extract numeric values, quantities, measurements

CRITICAL Guidelines for text categories:
- Extract only actual proper nouns that represent specific named entities
- Focus on entities that would be capitalized in the middle of sentences
- Analyze the context around each entity to determine if it's a substantive proper noun
- Use the category keywords and descriptions as guidance for what types of entities to look for
- Ensure extracted entities are genuine examples of what the category description specifies
- People names should go in People categories, locations in Location categories, etc.

Additional rules:
- Extract only entities that clearly and specifically belong to each category
- ALLOW entities to belong to MULTIPLE categories if they fit
- STRICTLY respect data types - do NOT put years/dates in text categories
- Return a JSON object with entities and your reasoning

Required JSON format:
{
  "entities": [
    {"category":"category_name","value":"extracted_entity","content":"short_text_fragment","confidence":0.85}
  ],
  "reasoning": "Brief explanation of your categorization decisions"
}

Text to analyze: "${input.text}"`;

    const response = await this.openai.chat.completions.create({
      model: config.lmStudio.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
      top_p: 0.9
    });

    const content = response.choices[0].message.content || '';
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse writer response:', error);
      return { entities: [], reasoning: 'Failed to parse response' };
    }
  }
}
