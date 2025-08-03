import Bull from 'bull';
import { config } from '../config';
import { ProcessingJob } from '../types';

export interface BookProcessingJobData {
  bookId: string;
  filePath: string;
  tags: string[];
}

export class QueueService {
  private bookProcessingQueue: Bull.Queue<BookProcessingJobData>;

  constructor() {
    this.bookProcessingQueue = new Bull('book-processing', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: 'exponential'
      }
    });

    this.setupJobProcessors();
  }

  private setupJobProcessors(): void {
    // We'll implement the actual processor in the BookProcessingService
    this.bookProcessingQueue.process('process-book', 1, 
      require('./bookProcessing').processBookJob
    );
  }

  async addBookProcessingJob(data: BookProcessingJobData): Promise<Bull.Job<BookProcessingJobData>> {
    return this.bookProcessingQueue.add('process-book', data, {
      priority: 10,
      delay: 0
    });
  }

  async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    const job = await this.bookProcessingQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id!.toString(),
      bookId: job.data.bookId,
      status: this.mapBullStatusToJobStatus(await job.getState()),
      progress: job.progress() as number,
      totalPages: 0, // Will be updated during processing
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      error: job.failedReason
    };
  }

  private mapBullStatusToJobStatus(bullStatus: string): ProcessingJob['status'] {
    switch (bullStatus) {
      case 'waiting': return 'pending';
      case 'active': return 'processing';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'pending';
    }
  }

  async getQueue() {
    return this.bookProcessingQueue;
  }
}

export const queueService = new QueueService();
