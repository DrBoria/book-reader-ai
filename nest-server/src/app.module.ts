import { Module, Global, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NeoGM } from 'neogm';
import { BooksModule } from './books/books.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BooksModule,
  ],
  controllers: [],
  providers: [
    {
      provide: 'NEOGM_CONNECTION',
      useFactory: (configService: ConfigService) => {
        const neogm = new NeoGM({
          uri: configService.get<string>('NEO4J_URI', 'bolt://localhost:7687'),
          user: configService.get<string>('NEO4J_USER', 'neo4j'),
          password: configService.get<string>('NEO4J_PASSWORD', 'password'),
        });
        return neogm;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['NEOGM_CONNECTION'],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject('NEOGM_CONNECTION') private readonly neogm: NeoGM) {}

  async onModuleInit() {
    await this.neogm.connect();
  }
}
