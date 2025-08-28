import { Injectable } from '@nestjs/common';
import { Repository } from 'neogm';
import { TaggedContent } from './entities/tagged-content.entity';
import { Neo4jService } from '../database/neo4j.service';

@Injectable()
export class TaggedContentService {
  private readonly taggedContentRepository: Repository<TaggedContent>;

  constructor(private readonly neo4jService: Neo4jService) {
    const neogm = this.neo4jService.getNeoGM();
    this.taggedContentRepository = neogm.getRepository(TaggedContent);
  }

  async createTaggedContent(
    pageId: string,
    tagId: string,
    bookId: string,
    text: string,
    startIndex: number,
    endIndex: number,
    confidence: number,
  ): Promise<TaggedContent> {
    const taggedContent = new TaggedContent();
    taggedContent.id = `tagged_${bookId}_${pageId}_${tagId}_${Date.now()}`;
    taggedContent.pageId = pageId;
    taggedContent.tagId = tagId;
    taggedContent.bookId = bookId;
    taggedContent.text = text;
    taggedContent.startIndex = startIndex;
    taggedContent.endIndex = endIndex;
    taggedContent.confidence = confidence;

    const neoGM = this.neo4jService.getNeoGM();
    return await neoGM.getRepository(TaggedContent).save(taggedContent);
  }

  async findByBookId(bookId: string): Promise<TaggedContent[]> {
    return await this.taggedContentRepository.find({ where: { bookId } });
  }

  async findByPageId(pageId: string): Promise<TaggedContent[]> {
    return await this.taggedContentRepository.find({ where: { pageId } });
  }

  async findByTagId(tagId: string): Promise<TaggedContent[]> {
    return await this.taggedContentRepository.find({ where: { tagId } });
  }

  async deleteByBookId(bookId: string): Promise<void> {
    const items = await this.taggedContentRepository.find({
      where: { bookId },
    });
    for (const item of items) {
      await this.taggedContentRepository.delete(item);
    }
  }

  async deleteByPageId(pageId: string): Promise<void> {
    const items = await this.taggedContentRepository.find({
      where: { pageId },
    });
    for (const item of items) {
      await this.taggedContentRepository.delete(item);
    }
  }

  async countByBookId(bookId: string): Promise<number> {
    const items = await this.taggedContentRepository.find({
      where: { bookId },
    });
    return items.length;
  }

  async countByTagId(tagId: string): Promise<number> {
    const items = await this.taggedContentRepository.find({ where: { tagId } });
    return items.length;
  }
}
