import { types, Instance, flow } from 'mobx-state-tree';
import { tagsService } from '../services/api';

export const Tag = types.model('Tag', {
  id: types.string,
  name: types.string,
  description: types.maybe(types.string),
  color: types.maybe(types.string),
  type: types.optional(types.union(types.literal('default'), types.literal('dynamic')), 'default'),
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
    setTags(tags: any[]) {
      self.tags.replace(tags);
    },
    setTaggedContent(content: any[]) {
      self.taggedContent.replace(content);
    },
    setSelectedTag(tag: any) {
      self.selectedTag = tag;
    },
    setLoading(loading: boolean) {
      self.isLoading = loading;
    },
    addTag(tag: any) {
      self.tags.push(tag);
    },
    deleteTag(id: string) {
      const index = self.tags.findIndex(t => t.id === id);
      if (index !== -1) {
        self.tags.splice(index, 1);
      }
    },
    addTaggedContent(content: any) {
      self.taggedContent.push(content);
    },
    
    loadTags: flow(function* () {
      self.setLoading(true);
      try {
        const tags = yield tagsService.getTags();
        self.setTags(tags);
      } catch (error) {
        console.error('Failed to load tags:', error);
      } finally {
        self.setLoading(false);
      }
    }),
    
    loadTaggedContent: flow(function* () {
      self.setLoading(true);
      try {
        const content = yield tagsService.getTaggedContent();
        self.setTaggedContent(content);
      } catch (error) {
        console.error('Failed to load tagged content:', error);
      } finally {
        self.setLoading(false);
      }
    }),
    
    createTag: flow(function* (tag: any) {
      try {
        const newTag = yield tagsService.createTag(tag);
        self.addTag(newTag);
        return newTag;
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
    
    tagContent: flow(function* (content: any) {
      try {
        const taggedContent = yield tagsService.tagContent(content);
        self.addTaggedContent(taggedContent);
        return taggedContent;
      } catch (error) {
        console.error('Failed to tag content:', error);
        throw error;
      }
    }),
  }));

export type TagStoreType = Instance<typeof TagStore>;