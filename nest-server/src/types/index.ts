export interface ProcessingJob {
  id: string;
  bookId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalPages: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
