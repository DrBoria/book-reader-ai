/**
 * Data type normalization utilities for entity validation and processing
 */

/**
 * Check if entity value is valid for the given data type
 */
export function isValidEntityForDataType(value: string, dataType: string): boolean {
  switch (dataType) {
    case 'date':
      return isValidDateEntity(value);
    case 'number':
      return isValidNumberEntity(value);
    case 'text':
      return isValidTextEntity(value);
    default:
      return true; // Allow unknown types
  }
}

/**
 * Normalize entity value based on data type
 */
export function normalizeEntityByDataType(value: string, dataType: string): string {
  switch (dataType) {
    case 'date':
      return normalizeDateEntity(value);
    case 'number':
      return normalizeNumberEntity(value);
    case 'text':
      return normalizeTextEntity(value);
    default:
      return value.trim();
  }
}

/**
 * Check if two date ranges overlap or should be merged
 */
export function shouldMergeDateRanges(range1: string, range2: string): boolean {
  const parsed1 = parseDateRange(range1);
  const parsed2 = parseDateRange(range2);
  
  if (!parsed1 || !parsed2) return false;
  
  // Calculate actual overlap
  const overlap = Math.max(0, Math.min(parsed1.end, parsed2.end) - Math.max(parsed1.start, parsed2.start) + 1);
  
  // Only merge if there's actual overlap (not just adjacent periods)
  return overlap > 0;
}

/**
 * Parse date range string into start/end years
 */
function parseDateRange(range: string): { start: number; end: number } | null {
  // Single year (e.g., "1980" treated as 1980-1980)
  if (/^\d{4}$/.test(range)) {
    const year = parseInt(range);
    return { start: year, end: year };
  }
  
  // Year range (e.g., "1970-1979", "1970–1979")
  const rangeMatch = range.match(/^(\d{4})[-–](\d{4})$/);
  if (rangeMatch) {
    return {
      start: parseInt(rangeMatch[1]),
      end: parseInt(rangeMatch[2])
    };
  }
  
  // Decade format (e.g., "1970s")
  const decadeMatch = range.match(/^(\d{4})s$/);
  if (decadeMatch) {
    const decade = parseInt(decadeMatch[1]);
    return { start: decade, end: decade + 9 };
  }
  
  return null;
}

/**
 * Check if value is a valid date/temporal entity
 */
function isValidDateEntity(value: string): boolean {
  // Years (1900-2100)
  if (/^\d{4}$/.test(value)) {
    const year = parseInt(value);
    return year >= 1000 && year <= 2100;
  }
  
  // Year ranges (1945-1950, 1945–1950)
  if (/^\d{4}[-–]\d{4}$/.test(value)) {
    return true;
  }
  
  // Decades (1940s, 1990s)
  if (/^\d{4}s$/.test(value)) {
    return true;
  }
  
  // Dates (various formats)
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(value)) {
    return true;
  }
  
  // Time periods with words
  if (/\b(century|decade|era|period|time)\b/i.test(value)) {
    return true;
  }
  
  return false;
}

/**
 * Check if value is a valid number entity
 */
function isValidNumberEntity(value: string): boolean {
  // Pure numbers
  if (/^\d+$/.test(value)) {
    return true;
  }
  
  // Numbers with units
  if (/^\d+\s*(kg|km|mb|gb|hz|mhz|ghz|%|percent)$/i.test(value)) {
    return true;
  }
  
  // Decimal numbers
  if (/^\d+\.\d+$/.test(value)) {
    return true;
  }
  
  return false;
}

/**
 * Check if value is a valid text entity (names, places, etc.)
 */
function isValidTextEntity(value: string): boolean {
  // Don't allow pure numbers in text categories
  if (/^\d+$/.test(value)) {
    return false;
  }
  
  // Don't allow year ranges in text categories
  if (/^\d{4}[-–]\d{4}$/.test(value)) {
    return false;
  }
  
  // Don't allow decades in text categories
  if (/^\d{4}s$/.test(value)) {
    return false;
  }
  
  // Must have at least one letter
  if (!/[a-zA-Zа-яА-Я]/.test(value)) {
    return false;
  }
  
  // Must be at least 2 characters
  if (value.length < 2) {
    return false;
  }
  
  return true;
}

/**
 * Normalize date entity
 */
