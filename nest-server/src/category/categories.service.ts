import { Injectable } from '@nestjs/common';
import { Repository } from 'neogm';
import { Category } from './category.entity';
import { Neo4jService } from '../database/neo4j.service';

@Injectable()
export class CategoriesService {
  private readonly categoryRepository: Repository<Category>;

  constructor(private readonly neo4jService: Neo4jService) {
    const neogm = this.neo4jService.getNeoGM();
    this.categoryRepository = neogm.getRepository(Category);
  }

  async create(data: {
    name: string;
    description?: string;
    color?: string;
    dataType?: string;
    keywords?: string[];
    type?: string;
  }): Promise<Category> {
    const category = await this.categoryRepository.create({
      id: `category_${data.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: data.name,
      description: data.description,
      color: data.color,
      dataType: data.dataType,
      keywords: data.keywords,
      type: data.type || 'custom',
    });

    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find();
  }

  async findById(id: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({ id });
  }

  async findByName(name: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({ name });
  }

  async update(id: string, updateCategoryDto: any): Promise<Category | null> {
    const category = await this.categoryRepository.findOne({ id });
    if (!category) return null;

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<Category | null> {
    const category = await this.categoryRepository.findOne({ id });
    if (!category) return null;

    await this.categoryRepository.delete(category);
    return category;
  }

  async getDefaultCategories(): Promise<Category[]> {
    const defaultCategories = [
      {
        name: 'Characters',
        description:
          'People, organizations, and entities mentioned in the text',
        color: '#FF6B6B',
        dataType: 'string',
        keywords: [
          'person',
          'character',
          'name',
          'organization',
          'company',
          'group',
        ],
        type: 'system',
      },
      {
        name: 'Locations',
        description: 'Places, cities, countries, and geographical locations',
        color: '#4ECDC4',
        dataType: 'string',
        keywords: [
          'location',
          'city',
          'country',
          'place',
          'address',
          'geography',
        ],
        type: 'system',
      },
      {
        name: 'Events',
        description: 'Important events, actions, or occurrences',
        color: '#45B7D1',
        dataType: 'string',
        keywords: ['event', 'action', 'occurrence', 'incident', 'meeting'],
        type: 'system',
      },
      {
        name: 'Concepts',
        description: 'Abstract concepts, ideas, or themes',
        color: '#96CEB4',
        dataType: 'string',
        keywords: ['concept', 'idea', 'theme', 'topic', 'subject'],
        type: 'system',
      },
      {
        name: 'Time',
        description: 'Dates, times, and temporal information',
        color: '#FFEAA7',
        dataType: 'date',
        keywords: ['date', 'time', 'when', 'temporal', 'period', 'duration'],
        type: 'system',
      },
    ];

    const categories: Category[] = [];

    for (const catData of defaultCategories) {
      let category = await this.findByName(catData.name);
      if (!category) {
        category = await this.create(catData);
      }
      categories.push(category);
    }

    return categories;
  }

  async ensureCategoriesExist(): Promise<Category[]> {
    return await this.getDefaultCategories();
  }
}
