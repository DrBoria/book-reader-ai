import { database } from './neo4j';

export async function initializeSchema() {
  const session = database.getSession();

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

    // Create default and custom tag categories
    const allCategories = [
      // Default system categories
      {
        id: 'time',
        name: 'Время',
        description: 'Временные периоды, даты, эпохи, столетия, годы, десятилетия',
        color: '#3B82F6',
        type: 'default',
        dataType: 'date',
        keywords: ['when', 'time', 'date', 'year', 'period', 'era', 'century', 'decade', 'temporal', 'когда', 'время', 'дата', 'год', 'период', 'эпоха', 'век', 'столетие']
      },
      {
        id: 'people',
        name: 'Люди',
        description: 'Персоны, авторы, исторические личности, ученые, писатели, исследователи',
        color: '#EF4444',
        type: 'default',
        dataType: 'text',
        keywords: ['who', 'people', 'person', 'name', 'author', 'individual', 'human', 'character', 'scientist', 'researcher', 'writer', 'кто', 'люди', 'человек', 'имя', 'автор', 'личность', 'персона', 'персонаж', 'ученый', 'исследователь', 'писатель']
      },
      {
        id: 'location',
        name: 'Локации',
        description: 'Места, города, страны, регионы, географические объекты, здания, учреждения',
        color: '#F59E0B',
        type: 'default',
        dataType: 'text',
        keywords: ['where', 'place', 'location', 'city', 'country', 'region', 'area', 'geography', 'state', 'province', 'continent', 'ocean', 'river', 'mountain', 'building', 'address', 'university', 'где', 'место', 'локация', 'город', 'страна', 'регион', 'география', 'территория', 'область', 'край', 'улица', 'здание', 'университет']
      },
      // Custom domain-specific categories
      {
        id: 'ideas_from_past',
        name: 'Ideas from the Past',
        description: 'Исторические идеи, концепции, теории, достижения прошлого, научные открытия',
        color: '#8B5CF6',
        type: 'custom',
        dataType: 'text',
        keywords: ['idea', 'concept', 'theory', 'discovery', 'invention', 'innovation', 'breakthrough', 'achievement', 'legacy', 'historical', 'past', 'traditional', 'идея', 'концепция', 'теория', 'открытие', 'изобретение', 'достижение', 'наследие', 'исторический']
      },
      {
        id: 'technology_concepts',
        name: 'Technology & Concepts',
        description: 'Технологические концепции, системы, методы, инструменты, программное и аппаратное обеспечение',
        color: '#10B981',
        type: 'custom',
        dataType: 'text',
        keywords: ['technology', 'system', 'method', 'tool', 'software', 'hardware', 'computer', 'algorithm', 'program', 'machine', 'device', 'техника', 'технология', 'система', 'метод', 'инструмент', 'программа', 'компьютер', 'алгоритм', 'машина', 'устройство']
      },
      {
        id: 'organizations',
        name: 'Organizations',
        description: 'Организации, компании, учреждения, университеты, правительственные структуры',
        color: '#F472B6',
        type: 'custom',
        dataType: 'text',
        keywords: ['organization', 'company', 'corporation', 'institution', 'university', 'government', 'agency', 'department', 'foundation', 'society', 'организация', 'компания', 'учреждение', 'университет', 'правительство', 'агентство', 'департамент', 'фонд', 'общество']
      },
      {
        id: 'events',
        name: 'Events',
        description: 'События, происшествия, конференции, проекты, программы, исторические события',
        color: '#06B6D4',
        type: 'custom',
        dataType: 'text',
        keywords: ['event', 'conference', 'project', 'program', 'initiative', 'meeting', 'summit', 'congress', 'symposium', 'workshop', 'событие', 'конференция', 'проект', 'программа', 'инициатива', 'встреча', 'саммит', 'конгресс', 'симпозиум']
      }
    ];

    for (const category of allCategories) {
      await session.run(`
        MERGE (c:TagCategory {id: $id})
        ON CREATE SET 
          c.name = $name,
          c.description = $description, 
          c.color = $color,
          c.type = $type,
          c.dataType = $dataType,
          c.keywords = $keywords,
          c.createdAt = datetime()
        ON MATCH SET
          c.keywords = $keywords,
          c.dataType = $dataType,
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
