import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { TaggedContentService } from './tagged-content.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Controller('tags')
export class TagsController {
  constructor(
    private readonly tagService: TagsService,
    private readonly taggedContentService: TaggedContentService,
  ) {}

  @Get()
  async getAll() {
    const all = await this.tagService.findAll();
    return all;
  }

  @Post()
  @UsePipes(new ValidationPipe())
  async create(@Body() createTagDto: CreateTagDto) {
    return this.tagService.create(createTagDto);
  }

  @Get(':tagId/content')
  async getContentByTag(
    @Param('tagId') tagId: string,
    @Query('bookId') bookId?: string,
  ) {
    if (bookId) {
      return await this.taggedContentService.findByTagIdAndBookId(tagId, bookId);
    }
    return await this.taggedContentService.findByTagId(tagId);
  }

  @Get(':tagId/content/count')
  async getContentCountByTag(
    @Param('tagId') tagId: string,
    @Query('bookId') bookId?: string,
  ) {
    if (bookId) {
      const content = await this.taggedContentService.findByTagIdAndBookId(
        tagId,
        bookId,
      );
      return { count: content.length };
    }
    const content = await this.taggedContentService.findByTagId(tagId);
    return { count: content.length };
  }

  @Delete(':id')
  async deleteTag(@Param('id') id: string) {
    return this.tagService.remove(id);
  }
}
