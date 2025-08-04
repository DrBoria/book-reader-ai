import { database } from '../database/neo4j';
import { Tag, TagCategory } from '../types';
import { v4 as uuid } from 'uuid';
import { normalizeTagName, findMergeableTag, shouldMergeTags } from '../utils/tagNormalization';

export class TagRepository {
  async getAllCategories(): Promise<TagCategory[]> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (c:TagCategory)
        RETURN c
        ORDER BY c.name
      `);
      
      return result.records.map(record => {
        const category = record.get('c').properties;
        return {
          ...category,
          createdAt: category.createdAt ? new Date(category.createdAt) : undefined,
          updatedAt: category.updatedAt ? new Date(category.updatedAt) : undefined
        };
      });
    } finally {
      await session.close();
    }
  }

  async getAllTags(): Promise<Tag[]> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (t:Tag)-[:BELONGS_TO]->(c:TagCategory)
        OPTIONAL MATCH (t)<-[:TAGGED_AS]-(content:Content)
        WITH t, c, count(content) as contentCount
        WHERE contentCount > 0 OR t.bookId IS NULL
        RETURN t, c, contentCount
        ORDER BY c.name, t.name
      `);
      
      return result.records.map(record => {
        const tag = record.get('t').properties;
        const contentCount = record.get('contentCount').toNumber();
        return {
          ...tag,
          contentCount,
          createdAt: tag.createdAt ? new Date(tag.createdAt) : undefined
        };
      });
    } finally {
      await session.close();
    }
  }

  async createDynamicTag(tag: Tag): Promise<string> {
    const session = await database.getSession();
    try {
      // Get category info for normalization
      const categoryResult = await session.run(`
        MATCH (c:TagCategory {id: $categoryId})
        RETURN c.name as categoryName
      `, { categoryId: tag.categoryId });
      
      if (categoryResult.records.length === 0) {
        throw new Error(`Category with id ${tag.categoryId} not found`);
      }
      
      const categoryName = categoryResult.records[0].get('categoryName');
      
      if (!categoryName) {
        throw new Error(`Category name not found for id ${tag.categoryId}`);
      }
      
      // Normalize the tag name
      const normalizedName = normalizeTagName(tag.name);
      
      // Check for existing similar tags in the same category and book
      const existingTagsResult = await session.run(`
        MATCH (t:Tag {categoryId: $categoryId, bookId: $bookId})
        RETURN t.id as id, t.name as name
      `, { 
        categoryId: tag.categoryId, 
        bookId: tag.bookId 
      });
      
      const existingTags: Tag[] = existingTagsResult.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        categoryId: tag.categoryId,
        bookId: tag.bookId
      } as Tag));
      
      // Find if there's an existing tag we should merge with
      const mergeableTag = findMergeableTag(
        normalizedName,
        tag.categoryId || '',
        tag.bookId || null,
        existingTags
      );
      
      if (mergeableTag) {
        // Return existing tag ID for content to be linked to
        console.log(`Merging tag "${tag.name}" into existing tag "${mergeableTag.name}"`);
        return mergeableTag.id;
      }
      
      // Create new tag with normalized name
      const result = await session.run(`
        MATCH (c:TagCategory {id: $categoryId})
        MERGE (t:Tag {
          name: $normalizedName,
          value: $value,
          bookId: $bookId,
          categoryId: $categoryId
        })
        ON CREATE SET 
          t.id = $id,
          t.confidence = $confidence,
          t.createdAt = datetime()
        MERGE (t)-[:BELONGS_TO]->(c)
        RETURN t.id as tagId
      `, {
        id: tag.id,
        normalizedName,
        value: tag.value,
        bookId: tag.bookId,
        categoryId: tag.categoryId,
        confidence: tag.confidence
      });
      
      return result.records[0].get('tagId');
    } finally {
      await session.close();
    }
  }

  async deleteTag(tagId: string): Promise<void> {
    const session = await database.getSession();
    try {
      await session.run(`
        MATCH (t:Tag {id: $tagId})
        DETACH DELETE t
      `, { tagId });
    } finally {
      await session.close();
    }
  }

  async bulkDeleteTags(tagIds: string[]): Promise<number> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (t:Tag)
        WHERE t.id IN $tagIds
        DETACH DELETE t
        RETURN count(t) as deletedCount
      `, { tagIds });
      
      return result.records[0]?.get('deletedCount')?.toNumber() || 0;
    } finally {
      await session.close();
    }
  }



  async getTagsByBookId(bookId: string): Promise<Tag[]> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (t:Tag {bookId: $bookId})-[:BELONGS_TO]->(c:TagCategory)
        RETURN t, c
        ORDER BY c.name, t.confidence DESC
      `, { bookId });
      
      return result.records.map(record => {
        const tag = record.get('t').properties;
        return {
          ...tag,
          createdAt: tag.createdAt ? new Date(tag.createdAt) : undefined
        };
      });
    } finally {
      await session.close();
    }
  }

  async getContentByTag(tagId: string): Promise<any[]> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (t:Tag {id: $tagId})<-[:TAGGED_AS]-(c:Content)-[:BELONGS_TO]->(p:Page)-[:BELONGS_TO]->(b:Book)
        RETURN c, p, b, t
        ORDER BY p.pageNumber
      `, { tagId });
      
      return result.records.map(record => ({
        content: record.get('c').properties,
        page: record.get('p').properties,
        book: record.get('b').properties,
        tag: record.get('t').properties
      }));
    } finally {
      await session.close();
    }
  }

  async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const session = await database.getSession();
    try {
      const id = uuid();
      const result = await session.run(`
        MATCH (c:TagCategory {id: $categoryId})
        CREATE (t:Tag {
          id: $id,
          name: $name,
          type: $type,
          bookId: $bookId,
          categoryId: $categoryId,
          value: $value,
          confidence: $confidence,
          contentCount: 0,
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:BELONGS_TO]->(c)
        RETURN t
      `, { 
        id,
        name: tag.name, 
        type: tag.type || 'custom',
        bookId: tag.bookId || null,
        categoryId: tag.categoryId,
        value: tag.value || null,
        confidence: tag.confidence || null
      });
      
      return result.records[0].get('t').properties;
    } finally {
      await session.close();
    }
  }

  async createCategory(category: Omit<TagCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<TagCategory> {
    const session = await database.getSession();
    try {
      const id = category.name.toLowerCase().replace(/\s+/g, '-');
      const result = await session.run(`
        CREATE (tc:TagCategory {
          id: $id,
          name: $name,
          description: $description,
          color: $color,
          type: 'custom',
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN tc
      `, { 
        id,
        name: category.name,
        description: category.description || '',
        color: category.color || '#6B7280'
      });
      
      return result.records[0].get('tc').properties;
    } finally {
      await session.close();
    }
  }

  async updateCategoryKeywords(categoryId: string, keywords: string[]): Promise<any> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (tc:TagCategory {id: $categoryId})
        SET tc.keywords = $keywords,
            tc.updatedAt = datetime()
        RETURN tc
      `, { 
        categoryId,
        keywords
      });
      
      if (result.records.length === 0) {
        throw new Error('Category not found');
      }
      
      return result.records[0].get('tc').properties;
    } finally {
      await session.close();
    }
  }

  async cleanupDuplicateTags(): Promise<{ mergedGroups: number, totalMerged: number }> {
    const session = await database.getSession();
    try {
      // Get all tags with their categories
      const tagsResult = await session.run(`
        MATCH (t:Tag)-[:BELONGS_TO]->(c:TagCategory)
        RETURN t, c.name as categoryName
        ORDER BY t.createdAt ASC
      `);
      
      const tags: (Tag & { categoryName: string })[] = tagsResult.records.map(record => {
        const tag = record.get('t').properties;
        return {
          ...tag,
          categoryName: record.get('categoryName'),
          createdAt: tag.createdAt ? new Date(tag.createdAt) : undefined
        };
      });
      
      // Group tags by category and book
      const tagGroups = new Map<string, (Tag & { categoryName: string })[]>();
      
      for (const tag of tags) {
        const groupKey = `${tag.categoryId}:${tag.bookId || 'global'}`;
        if (!tagGroups.has(groupKey)) {
          tagGroups.set(groupKey, []);
        }
        tagGroups.get(groupKey)!.push(tag);
      }
      
      let mergedGroups = 0;
      let totalMerged = 0;
      
      // Process each group for duplicates
      for (const [groupKey, groupTags] of tagGroups) {
        const mergeActions: { keepTagId: string, mergeTagIds: string[] }[] = [];
        const processed = new Set<string>();
        
        for (let i = 0; i < groupTags.length; i++) {
          const tag1 = groupTags[i];
          if (processed.has(tag1.id)) continue;
          
          const mergeGroup = [tag1.id];
          const normalizedName1 = normalizeTagName(tag1.name);
          
          // Find similar tags in the same group
          for (let j = i + 1; j < groupTags.length; j++) {
            const tag2 = groupTags[j];
            if (processed.has(tag2.id)) continue;
            
            const normalizedName2 = normalizeTagName(tag2.name);
            
            // Check if tags should be merged
            if (shouldMergeTags(normalizedName1, normalizedName2)) {
              mergeGroup.push(tag2.id);
              processed.add(tag2.id);
            }
          }
          
          if (mergeGroup.length > 1) {
            // Keep the oldest tag (first in creation order)
            mergeActions.push({
              keepTagId: mergeGroup[0],
              mergeTagIds: mergeGroup.slice(1)
            });
            mergedGroups++;
            totalMerged += mergeGroup.length - 1;
          }
          
          processed.add(tag1.id);
        }
        
        // Execute merge actions for this group
        for (const action of mergeActions) {
          await this.executeMergeTags(action.keepTagId, action.mergeTagIds);
        }
      }
      
      return { mergedGroups, totalMerged };
    } finally {
      await session.close();
    }
  }



  private async executeMergeTags(keepTagId: string, mergeTagIds: string[]): Promise<void> {
    const session = await database.getSession();
    try {
      for (const mergeTagId of mergeTagIds) {
        console.log(`Merging tag ${mergeTagId} into ${keepTagId}`);
        
        // Move all content from merge tag to keep tag
        await session.run(`
          MATCH (c:Content)-[:TAGGED_AS]->(mergeTag:Tag {id: $mergeTagId})
          MATCH (keepTag:Tag {id: $keepTagId})
          CREATE (c)-[:TAGGED_AS]->(keepTag)
          WITH c, mergeTag
          MATCH (c)-[r:TAGGED_AS]->(mergeTag)
          DELETE r
        `, { mergeTagId, keepTagId });
        
        // Delete the merged tag
        await session.run(`
          MATCH (t:Tag {id: $mergeTagId})
          DETACH DELETE t
        `, { mergeTagId });
      }
    } finally {
      await session.close();
    }
  }
}
