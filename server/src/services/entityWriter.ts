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

  private preProcessJsonContent(jsonString: string): string {
    // Handle unescaped newlines specifically in content fields
    return jsonString
      .replace(/"content"\s*:\s*"([^"]*)"/g, (match, content) => {
        const escaped = content
          .replace(/\\/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
          .replace(/"/g, '\\"');
        return `"content": "${escaped}"`;
      })
      .replace(/"value"\s*:\s*"([^"]*)"/g, (match, value) => {
        const escaped = value
          .replace(/\\/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t')
          .replace(/"/g, '\\"');
        return `"value": "${escaped}"`;
      });
  }

  private cleanJsonString(jsonString: string): string {
    // First, handle unescaped newlines within string values
    jsonString = jsonString.replace(/"([^"]*(?:\n|\r)[^"]*)"/g, (match, content) => {
      const escaped = content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    
    // Remove trailing commas
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix incomplete decimal numbers (like "confidence":0.)
    jsonString = jsonString.replace(/:\s*(\d+)(\.(?![\d\]]))/g, ': $1.0');
    
    // Fix common JSON issues
    jsonString = jsonString.replace(/(["'])([^"']*)\1(?=\s*:)/g, '"$2"'); // Fix unquoted keys
    
    // Ensure confidence values are valid numbers
    jsonString = jsonString.replace(/"confidence"\s*:\s*([a-zA-Z"'][^,}\]]*)/g, '"confidence": 0.8');
    
    return jsonString;
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

    const prompt = `You are a precise entity extraction system. Extract meaningful entities from the given text and assign them to the EXACT category based on specific definitions.

Categories to extract:
${categoryDescriptions}

CATEGORY DEFINITIONS - USE EXACTLY AS PROVIDED IN THE CATEGORIES ABOVE:

For each category provided above, extract entities that match its specific definition and keywords. Use the exact category names as specified in the categories list above.

Examples for common categories:

**Events** (if this category exists): SPECIFIC historical occurrences, conferences, meetings, product launches, legal proceedings. Must be actual events, not ongoing processes or generic activities. Examples: "Microsoft antitrust trial", "World War II", "Apple WWDC 2024".

**Organizations** (if this category exists): Companies, institutions, government agencies, formal groups. Must be actual organizations, not their actions or products. Examples: "Microsoft", "U.S. Justice Department", "Apple Inc.", "Google".

**Technology & Concepts** (if this category exists): Specific technologies, programming languages, frameworks, products, technical concepts. Examples: "Internet Explorer", "JavaScript", "machine learning", "Internet Explorer 4.0".

**People** (if this category exists): Individual persons, historical figures, inventors, CEOs, authors. Examples: "Bill Gates", "Ada Lovelace", "Steve Jobs".

**Time** (if this category exists): Specific time periods, decades, years, dates, year ranges. Examples: "1997", "Fall 1997", "1970s", "1990-2000", "1995-1998", "late 1990s", "early 2000s".

**Locations** (if this category exists): Specific places, countries, cities, institutions. Examples: "Silicon Valley", "Redmond, Washington", "United States".

COMMON MISTAKES TO AVOID:
- "Introduction of Internet Explorer 4.0" → Technology & Concepts (NOT Events)
- "Antitrust suit against Microsoft" → Events (only if specific trial name)
- Product names → Technology & Concepts (NOT Events)
- Company names → Organizations (NOT Technology & Concepts)

EXTRACTION GUIDELINES:
1. **Extract specific entities only**: Proper nouns, specific product names, exact dates
2. **Use exact text**: Copy the exact wording from the source text
3. **Avoid generic terms**: Don't extract common words like "company", "technology", "product"
4. **One category per entity**: Choose the most specific, accurate category
5. **High confidence only**: Only include entities you're confident about (0.8+ confidence)

${input.previousFeedback ? `

CRITICAL - REVIEWER FEEDBACK TO ADDRESS:
${input.previousFeedback}

IMPORTANT: Address the specific feedback above by:
1. Recategorizing any incorrectly categorized entities
2. Adding missing entities if requested
3. Removing generic or vague entities
4. Ensuring all entities match the exact category definitions

If the feedback mentions specific entity corrections, apply those exact changes.` : ''}

Required JSON format (return ONLY valid JSON):
{
  "entities": [
    {"category":"<USE EXACT CATEGORY NAME FROM ABOVE>","value":"<exact entity from text>","content":"<original context>","confidence":<0.8-1.0>}
  ],
  "reasoning": "Extracted specific entities using the exact category names provided in the categories list above"
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
      console.log('Raw AI response:', content);
      
      // Extract JSON from content
      let jsonString = this.extractJsonFromContent(content);
      
      if (!jsonString) {
        console.log('No JSON found in response');
        return { entities: [], reasoning: 'No JSON format found in AI response' };
      }

      // Parse the JSON directly - no cleaning needed for properly formatted JSON
      const parsed = JSON.parse(jsonString);
      
      // Extract entities array
      let entities = [];
      if (Array.isArray(parsed)) {
        entities = parsed;
      } else if (parsed && typeof parsed === 'object' && parsed.entities) {
        entities = parsed.entities;
      }
      
      // Validate and normalize entities
      const validatedEntities = entities
        .filter((entity: any) => entity && typeof entity === 'object')
        .map((entity: { category?: string; value?: string; content?: string; confidence?: number }) => ({
          category: String(entity.category || ''),
          value: String(entity.value || ''),
          content: String(entity.content || ''),
          confidence: typeof entity.confidence === 'number' && !isNaN(entity.confidence) 
            ? Math.max(0, Math.min(1, entity.confidence)) 
            : 0.8
        }))
        .filter((entity: { category: string; value: string; content: string; confidence: number }) => entity.category && entity.value);
      
      return {
        entities: validatedEntities,
        reasoning: parsed?.reasoning || 'Extracted and validated entities'
      };
    } catch (error) {
      console.error('Failed to parse writer response:', error);
      console.error('Raw content:', content);
      return { entities: [], reasoning: 'Failed to parse response' };
    }
  }
}
