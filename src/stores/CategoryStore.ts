import { types, Instance, flow } from 'mobx-state-tree';
import { categoriesService } from '../services/api';

export const Category = types.model('Category', {
  id: types.string,
  name: types.string,
  description: types.string,
  color: types.string,
  dataType: types.optional(types.union(types.literal('text'), types.literal('number'), types.literal('date')), 'text'),
  keywords: types.array(types.string),
  type: types.optional(types.union(types.literal('default'), types.literal('custom')), 'default'),
  tags: types.optional(types.array(types.string), []),
  createdAt: types.Date,
  updatedAt: types.Date,
});

export const CategoryStore = types
  .model('CategoryStore', {
    categories: types.array(Category),
    isLoading: types.boolean,
  })
  .actions((self) => ({
    setCategories(categories: any[]) {
      self.categories.replace(categories);
    },
    setLoading(loading: boolean) {
      self.isLoading = loading;
    },
    addCategory(category: any) {
      self.categories.push(category);
    },
    deleteCategory(id: string) {
      const index = self.categories.findIndex(c => c.id === id);
      if (index !== -1) {
        self.categories.splice(index, 1);
      }
    },
    
    loadCategories: flow(function* () {
      self.setLoading(true);
      try {
        const categories = yield categoriesService.getCategories();
        self.setCategories(categories);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        self.setLoading(false);
      }
    }),
    
    createCategory: flow(function* (category: any) {
      try {
        const newCategory = yield categoriesService.createCategory(category);
        self.addCategory(newCategory);
        return newCategory;
      } catch (error) {
        console.error('Failed to create category:', error);
        throw error;
      }
    }),
    
    removeCategory: flow(function* (id: string) {
      try {
        yield categoriesService.deleteCategory(id);
        self.deleteCategory(id);
      } catch (error) {
        console.error('Failed to delete category:', error);
        throw error;
      }
    }),
  }));

export type CategoryStoreType = Instance<typeof CategoryStore>;