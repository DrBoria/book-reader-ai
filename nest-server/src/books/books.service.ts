import { Injectable } from '@nestjs/common';
import { Repository } from 'neogm';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Neo4jService } from '../database/neo4j.service';
import { Book, BookStatus } from './entities/book.entity';
import { Page } from './pages/entities/page.entity';
import { Tag } from '../tags/entities/tag.entity';
import * as crypto from 'crypto';

@Injectable()
export class BooksService {
  private readonly bookRepository: Repository<Book>;

  constructor(
    private readonly neo4jService: Neo4jService,
  ) {
    this.bookRepository = this.neo4jService.getNeoGM().getRepository(Book);
  }

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const book = await this.bookRepository.create({
      ...createBookDto,
      id: crypto.randomUUID(),
      uploadedAt: createBookDto.uploadedAt || new Date().toISOString(),
      status: createBookDto.status || BookStatus.PENDING,
    });
    return await this.bookRepository.save(book);
  }
  async findAll(): Promise<Book[]> {
    return await this.bookRepository.find();
  }

  async findOne(id: string): Promise<Book | null> {
    return await this.bookRepository.findOne({ id });
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book | null> {
    const book = await this.bookRepository.findOne({ id });
    if (!book) return null;

    Object.assign(book, updateBookDto);
    return await this.bookRepository.save(book);
  }

  async remove(id: string): Promise<Book | null> {
    const book = await this.findOne(id);
    if (!book) return null;

    const neogm = this.neo4jService.getNeoGM();
    await neogm.rawQuery().execute(
      `
          MATCH (book:Book {id: $bookId})
          OPTIONAL MATCH (book)<-[:BELONGS_TO]-(page:Page)
          OPTIONAL MATCH (book)<-[:BELONGS_TO]-(tag:Tag)
          OPTIONAL MATCH (page)<-[:TAGGED_ON]-(taggedContent:TaggedContent)
          OPTIONAL MATCH (tag)<-[:HAS_TAG]-(taggedContent2:TaggedContent)
          DETACH DELETE book, page, tag, taggedContent, taggedContent2
        `, { bookId: book.id });
    return book;
  }

  async getBookPages(bookId: string): Promise<any[]> {
    const neogm = this.neo4jService.getNeoGM();
    const pageRepository = neogm.getRepository(Page);
    return await pageRepository.find({ where: { bookId } });
  }

  async getBookTags(bookId: string): Promise<any[]> {
    const neogm = this.neo4jService.getNeoGM();
    const tagRepository = neogm.getRepository(Tag);
    return await tagRepository.find({ where: { bookId } });
  }

}
