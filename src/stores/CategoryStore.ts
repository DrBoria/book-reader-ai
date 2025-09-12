import { types, Instance, flow } from 'mobx-state-tree';
import { categoriesService, Category as ApiCategory } from '../services/api';

const mapApiCategoryToMstCategory = (apiCategory: ApiCategory): any => ({
  id: apiCategory.id,
  name: apiCategory.name,
  description: apiCategory.description || '',
  color: apiCategory.color || '',
  dataType: apiCategory.dataType === 'string' ? 'text' : (apiCategory.dataType || 'text'),
  keywords: apiCategory.keywords || [],
  type: apiCategory.type || 'default',
  tags: apiCategory.tags || [],
  createdAt: new Date(apiCategory.createdAt),
  updatedAt: new Date(apiCategory.updatedAt),
});

export const Category = types.model('Category', {
  id: types.string,
  name: types.string,
  description: types.string,
  color: types.string,
  dataType: types.optional(types.union(types.literal('text'), types.literal('number'), types.literal('date'), types.literal('string')), 'text'),
  keywords: types.array(types.string),
  type: types.optional(types.union(types.literal('default'), types.literal('custom'), types.literal('system')), 'default'),
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
    setCategories(categories: Instance<typeof Category>[]) {
      self.categories.replace(categories);
    },
    setLoading(loading: boolean) {
      self.isLoading = loading;
    },
    addCategory(category: Instance<typeof Category>) {
      self.categories.push(category);
    },
    deleteCategory(id: string) {
      const index = self.categories.findIndex(c => c.id === id);
      if (index !== -1) {
        self.categories.splice(index, 1);
      }
    },
  })).actions((self) => ({
    loadCategories: flow(function* () {
      self.setLoading(true);
      try {
        const apiCategories: ApiCategory[] = yield categoriesService.getCategories();
        const mstCategories = apiCategories.map(mapApiCategoryToMstCategory);
        self.setCategories(mstCategories);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        self.setLoading(false);
      }
    }),

    createCategory: flow(function* (categoryData: { name: string; description?: string; color?: string; dataType?: 'text' | 'date' | 'number' | 'string'; keywords?: string[]; type?: 'default' | 'custom' | 'system' }) {
      try {
        const apiData = {
          name: categoryData.name,
          description: categoryData.description,
          color: categoryData.color,
          dataType: categoryData.dataType === 'string' ? 'text' : categoryData.dataType,
          keywords: categoryData.keywords,
          type: categoryData.type,
        };
        const apiCategory: ApiCategory = yield categoriesService.createCategory(apiData);
        const mstCategory = mapApiCategoryToMstCategory(apiCategory);
        self.addCategory(mstCategory);
        return mstCategory;
      } catch (error) {
        console.error('Failed to create category:', error);
        throw error;
      }
    }),

    updateCategory: flow(function* (id: string, categoryData: { name?: string; description?: string; color?: string; dataType?: 'text' | 'date' | 'number' | 'string'; keywords?: string[] }) {
      try {
        const apiData = {
          ...categoryData,
          dataType: categoryData.dataType === 'string' ? 'text' : categoryData.dataType
        };
        const apiCategory: ApiCategory = yield categoriesService.updateCategory(id, apiData);
        const mstCategory = mapApiCategoryToMstCategory(apiCategory);
        const index = self.categories.findIndex(c => c.id === id);
        if (index !== -1) {
          self.categories[index] = mstCategory;
        }
        return mstCategory;
      } catch (error) {
        console.error('Failed to update category:', error);
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
