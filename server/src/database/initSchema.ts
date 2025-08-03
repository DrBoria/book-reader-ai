import { database } from './neo4j';

export async function initializeSchema() {
  const session = await database.getSession();
  
  try {
    console.log('🏗️  Initializing database schema...');
    
    // Create indexes for better performance
    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (b:Book) ON (b.id)
    `);
    
    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (p:Page) ON (p.id)
    `);
    
    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (c:Content) ON (c.id)
    `);
    
    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (t:Tag) ON (t.id)
    `);
    
    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (tc:TagCategory) ON (tc.id)
    `);

    console.log('🏷️  Initializing default categories...');
    
    // Create default tag categories
    const defaultCategories = [
      {
        id: 'time',
        name: 'Время',
        description: 'Временные периоды, даты, эпохи',
        color: '#3B82F6',
        type: 'default'
      },
      {
        id: 'people', 
        name: 'Люди',
        description: 'Персоны, авторы, исторические личности',
        color: '#EF4444',
        type: 'default'
      },
      {
        id: 'location',
        name: 'Локации',
        description: 'Места, города, страны, регионы',
        color: '#F59E0B',
        type: 'default'
      }
    ];

    for (const category of defaultCategories) {
      await session.run(`
        MERGE (c:TagCategory {id: $id})
        ON CREATE SET 
          c.name = $name,
          c.description = $description, 
          c.color = $color,
          c.type = $type,
          c.createdAt = datetime()
        ON MATCH SET
          c.updatedAt = datetime()
      `, category);
    }

    console.log('✅ Database schema initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    throw error;
  } finally {
    await session.close();
  }
}
