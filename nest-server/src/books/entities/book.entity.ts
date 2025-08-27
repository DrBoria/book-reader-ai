import { Node, Property, BaseEntity } from 'neogm';

export enum BookStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

@Node('Book')
export class Book extends BaseEntity {
  @Property({ required: true, unique: true })
  id!: string;

  @Property({ required: true })
  title!: string;

  @Property({ required: true })
  author!: string;

  @Property({ required: true })
  filename!: string;

  @Property({ required: false })
  totalPages?: number;

  @Property({ required: true })
  uploadedAt!: string;

  @Property({ required: false })
  processedAt?: string;

  @Property({
    type: 'string',
    required: true
  })
  status: BookStatus = BookStatus.PENDING;

  @Property({ type: 'string', required: false })
  filePath?: string;

  @Property({ type: 'number', required: false })
  size?: number;

  @Property({ required: true })
  createdAt: string = new Date().toISOString();

  @Property({ required: true })
  updatedAt: string = new Date().toISOString();
}
