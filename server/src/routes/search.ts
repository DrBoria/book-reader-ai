import { Router } from 'express';
import { SearchService } from '../services/searchService';
import { z } from 'zod';

const router = Router();
const searchService = new SearchService();

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1),
  bookIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().transform(val => val ? Math.floor(val) : undefined),
  offset: z.number().min(0).optional().transform(val => val ? Math.floor(val) : undefined)
});

const chatSchema = z.object({
  question: z.string().min(1),
  bookIds: z.array(z.string()).optional(),
  tagId: z.string().optional(),
  sessionId: z.string().optional()
});

// Search content
router.post('/content', async (req, res) => {
  try {
    const validation = searchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid search parameters', 
        details: validation.error.issues 
      });
    }

    const results = await searchService.searchContent(validation.data);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Chat endpoint - answer questions based on book content
router.post('/chat', async (req, res) => {
  try {
    const validation = chatSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid chat parameters', 
        details: validation.error.issues 
      });
    }

    const { question, bookIds, tagId } = validation.data;
    const result = await searchService.answerQuestion(question, bookIds, tagId);
    
    res.json({
      question,
      answer: result.answer,
      references: result.references,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

export default router;
