import { Tag, TagCategory } from '../types';

/**
 * Simple tag name normalization without hardcoded rules
 */
export function normalizeTagName(tagName: string, categoryName?: string): string {
  let normalized = tagName.trim();
  
  // Remove content in parentheses (descriptions/clarifications)
  normalized = normalized.replace(/\s*\([^)]*\)$/, '');
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Check if two tag names should be merged based on similarity
 */
export function shouldMergeTags(name1: string, name2: string): boolean {
  const normalized1 = name1.toLowerCase().trim();
  const normalized2 = name2.toLowerCase().trim();
  
  // Exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }
  
  // One is a substring of the other (e.g., "IBM" and "IBM watchers")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
    const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
    
    // Merge if shorter name is significant part of longer name
    return shorter.length >= 3 && shorter.length / longer.length > 0.6;
  }
  
  return false;
}

/**
 * Find existing tag that should be merged with the new tag
 */
export function findMergeableTag(
  newTagName: string, 
  categoryId: string, 
  bookId: string | null,
  existingTags: Tag[]
): Tag | null {
  const normalizedNewName = normalizeTagName(newTagName);
  
  const foundTag = existingTags.find(tag => {
    // Must be same category and book
    if (tag.categoryId !== categoryId || tag.bookId !== bookId) {
      return false;
    }
    
    const normalizedExistingName = normalizeTagName(tag.name);
    return shouldMergeTags(normalizedNewName, normalizedExistingName);
  });
  
  return foundTag || null;
}

/**
 * Calculate similarity score between two strings (0-1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Simple substring similarity
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length >= s2.length ? s1 : s2;
    return shorter.length / longer.length;
  }
  
  // Levenshtein distance for character-level similarity
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
 * Group similar tags for merging
 */
export function groupSimilarTags(
  tags: Tag[], 
  categories: TagCategory[],
  similarityThreshold: number = 0.8
): { tag: Tag, mergeWith: Tag[] }[] {
  const mergeGroups: { tag: Tag, mergeWith: Tag[] }[] = [];
  const processed = new Set<string>();
  
  for (let i = 0; i < tags.length; i++) {
    const tag1 = tags[i];
    if (processed.has(tag1.id)) continue;
    
    const mergeWith: Tag[] = [];
    const normalizedName1 = normalizeTagName(tag1.name);
    
    for (let j = i + 1; j < tags.length; j++) {
      const tag2 = tags[j];
      if (processed.has(tag2.id)) continue;
      
      // Must be same category and book
      if (tag1.categoryId !== tag2.categoryId || tag1.bookId !== tag2.bookId) {
        continue;
      }
      
      const normalizedName2 = normalizeTagName(tag2.name);
      const similarity = calculateSimilarity(normalizedName1, normalizedName2);
      
      if (similarity >= similarityThreshold) {
        mergeWith.push(tag2);
        processed.add(tag2.id);
      }
    }
    
    if (mergeWith.length > 0) {
      mergeGroups.push({ tag: tag1, mergeWith });
    }
    
    processed.add(tag1.id);
  }
  
  return mergeGroups;
}
