import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryController } from './category.controller';

@Module({
    providers: [CategoriesService],
    exports: [CategoriesService],
    controllers: [CategoryController],
})
export class CategoryModule { }
