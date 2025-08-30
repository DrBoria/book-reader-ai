import { types, Instance, flow } from 'mobx-state-tree';
import { booksService } from '../services/api';

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
    setBooks(books: any[]) {
      self.books.replace(books);
    },
    setCurrentBook(book: any) {
      self.currentBook = book;
    },
    setLoading(loading: boolean) {
      self.isLoading = loading;
    },
    addBook(book: any) {
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
        const books = yield booksService.getBooks();
        self.setBooks(books);
      } catch (error) {
        console.error('Failed to load books:', error);
      } finally {
        self.setLoading(false);
      }
    }),

    loadBook: flow(function* (id: string) {
      self.setLoading(true);
      try {
        const book = yield booksService.getBook(id);
        self.setCurrentBook(book);
      } catch (error) {
        console.error('Failed to load book:', error);
      } finally {
        self.setLoading(false);
      }
    }),

    createBook: flow(function* (book: any) {
      try {
        const newBook = yield booksService.createBook(book);
        self.addBook(newBook);
        return newBook;
      } catch (error) {
        console.error('Failed to create book:', error);
        throw error;
      }
    }),

    removeBook: flow(function* (id: string) {
      try {
        yield booksService.deleteBook(id);
        self.deleteBook(id);
      } catch (error) {
        console.error('Failed to delete book:', error);
        throw error;
      }
    })
  }))

export type BookStoreType = Instance<typeof BookStore>;
