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
    // Try to extract JSON from markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    let match;
    let bestJson = null;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const potentialJson = match[1].trim();
      if (this.isValidJson(potentialJson)) {
        bestJson = potentialJson;
        break;
      }
    }
    
    if (bestJson) return bestJson;
    
    // Try to find JSON directly in the content
    const jsonRegex = /(?:\{[\s\S]*\}|\[[\s\S]*\])/;
    const directMatch = content.match(jsonRegex);
    if (directMatch) {
      return directMatch[0];
    }
    
    return null;
  }

  private cleanJsonString(jsonString: string): string {
    // Remove trailing commas
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix common JSON issues
    jsonString = jsonString.replace(/(["'])([^"']*)\1(?=\s*:)/g, '"$2"'); // Fix unquoted keys
    
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

CATEGORY DEFINITIONS - USE EXACTLY:

**Events**: SPECIFIC historical occurrences, conferences, meetings, product launches, legal proceedings. Must be actual events, not ongoing processes or generic activities. Examples: "Microsoft antitrust trial", "World War II", "Apple WWDC 2024".

**Organizations**: Companies, institutions, government agencies, formal groups. Must be actual organizations, not their actions or products. Examples: "Microsoft", "U.S. Justice Department", "Apple Inc.", "Google".

**Technology & Concepts**: Specific technologies, programming languages, frameworks, products, technical concepts. Examples: "Internet Explorer", "JavaScript", "machine learning", "Internet Explorer 4.0".

**People**: Individual persons, historical figures, inventors, CEOs, authors. Examples: "Bill Gates", "Ada Lovelace", "Steve Jobs".

**Time**: Specific time periods, decades, years, dates. Examples: "1997", "Fall 1997", "1970s".

**Locations**: Specific places, countries, cities, institutions. Examples: "Silicon Valley", "Redmond, Washington", "United States".

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

EXAMPLES OF CORRECT CATEGORIZATION:
- "Microsoft" → Organizations (company)
- "Internet Explorer 4.0" → Technology & Concepts (specific product)
- "Fall 1997" → Time (specific period)
- "U.S. Justice Department" → Organizations (government agency)

EXAMPLES OF INCORRECT CATEGORIZATION:
- "Introduction of Internet Explorer 4.0" → Events (WRONG - this is a product release, use Technology & Concepts)
- "Antitrust suit against Microsoft" → Events (WRONG - should be "Microsoft antitrust trial" if specific)

Required JSON format (return ONLY valid JSON):
{
  "entities": [
    {"category":"Organizations","value":"Microsoft","content":"Microsoft's introduction","confidence":0.95},
    {"category":"Technology & Concepts","value":"Internet Explorer 4.0","content":"Internet Explorer 4.0","confidence":0.90},
    {"category":"Time","value":"Fall 1997","content":"in the fall of 1997","confidence":0.85}
  ],
  "reasoning": "Extracted specific entities and categorized according to exact definitions"
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
      
      // Method 1: Try to extract JSON from markdown code blocks
      let jsonString = this.extractJsonFromContent(content);
      
      if (!jsonString) {
        // Method 2: Try to find JSON object or array directly
        let jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          jsonMatch = content.match(/\[[\s\S]*\]/);
        }
        
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }
      
      if (!jsonString) {
        console.log('No JSON found in response');
        return { entities: [], reasoning: 'No JSON format found in AI response' };
      }

      // Clean up common JSON issues
      jsonString = this.cleanJsonString(jsonString);
      
      const parsed = JSON.parse(jsonString);
      
      // Handle both object format and array format
      if (Array.isArray(parsed)) {
        return { entities: parsed, reasoning: 'Extracted entities from array format' };
      } else if (parsed && typeof parsed === 'object') {
        return parsed;
      } else {
        return { entities: [], reasoning: 'Invalid JSON structure' };
      }
    } catch (error) {
      console.error('Failed to parse writer response:', error);
      console.error('Raw content:', content);
      return { entities: [], reasoning: 'Failed to parse response' };
    }
  }
}
