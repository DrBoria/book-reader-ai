import { OpenAI } from 'openai';
import { config } from '../config';
import { TagCategory } from '../types';

export interface ReviewerInput {
  text: string;
  categories: TagCategory[];
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

export class EntityReviewer {
  private openai: OpenAI;

  constructor() {
    const cleanHost = config.lmStudio.host.replace(/\/$/, '');
    this.openai = new OpenAI({
      baseURL: `${cleanHost}/v1`,
      apiKey: 'lm-studio'
    });
  }

  async reviewEntities(input: ReviewerInput): Promise<ReviewerOutput> {
    const categoryInfo = input.categories.map(cat => {
      const keywords = cat.keywords && cat.keywords.length > 0 
        ? `\n    Keywords: ${cat.keywords.join(', ')}`
        : '';
      const dataType = cat.dataType ? ` [${cat.dataType}]` : '';
      const description = cat.description || 'Extract relevant entities for this category';
      
      return `"${cat.name}"${dataType}:\n    Description: ${description}${keywords}`;
    }).join('\n\n- ');

    const entitiesJson = JSON.stringify(input.extractedEntities, null, 2);

    const prompt = `You are a quality reviewer for entity extraction. Your goal is to ensure entities are correctly categorized based on their actual meaning and the category descriptions.

ORIGINAL TEXT: "${input.text}"

EXTRACTED ENTITIES:
${entitiesJson}

WRITER REASONING: "${input.writerReasoning}"

AVAILABLE CATEGORIES (use descriptions and keywords to judge appropriateness):
- ${categoryInfo}

Review guidelines (use category descriptions and keywords as your guide):

✅ APPROVE if entities are:
- Correctly categorized based on their actual meaning (people in People categories, locations in Location categories, etc.)
- Proper nouns that match the category's description and keywords
- Correctly typed according to the specified data type
- Actually present in the original text

❌ REJECT if:
- People are categorized as Events, Locations as Organizations, etc.
- Clear data type violations (wrong data type for category)
- Entities that completely contradict the category description
- Entities not found in the original text

Evaluation approach:
- Use the detailed category descriptions to judge if entities fit their assigned categories
- Consider the provided keywords as context clues
- Focus on whether each entity meaningfully relates to the category's purpose as described
- Be strict about correct categorization - a person's name should not be in an Events category

Respond with either:
- APPROVED - if all entities are correctly categorized
- REJECTED: [specific feedback] - if categorization issues are found, provide clear feedback about what needs to be corrected

Your response:`;

    const response = await this.openai.chat.completions.create({
      model: config.lmStudio.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
      top_p: 0.9
    });

    const content = response.choices[0].message.content || '';
    
    if (content.toLowerCase().includes('approved')) {
      return {
        approved: true,
        approvedEntities: input.extractedEntities
      };
    }
    
    const feedback = content.replace(/^rejected:?\s*/i, '').trim();
    return {
      approved: false,
      feedback: feedback || 'Categorization issues found, please review category assignments'
    };
  }
}
