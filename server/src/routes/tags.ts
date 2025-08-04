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

// Bulk delete tags
router.delete('/', async (req, res) => {
  try {
    const { tagIds } = req.body;
    
    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ error: 'Tag IDs array is required' });
    }

    const deletedCount = await tagRepo.bulkDeleteTags(tagIds);
    res.json({ 
      message: `${deletedCount} tags deleted successfully`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error bulk deleting tags:', error);
    res.status(500).json({ error: 'Failed to delete tags' });
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

// Update category keywords
router.put('/categories/:categoryId/keywords', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { keywords } = req.body;
    
    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords must be an array' });
    }

    const updatedCategory = await tagRepo.updateCategoryKeywords(categoryId, keywords);
    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category keywords:', error);
    res.status(500).json({ error: 'Failed to update keywords' });
  }
});

// Cleanup duplicate tags
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    console.log('Starting cleanup of duplicate tags...');
    const result = await tagRepo.cleanupDuplicateTags();
    
    console.log(`Cleanup completed: ${result.mergedGroups} groups merged, ${result.totalMerged} tags removed`);
    res.json({
      success: true,
      mergedGroups: result.mergedGroups,
      totalMerged: result.totalMerged,
      message: `Successfully merged ${result.mergedGroups} duplicate tag groups, removing ${result.totalMerged} duplicate tags`
    });
  } catch (error) {
    console.error('Error cleaning up duplicate tags:', error);
    res.status(500).json({ error: 'Failed to cleanup duplicate tags' });
  }
});

export default router;
