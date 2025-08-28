import { Node, Property, BaseEntity, Relationship } from 'neogm';
import { Book } from '../../entities/book.entity';

@Node('Page')
export class Page extends BaseEntity {
  @Property({ required: true, unique: true })
  id!: string;

  @Property({ required: true })
  pageNumber!: number;

  @Property({ required: true, type: 'string' })
  text!: string;

  @Property({ required: true })
  bookId!: string;

  @Property({ required: true })
  createdAt: string = new Date().toISOString();

  @Relationship('BELONGS_TO', () => Book, { direction: 'out' })
  book!: Book;
}
