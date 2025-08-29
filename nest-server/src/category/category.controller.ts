import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesService } from './categories.service';

@Controller('category')
export class CategoryController {
    constructor(
        private readonly categoriesService: CategoriesService,
    ){}
    @Get()
    async getCategories() {
        return await this.categoriesService.findAll();
    }

    @Post()
    @UsePipes(new ValidationPipe())
    create(@Body() createCategoryDto: CreateCategoryDto) {
        return this.categoriesService.create(createCategoryDto);
    }
}
