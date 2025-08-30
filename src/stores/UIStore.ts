import { types, Instance } from 'mobx-state-tree';

export const ChatMessage = types.model('ChatMessage', {
  id: types.string,
  type: types.enumeration(['user', 'assistant']),
  content: types.string,
  timestamp: types.Date,
  bookId: types.maybe(types.string),
  pageNumber: types.maybe(types.number),
  references: types.optional(types.array(types.model({
    pageNumber: types.number,
    chapter: types.maybe(types.string),
    quote: types.string,
    bookId: types.maybe(types.string),
  })), []),
});

export const UIStore = types
  .model('UIStore', {
    activeView: types.enumeration(['books', 'tags', 'chat', 'upload', 'settings']),
    isProcessing: types.boolean,
    processingProgress: types.number,
    searchScope: types.enumeration(['current', 'all']),
    chatMessages: types.array(ChatMessage),
    fileUploadProgress: types.maybe(types.number),
  })
  .actions((self) => ({
    setActiveView(view: 'books' | 'tags' | 'chat' | 'upload' | 'settings') {
      self.activeView = view;
    },
    setProcessing(processing: boolean) {
      self.isProcessing = processing;
    },
    setProcessingProgress(progress: number) {
      self.processingProgress = progress;
    },
    setSearchScope(scope: 'current' | 'all') {
      self.searchScope = scope;
    },
    addChatMessage(message: any) {
      self.chatMessages.push(message);
    },
    setFileUploadProgress(progress: number | undefined) {
      self.fileUploadProgress = progress;
    },
    clearChatMessages() {
      self.chatMessages.clear();
    },
  }));

export type UIStoreType = Instance<typeof UIStore>;