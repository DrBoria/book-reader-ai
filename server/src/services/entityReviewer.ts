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

    const prompt = `You are a helpful entity categorization reviewer. Your task is to verify if extracted entities are reasonably categorized and provide constructive feedback for improvements.

ORIGINAL TEXT: "${input.text}"

EXTRACTED ENTITIES:
${entitiesJson}

WRITER REASONING: "${input.writerReasoning}"

CATEGORY DEFINITIONS FOR REVIEW:
- Events: SPECIFIC historical occurrences, conferences, meetings, legal proceedings. Must be actual events.
- Organizations: Companies, institutions, government agencies, formal groups, research projects.
- Technology & Concepts: Specific technologies, programming languages, frameworks, software products.
- People: Individual persons, historical figures, inventors, CEOs.
- Time: Specific time periods, decades, years, dates.
- Locations: Specific places, cities, countries, institutions.

REVIEW GUIDELINES:
- Check if entities are reasonably categorized based on the definitions
- Focus on major miscategorizations rather than minor semantic differences
- Allow reasonable interpretations of category boundaries
- Be more accepting of borderline cases

APPROVAL APPROACH:
- APPROVE if most entities are reasonably categorized
- Only REJECT for clear, significant miscategorizations
- Provide specific guidance for improvements rather than blanket rejections

EXAMPLES OF REJECTIONS (only for clear cases):
- "Microsoft" in Technology & Concepts (should be Organizations)
- "1945" in People (should be Time)

EXAMPLES TO APPROVE:
- Borderline cases like "Internet Explorer" in Technology & Concepts
- Reasonable interpretations of category boundaries
- Minor semantic disagreements

Be constructive and helpful rather than overly strict. RESPOND WITH:
- APPROVED - if categorizations are generally reasonable
- REJECTED: [specific entity] should be in [correct category] - only if clearly wrong

Your response:`;

    const response = await this.openai.chat.completions.create({
      model: config.lmStudio.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
      top_p: 0.9
    });

    const content = response.choices[0].message.content || '';
    const cleaned = content.toLowerCase().trim();
    
    if (cleaned.startsWith('approved')) {
      return {
        approved: true,
        approvedEntities: input.extractedEntities
      };
    }
    
    if (cleaned.startsWith('rejected')) {
      const feedback = content.replace(/^rejected:?\s*/i, '').trim();
      return {
        approved: false,
        feedback: feedback || 'Please recategorize based on the specific definitions provided'
      };
    }
    
    // Check for approval keywords
    if (cleaned.includes('approved') || cleaned.includes('accept') || cleaned.includes('correct')) {
      return {
        approved: true,
        approvedEntities: input.extractedEntities
      };
    }
    
    // Check for rejection keywords
    if (cleaned.includes('rejected') || cleaned.includes('incorrect') || cleaned.includes('wrong')) {
      const feedback = content.replace(/^.*?(rejected|incorrect|wrong)/i, '').trim();
      return {
        approved: false,
        feedback: feedback || 'Please recategorize based on the specific definitions provided'
      };
    }
    
    // Default to rejected with specific guidance
    return {
      approved: false,
      feedback: 'Please recategorize based on the specific definitions provided'
    };
  }
}
