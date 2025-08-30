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
  id: types.string,
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
    setBooks(books: Instance<typeof Book>[]) {
      self.books.replace(books);
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
        const mstBooks = apiBooks.map(mapApiBookToMstBook);
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
          const mstBook = mapApiBookToMstBook(apiBook);
          self.setCurrentBook(mstBook);
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
    createBook: flow(function* () {
      try {
        yield self.loadBooks();
        const latestBook = self.books[self.books.length - 1];
        return latestBook;
      } catch (error) {
        console.error('Failed to create book:', error);
        throw error;
      }
    }),
  }));

export type BookStoreType = Instance<typeof BookStore>;
