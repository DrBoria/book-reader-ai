import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Neo4jService } from './database/neo4j.service';
import { BooksModule } from './books/books.module';
import { CategoriesService } from './category/categories.service';
import { CategoryModule } from './category/category.module';
import { TagsModule } from './tags/tags.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BooksModule,
    CategoryModule,
    TagsModule,
  ],
  controllers: [],
  providers: [Neo4jService],
  exports: [Neo4jService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly categoriesService: CategoriesService,
  ) { }
  async onModuleInit() {
    await this.neo4jService.onModuleInit();
    await this.categoriesService.ensureCategoriesExist();
  }
}
