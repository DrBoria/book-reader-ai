import { Job } from 'bull';
import { BookProcessingJobData } from './queue';
import { BookRepository } from '../repositories/bookRepository';
import { TagRepository } from '../repositories/tagRepository';
import { AITaggingService } from './aiTagging';
import { PDFParsingService } from './pdfParsing';
import { WebSocketService } from './websocket';

export async function processBookJob(job: Job<BookProcessingJobData>) {
  const { bookId, filePath, tags } = job.data;
  
  const bookRepo = new BookRepository();
  const tagRepo = new TagRepository();
  const pdfService = new PDFParsingService();
  const aiService = new AITaggingService();
  const wsService = WebSocketService.getInstance();

  try {
    // Update book status
    await bookRepo.updateStatus(bookId, 'processing');
    
    // Parse PDF to get pages
    const pages = await pdfService.extractPages(filePath);
    const totalPages = pages.length;
    
    await bookRepo.updateBookPages(bookId, totalPages);
    
    // Get categories for processing
    const availableCategories = await tagRepo.getAllCategories();
    
    // Process pages incrementally
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const progress = Math.round(((i + 1) / totalPages) * 100);
      
      // Update job progress
      job.progress(progress);
      
      // Save page to database
      const pageId = await bookRepo.savePage({
        bookId,
        pageNumber: page.pageNumber,
        text: page.text
      });
      
      // Extract entities and create dynamic tags using AI
      const result = await aiService.tagPageContent(
        page.text, 
        page.pageNumber,
        bookId,
        availableCategories
      );
      
      console.log(`Page ${page.pageNumber}: Found ${result.tags.length} entities, ${result.taggedContent.length} content items`);
      
      // Save new tags to database and create mapping for merged tags
      const tagIdMapping: Record<string, string> = {};
      for (const tag of result.tags) {
        const finalTagId = await tagRepo.createDynamicTag(tag);
        tagIdMapping[tag.id] = finalTagId;
      }
      
      // Save tagged content to graph database with correct tag IDs
      for (const content of result.taggedContent) {
        const finalTagId = tagIdMapping[content.tagId];
        if (!finalTagId) {
          console.warn(`No tag ID mapping found for content tag ${content.tagId}`);
          continue;
        }
        
        await bookRepo.saveTaggedContent({
          ...content,
          tagId: finalTagId,
          bookId,
          pageId
        });
      }
      
      // Emit real-time update
      wsService.emitBookProcessingUpdate(bookId, {
        progress,
        currentPage: page.pageNumber,
        totalPages,
        newContent: result.taggedContent
      });
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Mark book as completed
    await bookRepo.updateStatus(bookId, 'completed');
    
    wsService.emitBookProcessingComplete(bookId);
    
  } catch (error) {
    console.error('Book processing failed:', error);
    await bookRepo.updateStatus(bookId, 'error');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    wsService.emitBookProcessingError(bookId, errorMessage);
    throw error;
  }
}
