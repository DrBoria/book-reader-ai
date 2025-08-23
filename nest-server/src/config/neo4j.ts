import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from '.';

export class Neo4jDatabase {
  private driver: Driver;

  constructor() {
    this.driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
    );
  }

  getSession(): Session {
    return this.driver.session();
  }

  async testConnection(): Promise<boolean> {
    const session = this.getSession();
    try {
      await session.run('RETURN 1');
      return true;
    } catch (error) {
      console.error('Neo4j connection failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  // Initialize database schema
  async initializeSchema(): Promise<void> {
    const session = this.getSession();
    try {
      // Create constraints and indexes
      await session.run(`
        CREATE CONSTRAINT book_id IF NOT EXISTS 
        FOR (b:Book) REQUIRE b.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT tag_id IF NOT EXISTS 
        FOR (t:Tag) REQUIRE t.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT page_id IF NOT EXISTS 
        FOR (p:Page) REQUIRE p.id IS UNIQUE
      `);

      await session.run(`
        CREATE INDEX content_text IF NOT EXISTS 
        FOR (c:Content) ON (c.text)
      `);
    } finally {
      await session.close();
    }
  }
}

export const database = new Neo4jDatabase();
