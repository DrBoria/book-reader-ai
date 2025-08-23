import { Node, Property, BaseEntity } from 'neogm';

@Node('Book')
export class Book extends BaseEntity {
  @Property({ required: true, unique: true })
  id!: string;

  @Property({
    required: true,
    validator: (title: string) =>
      typeof title === 'string' && title.length > 0 && title.length <= 500,
  })
  title!: string;

  @Property({
    required: false,
    validator: (author?: string) =>
      author === undefined ||
      (typeof author === 'string' && author.length > 0 && author.length <= 200),
  })
  author?: string;

  @Property({
    required: true,
    validator: (filename: string) => typeof filename === 'string' && filename.length > 0 && filename.includes('.'),
  })
  filename!: string;

  @Property({
    required: true,
    validator: (totalPages: number) =>
      Number.isInteger(totalPages) && totalPages > 0,
  })
  totalPages!: number;

  @Property({
    required: true,
    validator: (uploadedAt: Date) =>
      uploadedAt instanceof Date && uploadedAt <= new Date(),
  })
  uploadedAt!: Date;

  @Property({
    required: false,
    validator: (processedAt?: Date) =>
      processedAt === undefined ||
      (processedAt instanceof Date && processedAt <= new Date()),
  })
  processedAt?: Date;

  @Property({
    required: true,
    validator: (status: string) =>
      ['uploading', 'processing', 'completed', 'error'].includes(status),
  })
  status!: 'uploading' | 'processing' | 'completed' | 'error';
}
