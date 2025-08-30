import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Controller('tags')
export class TagsController {
    constructor(private readonly tagService: TagsService) { }

    @Get()
    async getAll() {
        const all = await this.tagService.findAll()
        return all;
    }

    @Post()
    @UsePipes(new ValidationPipe())
    async create(@Body() createTagDto: CreateTagDto) {
        return this.tagService.create(createTagDto);
    }
}
