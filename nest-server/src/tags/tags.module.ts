import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TaggedContentService } from './tagged-content.service';

@Module({
  controllers: [TagsController],
  providers: [TagsService, TaggedContentService],
})
export class TagsModule {}
