import { Node, Property, BaseEntity, Relationship } from 'neogm';
import { Page } from '../../books/pages/entities/page.entity';
import { Tag } from './tag.entity';

@Node('TaggedContent')
export class TaggedContent extends BaseEntity {
  @Property({ required: true, unique: true })
  id!: string;

  @Property({ required: true })
  pageId!: string;

  @Property({ required: true })
  tagId!: string;

  @Property({ required: true })
  bookId!: string;

  @Property({ required: false })
  text?: string;

  @Property({ required: false })
  startIndex?: number;

  @Property({ required: false })
  endIndex?: number;

  @Property({ required: false })
  confidence?: number;

  @Property({ required: true })
  createdAt: string = new Date().toISOString();

  @Relationship('TAGGED_ON', () => Page, { direction: 'out' })
  page!: Page;

  @Relationship('HAS_TAG', () => Tag, { direction: 'out' })
  tag!: Tag;
}
