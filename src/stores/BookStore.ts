import { types, Instance, flow } from 'mobx-state-tree';
import { bookService } from '../services/bookService';
import { BookContent } from '../types';

const mapApiBookToMstBook = (apiBook: BookContent) => ({
  id: apiBook.id || '',
  title: apiBook.title || 'Untitled',
  author: apiBook.author || 'Unknown',
  filePath: '',
  coverImage: undefined,
  createdAt: new Date(apiBook.uploadedAt || Date.now()),
  updatedAt: new Date(apiBook.uploadedAt || Date.now()),
  totalPages: apiBook.pages?.length || 0,
  currentPage: 0,
  pages: apiBook.pages || [],
  uploadedAt: new Date(apiBook.uploadedAt || Date.now()),
});

export const Book = types.model('Book', {
  id: types.identifier,
  title: types.string,
  author: types.string,
  filePath: types.string,
  coverImage: types.maybe(types.string),
  createdAt: types.Date,
  updatedAt: types.Date,
  totalPages: types.number,
  currentPage: types.number,
  pages: types.array(types.model({
    pageNumber: types.number,
    text: types.string,
    images: types.optional(types.array(types.string), []),
  })),
  uploadedAt: types.Date,
});

export const BookStore = types
  .model('BookStore', {
    books: types.array(Book),
    currentBook: types.maybe(types.reference(Book)),
    isLoading: types.boolean,
  })
  .actions((self) => ({
    setBooks(books: any[]) {
      const mstBooks = books.map((book) => Book.create(book));
      self.books.replace(mstBooks);
    },
    setCurrentBook(book: Instance<typeof Book> | undefined) {
      self.currentBook = book;
    },
    setLoading(loading: boolean) {
      self.isLoading = loading;
    },
    addBook(book: Instance<typeof Book>) {
      self.books.push(book);
    },
    updateBook(id: string, updates: Partial<Instance<typeof Book>>) {
      const book = self.books.find(b => b.id === id);
      if (book) {
        Object.assign(book, updates);
      }
    },
    deleteBook(id: string) {
      const index = self.books.findIndex(b => b.id === id);
      if (index !== -1) {
        self.books.splice(index, 1);
      }
    },
  })).actions((self) => ({
    loadBooks: flow(function* () {
      self.setLoading(true);
      try {
        const apiBooks: BookContent[] = yield bookService.getAllBooks();
        const mstBooks = apiBooks.map((book) => Book.create(mapApiBookToMstBook(book)));
        self.setBooks(mstBooks);
      } catch (error) {
        console.error('Failed to load books:', error);
      } finally {
        self.setLoading(false);
      }
    }),

    loadBook: flow(function* (id: string) {
      self.setLoading(true);
      try {
        const apiBook: BookContent | null = yield bookService.getBook(id);
        if (apiBook) {
          const mstBook = Book.create(mapApiBookToMstBook(apiBook));
          // Check if book already exists in store
          let existingBook = self.books.find(b => b.id === apiBook.id);
          if (!existingBook) {
            // Add to books array if not exists
            self.addBook(mstBook);
            existingBook = self.books.find(b => b.id === apiBook.id);
          }
          if (existingBook) {
            self.setCurrentBook(existingBook);
          }
        }
      } catch (error) {
        console.error('Failed to load book:', error);
      } finally {
        self.setLoading(false);
      }
    }),

    removeBook: flow(function* (id: string) {
      try {
        yield bookService.deleteBook(id);
        self.deleteBook(id);
      } catch (error) {
        console.error('Failed to delete book:', error);
        throw error;
      }
    })
  })).actions((self) => ({
    updateBook: flow(function* (id: string, updates: { title?: string; author?: string }) {
      try {
        const success = yield bookService.updateBook(id, updates);
        if (success) {
          const book = self.books.find(b => b.id === id);
          if (book) {
            Object.assign(book, updates);
          }
        }
        return success;
      } catch (error) {
        console.error('Failed to update book:', error);
        throw error;
      }
    }),
  }));

export type BookStoreType = Instance<typeof BookStore>;
