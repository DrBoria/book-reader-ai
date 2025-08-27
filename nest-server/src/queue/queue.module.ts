import { Module, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {
  static registerQueue(queueName: string, options?: any): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        BullModule.registerQueue({
          name: queueName,
          ...options,
        }),
      ],
    };
  }
}
