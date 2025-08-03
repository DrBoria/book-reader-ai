import { database } from '../database/neo4j';
import { Tag, TagCategory } from '../types';
import { v4 as uuid } from 'uuid';

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

  async createDynamicTag(tag: Tag): Promise<void> {
    const session = await database.getSession();
    try {
      // Use MERGE with unique key to prevent duplicates
      await session.run(`
        MATCH (c:TagCategory {id: $categoryId})
        MERGE (t:Tag {
          name: $name,
          value: $value,
          bookId: $bookId,
          categoryId: $categoryId
        })
        ON CREATE SET 
          t.id = $id,
          t.confidence = $confidence,
          t.createdAt = datetime()
        MERGE (t)-[:BELONGS_TO]->(c)
      `, {
        id: tag.id,
        name: tag.name,
        value: tag.value,
        bookId: tag.bookId,
        categoryId: tag.categoryId,
        confidence: tag.confidence
      });
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

  async createCategory(categoryData: Omit<TagCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        CREATE (c:TagCategory {
          id: randomUUID(),
          name: $name,
          description: $description,
          color: $color,
          type: $type,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN c.id as id
      `, categoryData);
      
      return result.records[0].get('id');
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
      const id = uuid.v4();
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
}
