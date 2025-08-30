import { types } from 'mobx-state-tree';
import { BookStore } from './BookStore';
import { TagStore } from './TagStore';
import { CategoryStore } from './CategoryStore';
import { UIStore } from './UIStore';

export const RootStore = types.model('RootStore', {
  bookStore: BookStore,
  tagStore: TagStore,
  categoryStore: CategoryStore,
  uiStore: UIStore,
});

export const rootStore = RootStore.create({
  bookStore: {
    books: [],
    currentBook: undefined,
    isLoading: false,
  },
  tagStore: {
    tags: [],
    taggedContent: [],
    selectedTag: undefined,
    isLoading: false,
  },
  categoryStore: {
    categories: [],
    isLoading: false,
  },
  uiStore: {
    activeView: 'books',
    isProcessing: false,
    processingProgress: 0,
    searchScope: 'current',
    chatMessages: [],
    fileUploadProgress: undefined,
  },
});

export type RootStoreType = typeof rootStore;