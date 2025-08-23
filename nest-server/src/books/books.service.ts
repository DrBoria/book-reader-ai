import { Injectable, Inject } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';

interface NeoGMRepository<T> {
  create(data: Partial<T>): T;
  save(entity: T): Promise<T>;
  find(options?: any): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  delete(criteria: any): Promise<void>;
}

interface NeoGMWithRepository {
  getRepository<T>(entityClass: new () => T): NeoGMRepository<T>;
  createEntity<T>(entityClass: new () => T, data: Partial<T>): T;
}

@Injectable()
export class BooksService {
  private readonly bookRepository: NeoGMRepository<Book>;

  constructor(
    @Inject('NEOGM_CONNECTION') private readonly neogm: NeoGMWithRepository,
  ) {
    this.bookRepository = this.neogm.getRepository(Book);
  }

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const book = this.neogm.createEntity(Book, createBookDto);
    return await this.bookRepository.save(book);
  }

  async findAll(): Promise<Book[]> {
    return await this.bookRepository.find({ order: { uploadedAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Book | null> {
    return await this.bookRepository.findById(id);
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book | null> {
    const book = await this.bookRepository.findById(id);
    if (!book) return null;

    Object.assign(book, updateBookDto);
    return await this.bookRepository.save(book);
  }

  async remove(id: string): Promise<void> {
    await this.bookRepository.delete({ id });
  }
}
