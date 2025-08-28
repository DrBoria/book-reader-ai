import { Injectable } from '@nestjs/common';
import { Repository } from 'neogm';
import { Neo4jService } from '../../database/neo4j.service';
import { Page } from './entities/page.entity';

@Injectable()
export class PagesService {
  private readonly pageRepository: Repository<Page>;

  constructor(private readonly neo4jService: Neo4jService) {
    const neogm = this.neo4jService.getNeoGM();
    this.pageRepository = neogm.getRepository(Page);
  }

  async createPage(
    bookId: string,
    pageNumber: number,
    text: string,
  ): Promise<Page> {
    const page = new Page();
    page.id = `page_${bookId}_${pageNumber}`;
    page.bookId = bookId;
    page.pageNumber = pageNumber;
    page.text = text;

    return await this.pageRepository.save(page);
  }

  async createPages(
    bookId: string,
    pages: Array<{ pageNumber: number; text: string }>,
  ): Promise<Page[]> {
    const createdPages: Page[] = [];

    for (const page of pages) {
      const createdPage = await this.createPage(
        bookId,
        page.pageNumber,
        page.text,
      );
      createdPages.push(createdPage);
    }

    return createdPages;
  }

  async findById(id: string): Promise<Page | null> {
    return await this.pageRepository.findOne({ where: { id } });
  }

  async countPages(bookId: string): Promise<number> {
    const pages = await this.pageRepository.find({ where: { bookId } });
    return pages.length;
  }
}
