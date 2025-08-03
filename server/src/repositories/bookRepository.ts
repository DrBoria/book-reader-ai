import { database } from '../database/neo4j';
import { BookContent, BookPage, TaggedContent } from '../types';

export class BookRepository {
  async createBook(book: Omit<BookContent, 'id'>): Promise<string> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        CREATE (b:Book {
          id: randomUUID(),
          title: $title,
          author: $author,
          filename: $filename,
          totalPages: $totalPages,
          uploadedAt: datetime(),
          status: $status
        })
        RETURN b.id as id
      `, {
        title: book.title,
        author: book.author || null,
        filename: book.filename,
        totalPages: book.totalPages,
        status: book.status
      });
      
      return result.records[0].get('id');
    } finally {
      await session.close();
    }
  }

  async updateStatus(bookId: string, status: BookContent['status']): Promise<void> {
    const session = await database.getSession();
    try {
      await session.run(`
        MATCH (b:Book {id: $bookId})
        SET b.status = $status,
            b.processedAt = CASE WHEN $status = 'completed' THEN datetime() ELSE b.processedAt END
      `, { bookId, status });
    } finally {
      await session.close();
    }
  }

  async updateBookPages(bookId: string, totalPages: number): Promise<void> {
    const session = await database.getSession();
    try {
      await session.run(`
        MATCH (b:Book {id: $bookId})
        SET b.totalPages = $totalPages
      `, { bookId, totalPages });
    } finally {
      await session.close();
    }
  }

  async savePage(page: Omit<BookPage, 'id'>): Promise<string> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (b:Book {id: $bookId})
        CREATE (p:Page {
          id: randomUUID(),
          pageNumber: $pageNumber,
          text: $text,
          processedAt: datetime()
        })
        CREATE (b)-[:HAS_PAGE]->(p)
        RETURN p.id as id
      `, page);
      
      return result.records[0].get('id');
    } finally {
      await session.close();
    }
  }

  async saveTaggedContent(content: Omit<TaggedContent, 'id'>): Promise<string> {
    const session = await database.getSession();
    try {
      console.log('Saving tagged content:', content);
      
      // First, verify all required nodes exist
      const verifyResult = await session.run(`
        OPTIONAL MATCH (b:Book {id: $bookId})
        OPTIONAL MATCH (p:Page {id: $pageId})
        OPTIONAL MATCH (t:Tag {id: $tagId})
        RETURN b.id as bookExists, p.id as pageExists, t.id as tagExists
      `, {
        bookId: content.bookId,
        pageId: content.pageId,
        tagId: content.tagId
      });

      const verification = verifyResult.records[0];
      const bookExists = verification.get('bookExists');
      const pageExists = verification.get('pageExists');
      const tagExists = verification.get('tagExists');

      console.log('Node verification:', {
        bookExists: !!bookExists,
        pageExists: !!pageExists,
        tagExists: !!tagExists
      });

      if (!bookExists) {
        throw new Error(`Book with id ${content.bookId} not found`);
      }
      if (!pageExists) {
        throw new Error(`Page with id ${content.pageId} not found`);
      }
      if (!tagExists) {
        console.warn(`Tag with id ${content.tagId} not found, skipping content`);
        return;
      }

      const result = await session.run(`
        MATCH (b:Book {id: $bookId})
        MATCH (p:Page {id: $pageId})
        MATCH (t:Tag {id: $tagId})
        CREATE (c:Content {
          id: randomUUID(),
          content: $contentText,
          pageNumber: $pageNumber,
          relevance: $relevance,
          context: $context,
          originalText: $originalText,
          createdAt: datetime()
        })
        CREATE (p)-[:HAS_CONTENT]->(c)
        CREATE (c)-[:TAGGED_AS]->(t)
        RETURN c.id as id
      `, {
        bookId: content.bookId,
        pageId: content.pageId,
        tagId: content.tagId,
        contentText: content.content,
        pageNumber: content.pageNumber,
        relevance: content.relevance,
        context: content.context,
        originalText: content.originalText
      });
      
      if (result.records.length === 0) {
        console.error('No records returned from saveTaggedContent query');
        console.error('Query parameters:', {
          bookId: content.bookId,
          pageId: content.pageId,
          tagId: content.tagId
        });
        throw new Error('Failed to create tagged content - no records returned');
      }
      
      return result.records[0].get('id');
    } catch (error) {
      console.error('Error in saveTaggedContent:', error);
      console.error('Content data:', content);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getBookById(bookId: string): Promise<BookContent | null> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (b:Book {id: $bookId})
        RETURN b
      `, { bookId });
      
      if (result.records.length === 0) return null;
      
      const book = result.records[0].get('b').properties;
      return {
        ...book,
        uploadedAt: new Date(book.uploadedAt),
        processedAt: book.processedAt ? new Date(book.processedAt) : undefined
      };
    } finally {
      await session.close();
    }
  }

  async getAllBooks(): Promise<BookContent[]> {
    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (b:Book)
        RETURN b
        ORDER BY b.uploadedAt DESC
      `);
      
      return result.records.map(record => {
        const book = record.get('b').properties;
        return {
          ...book,
          uploadedAt: new Date(book.uploadedAt),
          processedAt: book.processedAt ? new Date(book.processedAt) : undefined
        };
      });
    } finally {
      await session.close();
    }
  }

  async deleteBook(bookId: string): Promise<void> {
    const session = await database.getSession();
    try {
      await session.run(`
        MATCH (b:Book {id: $bookId})
        OPTIONAL MATCH (b)-[:HAS_PAGE]->(p:Page)
        OPTIONAL MATCH (p)-[:HAS_CONTENT]->(c:Content)
        OPTIONAL MATCH (c)-[:TAGGED_AS]->(t:Tag)
        DETACH DELETE b, p, c
      `, { bookId });
    } finally {
      await session.close();
    }
  }

  async updateBook(bookId: string, updates: { title?: string; author?: string }): Promise<void> {
    const session = await database.getSession();
    try {
      const setClause = Object.entries(updates)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => `b.${key} = $${key}`)
        .join(', ');
      
      if (setClause) {
        await session.run(`
          MATCH (b:Book {id: $bookId})
          SET ${setClause}
        `, { bookId, ...updates });
      }
    } finally {
      await session.close();
    }
  }
}
