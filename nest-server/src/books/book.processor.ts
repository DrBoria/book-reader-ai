import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookProcessingJobData } from '../queue/queue.service';
import { BooksService } from './books.service';
import { BookStatus } from './entities/book.entity';
import { PDFParsingService } from '../utils/pdf-parsing.service';
import { AITaggingService } from '../tags/ai-tagging.service';
import { PagesService } from './pages/pages.service';
import { TagsService } from '../tags/tags.service';
import { CategoriesService } from '../category/categories.service';
import { TaggedContentService } from '../tags/tagged-content.service';
import { WebSocketService } from '../websocket/websocket.service';

@Processor('book-processing')
export class BookProcessor extends WorkerHost {
  constructor(
    private readonly booksService: BooksService,
    private readonly pdfParsingService: PDFParsingService,
    private readonly aiTaggingService: AITaggingService,
    private readonly pagesService: PagesService,
    private readonly tagsService: TagsService,
    private readonly categoriesService: CategoriesService,
    private readonly taggedContentService: TaggedContentService,
    private readonly webSocketService: WebSocketService,
  ) {
    super();
  }

  async process(job: Job<BookProcessingJobData, any, string>): Promise<any> {
    if (job.name === 'process-book') {
      const { bookId, filePath } = job.data;

      console.log(`Starting processing for book ${bookId}`);
      console.log(`Processing file: ${filePath}`);

      try {
        // Verify book exists before processing
        const book = await this.booksService.findOne(bookId);
        if (!book) {
          throw new Error(`Book with id ${bookId} does not exist`);
        }

        // Update book status to processing
        await this.booksService.update(bookId, {
          status: BookStatus.PROCESSING,
        });

        // Parse PDF to get pages
        const pages = await this.pdfParsingService.extractPages(filePath);
        const totalPages = pages.length;

        // Update book with total pages
        await this.booksService.update(bookId, {
          totalPages,
        });

        // Get available categories for processing
        const availableCategories = await this.categoriesService.findAll();

        // Process pages incrementally
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const progress = Math.round(((i + 1) / totalPages) * 100);

          // Update job progress
          await job.updateProgress(progress);

          // Save page to database using PagesService
          const pageEntity = await this.pagesService.createPage(
            bookId,
            page.pageNumber,
            page.text,
          );
          const pageId = pageEntity.id;

          // Extract entities and create dynamic tags using AI
          const taggingInput = {
            text: page.text,
            bookId,
            pageNumber: page.pageNumber,
            categories: availableCategories,
          };

          const result =
            await this.aiTaggingService.tagPageContent(taggingInput);

          console.log(
            `Page ${page.pageNumber}: Found ${result.tags.length} entities`,
          );

          // Save new tags to database using TagsService
          const tagIdMapping: Record<string, string> = {};
          for (const tagData of result.tags) {
            const category = taggingInput.categories.find(
              (c) =>
                c.id === (tagData as any).category ||
                c.name === (tagData as any).category,
            );
            if (category) {
              const tagName =
                (tagData as any).name || (tagData as any).value || 'unknown';
              const tagValue = (tagData as any).value;
              const tagConfidence = (tagData as any).confidence;

              const tag = await this.tagsService.create({
                name: tagName,
                value: tagValue,
                categoryId: category.id,
                bookId: job.data.bookId,
                confidence: tagConfidence,
              });
              if (tagValue) {
                tagIdMapping[tagValue] = tag.id;
              }
            }
          }

          // Save tagged content to database using TaggedContentService
          for (const taggedContent of result.taggedContent) {
            try {
              const tagId = tagIdMapping[taggedContent.text || ''];
              if (tagId) {
                await this.taggedContentService.createTaggedContent(
                  pageId,
                  tagId,
                  job.data.bookId,
                  taggedContent.text || '',
                  0,
                  0,
                  taggedContent.confidence || 0.5,
                );
              }
            } catch (error) {
              console.error(
                `Failed to save tagged content for page ${page.pageNumber}:`,
                error,
              );
            }
          }

          // Emit real-time update
          this.webSocketService.emitBookProcessingUpdate(bookId, {
            progress,
            currentPage: page.pageNumber,
            totalPages,
            newContent: result.taggedContent,
          });

          // Small delay to prevent overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Mark book as completed
        await this.booksService.update(bookId, {
          status: BookStatus.COMPLETED,
          processedAt: new Date().toISOString(),
        });

        this.webSocketService.emitBookProcessingComplete(bookId);

        console.log(`Completed processing for book ${bookId}`);

        return {
          bookId,
          processed: true,
          totalPages,
        };
      } catch (error) {
        console.error('Book processing failed:', error);

        // Mark book as error
        await this.booksService.update(bookId, {
          status: BookStatus.ERROR,
        });

        this.webSocketService.emitBookProcessingError(
          bookId,
          error instanceof Error ? error.message : 'Unknown error occurred',
        );

        throw error;
      } finally {
        // Cleanup if needed
      }
    }
  }
}
