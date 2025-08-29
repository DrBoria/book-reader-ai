import { Injectable } from '@nestjs/common';
import { Repository } from 'neogm';
import { Tag } from './entities/tag.entity';
import { Neo4jService } from '../database/neo4j.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  private readonly tagRepository: Repository<Tag>;

  constructor(private readonly neo4jService: Neo4jService) {
    const neogm = this.neo4jService.getNeoGM();
    this.tagRepository = neogm.getRepository(Tag);
  }

  async create(data: CreateTagDto): Promise<Tag> {
    const tag = new Tag();
    tag.id = `tag_${data.bookId}_${data.name}_${Date.now()}`;
    tag.name = data.name;
    tag.value = data.value;
    tag.bookId = data.bookId;
    tag.categoryId = data.categoryId;
    tag.type = data.type || 'dynamic';
    tag.confidence = data.confidence;
    tag.contentCount = 0;

    const neoGM = this.neo4jService.getNeoGM();
    return await neoGM.getRepository(Tag).save(tag);
  }

  async findAll(): Promise<Tag[]> {
    return await this.tagRepository.find();
  }

  async findByCategory(categoryId: string): Promise<Tag[]> {
    return await this.tagRepository.find({ where: { categoryId } });
  }

  async findByNameAndBook(name: string, bookId: string): Promise<Tag | null> {
    return await this.tagRepository.findOne({ where: { name, bookId } });
  }

  async incrementContentCount(tagId: string): Promise<void> {
    const tag = await this.tagRepository.findOne({ where: { id: tagId } });
    if (tag) {
      tag.contentCount = (tag.contentCount || 0) + 1;
      await this.tagRepository.save(tag);
    }
  }

  async getOrCreateTag(data: CreateTagDto): Promise<Tag> {
    let tag = await this.findByNameAndBook(data.name, data.bookId);

    if (!tag) {
      tag = await this.create(data);
    }

    return tag;
  }
}
