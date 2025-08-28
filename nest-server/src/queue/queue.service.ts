import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProcessingJob } from '../types';

export interface BookProcessingJobData {
  bookId: string;
  filePath: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('book-processing')
    private readonly bookProcessingQueue: Queue<BookProcessingJobData>,
  ) {}

  async addBookProcessingJob(data: BookProcessingJobData) {
    return this.bookProcessingQueue.add('process-book', data, {
      priority: 10,
      delay: 0,
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    const job = await this.bookProcessingQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id!.toString(),
      bookId: job.data.bookId,
      status: this.mapBullStatusToJobStatus(state),
      progress: Number(job.progress || 0),
      totalPages: 0,
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      error: job.failedReason || undefined,
    };
  }

  private mapBullStatusToJobStatus(state: string): ProcessingJob['status'] {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'pending';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  getQueue() {
    return this.bookProcessingQueue;
  }
}
