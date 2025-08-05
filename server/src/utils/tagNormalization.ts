import { Tag, TagCategory } from '../types';
import { normalizeEntityByDataType, calculateDataTypeSimilarity } from './dataTypeNormalization';

/**
 * Normalize tag name based on category data type
 */
export function normalizeTagName(tagName: any, categoryDataType?: string): string {
  // Ensure tagName is a string
  if (typeof tagName !== 'string') {
    console.warn('normalizeTagName received non-string input:', tagName, typeof tagName);
    return String(tagName || '').trim();
  }
  
  // Use data type specific normalization if available
  if (categoryDataType) {
    return normalizeEntityByDataType(tagName, categoryDataType);
  }
  
  // Fallback to general normalization
  let normalized = tagName.trim();
  
  // Remove content in parentheses (descriptions/clarifications)
  normalized = normalized.replace(/\s*\([^)]*\)$/, '');
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Check if two tag names should be merged based on data type aware similarity
 */
export function shouldMergeTags(name1: string, name2: string, dataType?: string): boolean {
  if (dataType) {
    const similarity = calculateDataTypeSimilarity(name1, name2, dataType);
    return similarity >= 0.8; // Higher threshold for data type aware comparison
  }
  
  const similarity = calculateSimilarity(name1, name2);
  return similarity >= 0.75; // Fallback threshold
}

/**
 * Calculate similarity score between two strings (0-1)
 */
export function calculateSimilarity(str1: string, str2: string, dataType?: string): number {
  if (dataType) {
    return calculateDataTypeSimilarity(str1, str2, dataType);
  }
  
  const s1 = normalizeTagName(str1).toLowerCase();
  const s2 = normalizeTagName(str2).toLowerCase();
  
  if (s1 === s2) return 1.0;
  
  // Check if one is substring of another
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length >= s2.length ? s1 : s2;
    return Math.max(0.75, shorter.length / longer.length);
  }
  
  // Use Levenshtein distance for character-level similarity
  const levenshteinDistance = getLevenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : 1 - (levenshteinDistance / maxLength);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function getLevenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find existing tag that should be merged with the new tag
 */
export function findMergeableTag(
  newTagName: string, 
  categoryId: string, 
  bookId: string | null,
  existingTags: Tag[],
  dataType?: string
): Tag | null {
  const bestMatch = existingTags
    .filter(tag => tag.categoryId === categoryId && tag.bookId === bookId)
    .map(tag => ({
      tag,
      similarity: calculateSimilarity(newTagName, tag.name, dataType)
    }))
    .filter(({ similarity }) => similarity >= 0.75)
    .sort((a, b) => b.similarity - a.similarity)[0];

  return bestMatch?.tag || null;
}

/**
 * Find all similar tags that should be merged together
 */
export function findSimilarTags(
  tags: Tag[], 
  categories: { id: string; dataType?: string }[] = [],
  threshold: number = 0.75
): { primary: Tag, duplicates: Tag[] }[] {
  const mergeGroups: { primary: Tag, duplicates: Tag[] }[] = [];
  const processed = new Set<string>();
  
  // Create a map for quick category lookup
  const categoryDataTypes = new Map(
    categories.map(cat => [cat.id, cat.dataType])
  );
  
  for (let i = 0; i < tags.length; i++) {
    const tag1 = tags[i];
    if (processed.has(tag1.id)) continue;
    
    const similarTags: Tag[] = [tag1];
    const dataType = categoryDataTypes.get(tag1.categoryId || '');
    
    for (let j = i + 1; j < tags.length; j++) {
      const tag2 = tags[j];
      if (processed.has(tag2.id)) continue;
      
      // Must be same category and book
      if (tag1.categoryId !== tag2.categoryId || tag1.bookId !== tag2.bookId) {
        continue;
      }
      
      const similarity = calculateSimilarity(tag1.name, tag2.name, dataType);
      
      if (similarity >= threshold) {
        similarTags.push(tag2);
        processed.add(tag2.id);
      }
    }
    
    if (similarTags.length > 1) {
      // For date categories, choose the tag with the largest range as primary
      let primary = similarTags[0];
      if (dataType === 'date') {
        primary = choosePreferredDateTag(similarTags);
      }
      
      const duplicates = similarTags.filter(tag => tag.id !== primary.id);
      mergeGroups.push({ primary, duplicates });
    }
    
    processed.add(tag1.id);
  }
  
  return mergeGroups;
}

/**
 * Choose the preferred date tag (largest range) from a group of similar tags
 */
function choosePreferredDateTag(tags: Tag[]): Tag {
  let preferredTag = tags[0];
  let largestRange = getDateRangeSize(preferredTag.name);
  
  for (let i = 1; i < tags.length; i++) {
    const currentRange = getDateRangeSize(tags[i].name);
    
    // Prefer larger ranges, or if ranges are equal, prefer earlier created tags
    if (currentRange > largestRange || 
        (currentRange === largestRange && 
         tags[i].createdAt && preferredTag.createdAt && 
         new Date(tags[i].createdAt!) < new Date(preferredTag.createdAt!))) {
      preferredTag = tags[i];
      largestRange = currentRange;
    }
  }
  
  return preferredTag;
}

/**
 * Calculate the size of a date range (in years)
 */
function getDateRangeSize(dateString: string): number {
  // Single year (e.g., "1980")
  if (/^\d{4}$/.test(dateString)) {
    return 1;
  }
  
  // Year range (e.g., "1970-1979", "1970–1979")
  const rangeMatch = dateString.match(/^(\d{4})[-–](\d{4})$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    return end - start + 1;
  }
  
  // Decade format (e.g., "1970s") - converted to 10-year range
  if (/^\d{4}s$/.test(dateString)) {
    return 10;
  }
  
  // Default to 1 year for unknown formats
  return 1;
}
