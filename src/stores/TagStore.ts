import { types, flow, Instance } from 'mobx-state-tree';
import { tagService } from '../services/tagService';
import { Tag as ApiTag, TaggedContent as ApiTaggedContent } from '../services/api';

const parseApiDate = (dateInput: string | { year: { low: number; high: number }; month: { low: number; high: number }; day: { low: number; high: number }; hour: { low: number; high: number }; minute: { low: number; high: number }; second: { low: number; high: number }; nanosecond: { low: number; high: number }; timeZoneOffsetSeconds: { low: number; high: number } }): Date => {
  if (typeof dateInput === 'string') {
    return new Date(dateInput);
  }
  if (typeof dateInput === 'object' && dateInput.year) {
    return new Date(
      dateInput.year.low,
      dateInput.month.low - 1,
      dateInput.day.low,
      dateInput.hour.low,
      dateInput.minute.low,
      dateInput.second.low,
      Math.floor(dateInput.nanosecond.low / 1000000)
    );
  }
  return new Date();
};

const mapApiTagToMstTag = (apiTag: ApiTag) => ({
  id: apiTag.id,
  name: apiTag.name || apiTag.label || apiTag.value || '',
  description: apiTag.description,
  color: apiTag.color,
  type: apiTag.type,
  bookId: apiTag.bookId,
  categoryId: apiTag.categoryId,
  value: apiTag.value,
  confidence: apiTag.confidence,
  contentCount: apiTag.contentCount,
  keywords: apiTag.keywords || [],
  createdAt: parseApiDate(apiTag.createdAt),
  updatedAt: parseApiDate(apiTag.updatedAt || apiTag.createdAt),
});

const mapApiTaggedContentToMstTaggedContent = (apiContent: ApiTaggedContent) => ({
  id: apiContent.id,
  bookId: apiContent.bookId,
  tagId: apiContent.tagId,
  content: apiContent.text || '',
  pageNumber: apiContent.pageNumber || 0,
  position: apiContent.position || 0,
  relevance: apiContent.relevance || 0,
  context: apiContent.text,
  originalText: apiContent.originalText || '',
  createdAt: new Date(apiContent.createdAt),
});

export const Tag = types.model('Tag', {
  id: types.identifier,
  name: types.string,
  description: types.maybe(types.string),
  color: types.maybe(types.string),
  type: types.optional(types.union(
    types.literal('default'), 
    types.literal('dynamic'), 
    types.literal('entity'), 
    types.literal('concept'), 
    types.literal('keyword'), 
    types.literal('custom')
  ), 'default'),
  bookId: types.maybe(types.string),
  categoryId: types.maybe(types.string),
  value: types.maybe(types.string),
  confidence: types.maybe(types.number),
  contentCount: types.maybe(types.number),
  keywords: types.array(types.string),
  createdAt: types.Date,
  updatedAt: types.Date,
});

export const TaggedContent = types.model('TaggedContent', {
  id: types.identifier,
  bookId: types.string,
  tagId: types.string,
  content: types.optional(types.string, ''),
  pageNumber: types.optional(types.number, 0),
  position: types.optional(types.number, 0),
  relevance: types.optional(types.number, 0),
  context: types.maybe(types.string),
  originalText: types.optional(types.string, ''),
  createdAt: types.Date,
});

export const TagStore = types
  .model('TagStore', {
    tags: types.array(Tag),
    taggedContent: types.array(TaggedContent),
    selectedTag: types.maybe(types.string),
    isLoading: types.boolean,
  })
  .views((self) => ({
    get selectedTagObject() {
      return self.selectedTag ? self.tags.find(tag => tag.id === self.selectedTag) : undefined;
    }
  }))
  .actions((self) => ({
    setTags(tags: Instance<typeof Tag>[]) {
      self.tags.replace(tags);
    },
    setTaggedContent(content: Instance<typeof TaggedContent>[]) {
      self.taggedContent.replace(content);
    },
    setSelectedTag(tagId: string | undefined) {
      self.selectedTag = tagId;
      if (tagId) {
        this.loadTaggedContentForTag(tagId);
      }
    },
    addTag(tag: Instance<typeof Tag>) {
      self.tags.push(tag);
    },
    deleteTag(id: string) {
      const index = self.tags.findIndex(t => t.id === id);
      if (index !== -1) {
        self.tags.splice(index, 1);
      }
    },
    addTaggedContent(content: Instance<typeof TaggedContent>) {
      self.taggedContent.push(content);
    },
    
    loadTags: flow(function* () {
      self.isLoading = true;
      try {
        const apiTags: ApiTag[] = yield tagService.getAllTags();
        // Clear existing tags and add new ones
        self.tags.clear();
        apiTags.forEach(tag => {
          const mstTag = mapApiTagToMstTag(tag);
          self.tags.push(mstTag);
        });
      } catch (error) {
        console.error('Failed to load tags:', error);
      } finally {
        self.isLoading = false;
      }
    }),

    loadTaggedContent: flow(function* () {
      self.isLoading = true;
      try {
        const apiContent: ApiTaggedContent[] = yield tagService.getContentByTag('all');
        const mstTaggedContent = apiContent.map(mapApiTaggedContentToMstTaggedContent);
        self.taggedContent.replace(mstTaggedContent);
      } catch (error) {
        console.error('Failed to load tagged content:', error);
      } finally {
        self.isLoading = false;
      }
    }),

    loadTaggedContentForTag: flow(function* (tagId: string) {
      self.isLoading = true;
      try {
        const apiContent: ApiTaggedContent[] = yield tagService.getContentByTag(tagId);
        const mstTaggedContent = apiContent.map(mapApiTaggedContentToMstTaggedContent);
        self.taggedContent.replace(mstTaggedContent);
      } catch (error) {
        console.error('Failed to load tagged content for tag:', error);
      } finally {
        self.isLoading = false;
      }
    }),

    createTag: flow(function* (tagData: { name: string; description?: string; color?: string; bookId: string; value: string; confidence: number; contentCount: number }) {
      try {
        const apiTag: ApiTag = yield tagService.createTag({
          name: tagData.name,
          description: tagData.description,
          color: tagData.color,
          bookId: tagData.bookId,
          value: tagData.value,
          confidence: tagData.confidence,
          contentCount: tagData.contentCount,
        });
        const mstTag = mapApiTagToMstTag(apiTag);
        self.tags.push(mstTag);
        return mstTag;
      } catch (error) {
        console.error('Failed to create tag:', error);
        throw error;
      }
    }),

    removeTag: flow(function* (id: string) {
      try {
        yield tagService.deleteTag(id);
        const index = self.tags.findIndex(t => t.id === id);
        if (index !== -1) {
          self.tags.splice(index, 1);
        }
      } catch (error) {
        console.error('Failed to delete tag:', error);
        throw error;
      }
    }),

    tagContent: flow(function* (contentData: { bookId: string; tagId: string; content: string; pageNumber: number; position: number; relevance: number; context?: string; originalText: string }) {
      try {
        // Note: tagService doesn't have tagContent method, this might need adjustment
        const mstTaggedContent = {
          id: Date.now().toString(),
          bookId: contentData.bookId,
          tagId: contentData.tagId,
          content: contentData.content,
          pageNumber: contentData.pageNumber,
          position: contentData.position,
          relevance: contentData.relevance,
          context: contentData.context,
          originalText: contentData.originalText,
          createdAt: new Date(),
        };
        self.taggedContent.push(mstTaggedContent);
        return mstTaggedContent;
      } catch (error) {
        console.error('Failed to tag content:', error);
        throw error;
      }
    })
  }));

export type TagStoreType = Instance<typeof TagStore>;
