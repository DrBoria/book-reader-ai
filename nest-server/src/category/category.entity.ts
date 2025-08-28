import { Node, Property, BaseEntity } from 'neogm';

@Node('Category')
export class Category extends BaseEntity {
  @Property({ required: true, unique: true })
  id!: string;

  @Property({ required: true })
  name!: string;

  @Property({ required: false })
  description?: string;

  @Property({ required: false })
  color?: string;

  @Property({ required: false })
  dataType?: string;

  @Property({ type: 'string', required: false })
  keywords?: string[];

  @Property({ required: true })
  type: string = 'custom';

  @Property({ required: true })
  createdAt: string = new Date().toISOString();

  @Property({ required: true })
  updatedAt: string = new Date().toISOString();
}
