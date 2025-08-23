import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../config';
import { database } from '../database/neo4j';
import { BookRepository } from '../repositories/bookRepository';
import { queueService } from '../services/queue';
import { PDFParsingService } from '../services/pdfParsing';

const router: Router = Router();
const bookRepo = new BookRepository();
const pdfService = new PDFParsingService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB instead of 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Get all books
router.get('/', async (req, res) => {
  try {
    const books = await bookRepo.getAllBooks();
    res.json(books);
  } catch (error) {
    console.error('Failed to fetch books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Get specific book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await bookRepo.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    console.error('Failed to fetch book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Delete book by ID
router.delete('/:id', async (req, res) => {
  try {
    await bookRepo.deleteBook(req.params.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Failed to delete book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Update book metadata
router.put('/:id', async (req, res) => {
  try {
    const { title, author } = req.body;
    await bookRepo.updateBook(req.params.id, { title, author });
    res.json({ message: 'Book updated successfully' });
  } catch (error) {
    console.error('Failed to update book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Upload and start processing a book
router.post('/upload', upload.single('book'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { selectedTags } = req.body;
    const tags = selectedTags ? JSON.parse(selectedTags) : [];

    // Get PDF metadata
    const metadata = await pdfService.getMetadata(req.file.path);

    // Create book record
    const bookId = await bookRepo.createBook({
      title: metadata.title || req.file.originalname,
      author: metadata.author || 'Unknown',
      filename: req.file.originalname,
      totalPages: metadata.pageCount,
      uploadedAt: new Date(),
      status: 'uploading'
    });

    // Add to processing queue
    const job = await queueService.addBookProcessingJob({
      bookId,
      filePath: req.file.path,
      tags
    });

    res.json({
      bookId,
      jobId: job.id,
      message: 'Book uploaded and queued for processing'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload book' });
  }
});

// Get all books
router.get('/', async (req, res) => {
  try {
    const books = await bookRepo.getAllBooks();
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Get specific book
router.get('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const book = await bookRepo.getBookById(bookId);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Get job status
router.get('/:bookId/job-status', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    // Find job by book ID (simple approach)
    const queue = await queueService.getQueue();
    const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed']);
    
    const job = jobs.find(j => j.data.bookId === bookId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const status = await queueService.getJobStatus(job.id!.toString());
    res.json(status);
    
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// Get page content by book ID and page number
router.get('/:bookId/pages/:pageNumber', async (req, res) => {
  try {
    const { bookId, pageNumber } = req.params;
    const pageNum = parseInt(pageNumber);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    const session = await database.getSession();
    try {
      const result = await session.run(`
        MATCH (b:Book {id: $bookId})-[:HAS_PAGE]->(p:Page {pageNumber: $pageNumber})
        RETURN p.text as content
      `, { bookId, pageNumber: pageNum });

      if (result.records.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const content = result.records[0].get('content');
      res.json({ content });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error fetching page content:', error);
    res.status(500).json({ error: 'Failed to fetch page content' });
  }
});

export default router;