function normalizeDateEntity(value: string): string {
  // Keep single years as-is to avoid conflicts
  if (/^\d{4}$/.test(value)) {
    return value; // Keep "1980" as "1980"
  }
  
  // Normalize existing year ranges - standardize dash format
  if (/^\d{4}[-–]\d{4}$/.test(value)) {
    return value.replace('-', '–'); // Use en-dash
  }
  
  // Keep decade format as-is to preserve user intent, but normalize dash
  if (/^\d{4}s$/.test(value)) {
    return value; // Keep "1970s" as "1970s"
  }
  
  return value;
}

/**
 * Normalize number entity
 */
function normalizeNumberEntity(value: string): string {
  // Keep numbers as-is for now
  return value;
}

/**
 * Normalize text entity
 */
function normalizeTextEntity(value: string): string {
  // Remove parenthetical descriptions
  let normalized = value.replace(/\s*\([^)]*\)$/, '');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Calculate similarity score between two entities based on data type
 */
export function calculateDataTypeSimilarity(str1: string, str2: string, dataType: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();
  
  if (normalized1 === normalized2) {
    return 1.0;
  }
  
  switch (dataType) {
    case 'date':
      return calculateDateSimilarity(str1, str2);
    case 'number':
      return calculateNumberSimilarity(str1, str2);
    case 'text':
    default:
      return calculateTextSimilarity(str1, str2);
  }
}

/**
 * Calculate similarity for date entities
 */
function calculateDateSimilarity(str1: string, str2: string): number {
  const parsed1 = parseDateRange(str1);
  const parsed2 = parseDateRange(str2);
  
  if (!parsed1 || !parsed2) {
    return calculateTextSimilarity(str1, str2); // Fallback to text similarity
  }
  
  // Check if both are single years (not ranges)
  const isSingleYear1 = parsed1.start === parsed1.end;
  const isSingleYear2 = parsed2.start === parsed2.end;
  
  // If both are single years, only merge if they're the same year
  if (isSingleYear1 && isSingleYear2) {
    return parsed1.start === parsed2.start ? 1.0 : 0.0;
  }
  
  // Calculate actual overlap
  const overlap = Math.max(0, Math.min(parsed1.end, parsed2.end) - Math.max(parsed1.start, parsed2.start) + 1);
  
  if (overlap > 0) {
    // Real overlap - calculate overlap ratio
    const range1Size = parsed1.end - parsed1.start + 1;
    const range2Size = parsed2.end - parsed2.start + 1;
    const overlapRatio = overlap / Math.max(range1Size, range2Size);
    
    // High similarity for significant overlap (>= 50%)
    return overlapRatio >= 0.5 ? 0.9 : overlapRatio;
  }
  
  // Check strict containment (one completely inside the other)
  const isStrictlyContained = 
    (parsed1.start >= parsed2.start && parsed1.end <= parsed2.end && 
     (parsed1.start > parsed2.start || parsed1.end < parsed2.end)) ||
    (parsed2.start >= parsed1.start && parsed2.end <= parsed1.end && 
     (parsed2.start > parsed1.start || parsed2.end < parsed1.end));
  
  if (isStrictlyContained) {
    return 0.85; // High similarity for containment
  }
  
  // No overlap and no containment = low similarity
  return 0.0;
}

/**
 * Calculate similarity for number entities
 */
function calculateNumberSimilarity(str1: string, str2: string): number {
  const num1 = parseFloat(str1);
  const num2 = parseFloat(str2);
  
  if (isNaN(num1) || isNaN(num2)) {
    return calculateTextSimilarity(str1, str2);
  }
  
  if (num1 === num2) return 1.0;
  
  // Calculate relative difference
  const maxNum = Math.max(Math.abs(num1), Math.abs(num2));
  const diff = Math.abs(num1 - num2);
  
  if (maxNum === 0) return num1 === num2 ? 1.0 : 0.0;
  
  return Math.max(0, 1 - diff / maxNum);
}

/**
 * Calculate similarity for text entities
 */
function calculateTextSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();
  
  if (normalized1 === normalized2) {
    return 1.0;
  }
  
  // One is a substring of the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
    const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
    
    // Merge if shorter name is significant part of longer name
    return shorter.length >= 3 && shorter.length / longer.length > 0.6 ? 0.8 : 0.4;
  }
  
  // Fuzzy matching based on common words
  const words1 = normalized1.split(/\s+/).filter(w => w.length > 2);
  const words2 = normalized2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length > 0 && words2.length > 0) {
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.min(words1.length, words2.length);
  }
  
  return 0;
}
