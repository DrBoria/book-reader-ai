import { Router } from 'express';
import { TagRepository } from '../repositories/tagRepository';
import { SearchService } from '../services/searchService';
import { z } from 'zod';

const router = Router();
const tagRepo = new TagRepository();
const searchService = new SearchService();

// Validation schemas
const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  color: z.string().regex(/^#[0-9A-F]{6}$/i)
});

// Get all categories and tags
router.get('/', async (req, res) => {
  try {
    const [categories, tags] = await Promise.all([
      tagRepo.getAllCategories(),
      tagRepo.getAllTags()
    ]);

    // Group tags by categories
    const categoriesWithTags = categories.map(category => ({
      ...category,
      tags: tags.filter(tag => tag.categoryId === category.id)
    }));

    res.json({ 
      categories: categoriesWithTags, 
      tags 
    });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await tagRepo.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get tags by book
router.get('/book/:bookId', async (req, res) => {
  try {
    const tags = await tagRepo.getTagsByBookId(req.params.bookId);
    res.json(tags);
  } catch (error) {
    console.error('Failed to fetch tags for book:', error);
    res.status(500).json({ error: 'Failed to fetch tags for book' });
  }
});

// Create custom tag
router.post('/', async (req, res) => {
  try {
    const validation = createTagSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validation.error.issues 
      });
    }

    const tag = await tagRepo.createTag({
      ...validation.data,
      type: 'custom'
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Get content by tag
router.get('/:tagId/content', async (req, res) => {
  try {
    const { tagId } = req.params;
    const { bookId } = req.query;

    const content = await searchService.getContentByTag(
      tagId, 
      bookId as string
    );
    
    res.json(content);
  } catch (error) {
    console.error('Error fetching tagged content:', error);
    res.status(500).json({ error: 'Failed to fetch tagged content' });
  }
});

// Delete custom tag
router.delete('/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    await tagRepo.deleteTag(tagId);
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await tagRepo.createCategory({
      name,
      description: description || '',
      color: color || '#6B7280'
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;
