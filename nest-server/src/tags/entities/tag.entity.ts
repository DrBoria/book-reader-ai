import { Node, Property, BaseEntity, Relationship } from 'neogm';
import { Category } from '../../category/category.entity';
import { Book } from '../../books/entities/book.entity';

@Node('Tag')
export class Tag extends BaseEntity {
  @Property({ required: true, unique: true })
  id!: string;

  @Property({ required: true })
  name!: string;

  @Property({ required: false })
  value?: string;

  @Property({ required: true })
  bookId!: string;

  @Property({ required: true })
  categoryId!: string;

  @Property({ required: false })
  type: string = 'dynamic';

  @Property({ type: 'number', required: false })
  confidence?: number;

  @Property({ type: 'number', required: false })
  contentCount: number = 0;

  @Property({ required: true })
  createdAt: string = new Date().toISOString();

  @Property({ required: true })
  updatedAt: string = new Date().toISOString();

  @Relationship('BELONGS_TO', () => Category, { direction: 'out' })
  category!: Category;

  @Relationship('BELONGS_TO', () => Book, { direction: 'out' })
  book!: Book;
}
