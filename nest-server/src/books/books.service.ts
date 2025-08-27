import { Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Neo4jService } from '../database/neo4j.service';
import { Book, BookStatus } from './entities/book.entity';
import { QueueService } from '../queue/queue.service';

import { Repository } from 'neogm';
import * as crypto from 'crypto';

@Injectable()
export class BooksService {
  private readonly bookRepository: Repository<Book>;

  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly queueService: QueueService
  ) {
    const neogm = this.neo4jService.getNeoGM();
    this.bookRepository = neogm.getRepository(Book);
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

  async processBook(
    bookId: string,
    filePath: string,
    tags: string[] = []
  ): Promise<void> {
    await this.queueService.addBookProcessingJob({
      bookId,
      filePath,
      tags,
    });
  }

  async findAll(): Promise<Book[]> {
    const allBooks = await this.bookRepository.find({ orderBy: 'uploadedAt DESC' });
    return allBooks;
  }

  async findOne(id: string): Promise<Book | null> {
    return await this.bookRepository.findOne({ id });
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book | null> {
    const book = await this.bookRepository.findOne({ id });
    if (!book) return null;

    Object.assign(book, updateBookDto);
    return this.bookRepository.save(book);
  }

  async remove(id: string): Promise<Book | null> {
    const book = await this.findOne(id);
    if (!book) return null;

    await this.bookRepository.delete(book);
    return book;
  }
}
