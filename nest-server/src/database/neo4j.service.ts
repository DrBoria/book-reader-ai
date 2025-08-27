import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NeoGM } from 'neogm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private neoGM: NeoGM;

  constructor(private configService: ConfigService) {
    this.neoGM = new NeoGM({
      uri: this.configService.get<string>('NEO4J_URI', 'bolt://localhost:7687'),
      user: this.configService.get<string>('NEO4J_USER', 'neo4j'),
      password: this.configService.get<string>('NEO4J_PASSWORD', 'password'),
    });
  }

  async onModuleInit() {
    await this.neoGM.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.neoGM.disconnect();
  }

  getNeoGM(): NeoGM {
    return this.neoGM;
  }
}
