import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { BooksPage, TagsPage, ChatPage, UploadPage, SettingsPage } from './pages';

const router = createBrowserRouter([
  {
    path: '/',
    element: <BooksPage />,
  },
  {
    path: '/books',
    element: <BooksPage />,
  },
  {
    path: '/tags',
    element: <TagsPage />,
  },
  {
    path: '/chat',
    element: <ChatPage />,
  },
  {
    path: '/upload',
    element: <UploadPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};