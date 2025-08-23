import { Injectable, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from '../config';

interface QueryResult {
  [key: string]: any;
}

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  private driver: Driver;

  constructor() {
    this.driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
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

  async onModuleDestroy(): Promise<void> {
    await this.driver.close();
  }

  async runQuery(
    query: string,
    parameters?: Record<string, any>,
  ): Promise<QueryResult[]> {
    const session = this.getSession();
    try {
      const result = await session.run(query, parameters || {});
      return result.records.map((record) => {
        const keys = record.keys;
        const obj: QueryResult = {};
        keys.forEach((key) => {
          const value = record.get(key);
          obj[key as string] = value;
        });
        return obj;
      });
    } finally {
      await session.close();
    }
  }
}