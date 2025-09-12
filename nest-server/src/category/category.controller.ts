import { Body, Controller, Delete, Get, Param, Post, Patch, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
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

    @Patch(':id')
    @UsePipes(new ValidationPipe())
    update(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto
    ) {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}
