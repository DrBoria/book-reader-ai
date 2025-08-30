import { types, Instance, flow } from 'mobx-state-tree';
import { tagsService, Tag as ApiTag, TaggedContent as ApiTaggedContent } from '../services/api';

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
  name: apiTag.label || apiTag.name,
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
  updatedAt: typeof apiTag.updatedAt === 'string' ? new Date(apiTag.updatedAt) : parseApiDate(apiTag.updatedAt),
});

const mapApiTaggedContentToMstTaggedContent = (apiContent: ApiTaggedContent) => ({
  id: apiContent.id,
  bookId: apiContent.bookId,
  tagId: apiContent.tagId,
  content: apiContent.content,
  pageNumber: apiContent.pageNumber,
  position: apiContent.position,
  relevance: apiContent.relevance,
  context: apiContent.context,
  originalText: apiContent.originalText,
  createdAt: new Date(apiContent.createdAt),
});

export const Tag = types.model('Tag', {
  id: types.string,
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
  id: types.string,
  bookId: types.string,
  tagId: types.string,
  content: types.string,
  pageNumber: types.number,
  position: types.number,
  relevance: types.number,
  context: types.maybe(types.string),
  originalText: types.string,
  createdAt: types.Date,
});

export const TagStore = types
  .model('TagStore', {
    tags: types.array(Tag),
    taggedContent: types.array(TaggedContent),
    selectedTag: types.maybe(types.reference(Tag)),
    isLoading: types.boolean,
  })
  .actions((self) => ({
    setTags(tags: Instance<typeof Tag>[]) {
      self.tags.replace(tags);
    },
    setTaggedContent(content: Instance<typeof TaggedContent>[]) {
      self.taggedContent.replace(content);
    },
    setSelectedTag(tag: Instance<typeof Tag> | undefined) {
      self.selectedTag = tag;
    },
    setLoading(loading: boolean) {
      self.isLoading = loading;
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
      self.setLoading(true);
      try {
        const apiTags: ApiTag[] = yield tagsService.getTags();
        const mstTags = apiTags.map(mapApiTagToMstTag);
        self.setTags(mstTags);
      } catch (error) {
        console.error('Failed to load tags:', error);
      } finally {
        self.setLoading(false);
      }
    }),

    loadTaggedContent: flow(function* () {
      self.setLoading(true);
      try {
        const apiContent: ApiTaggedContent[] = yield tagsService.getTaggedContent();
        const mstContent = apiContent.map(mapApiTaggedContentToMstTaggedContent);
        self.setTaggedContent(mstContent);
      } catch (error) {
        console.error('Failed to load tagged content:', error);
      } finally {
        self.setLoading(false);
      }
    }),

    createTag: flow(function* (tagData: { name: string; description?: string; color?: string; bookId: string; value: string; confidence: number; contentCount: number }) {
      try {
        const apiTag: ApiTag = yield tagsService.createTag({
          name: tagData.name,
          description: tagData.description,
          color: tagData.color,
          bookId: tagData.bookId,
          value: tagData.value,
          confidence: tagData.confidence,
          contentCount: tagData.contentCount,
          relevance: 0,
        });
        const mstTag = mapApiTagToMstTag(apiTag);
        self.addTag(mstTag);
        return mstTag;
      } catch (error) {
        console.error('Failed to create tag:', error);
        throw error;
      }
    }),

    removeTag: flow(function* (id: string) {
      try {
        yield tagsService.deleteTag(id);
        self.deleteTag(id);
      } catch (error) {
        console.error('Failed to delete tag:', error);
        throw error;
      }
    }),

    tagContent: flow(function* (contentData: { bookId: string; tagId: string; content: string; pageNumber: number; position: number; relevance: number; context?: string; originalText: string }) {
      try {
        const apiTaggedContent: ApiTaggedContent = yield tagsService.tagContent(contentData);
        const mstTaggedContent = mapApiTaggedContentToMstTaggedContent(apiTaggedContent);
        self.addTaggedContent(mstTaggedContent);
        return mstTaggedContent;
      } catch (error) {
        console.error('Failed to tag content:', error);
        throw error;
      }
    })
  }));

export type TagStoreType = Instance<typeof TagStore>;
