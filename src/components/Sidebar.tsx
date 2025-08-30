import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Book, Tag, MessageSquare, Upload, Settings, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../stores';

interface SidebarProps {}

export const Sidebar: React.FC<SidebarProps> = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { bookStore, tagStore } = useStore();

  const menuItems = [
    { id: 'books', path: '/books', label: 'Books', icon: Book },
    { id: 'tags', path: '/tags', label: 'Tags', icon: Tag },
    { id: 'chat', path: '/chat', label: 'Chat', icon: MessageSquare },
    { id: 'upload', path: '/upload', label: 'Upload', icon: Upload },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`bg-white shadow-lg h-screen flex flex-col left-0 top-0 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Book Reader AI</h1>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      <nav className="flex-1 p-4 overflow-hidden">
        <ul className="space-y-2">
          {menuItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${
                    !isExpanded && 'justify-center'
                  }`
                }
                title={label}
              >
                <div className={`flex items-center ${isExpanded ? 'space-x-3' : ''}`}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && <span className="font-medium">{label}</span>}
                </div>
                {isExpanded && label === 'Books' && bookStore.books.length > 0 && (
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                    {bookStore.books.length}
                  </span>
                )}
                {isExpanded && label === 'Tags' && tagStore.tags.length > 0 && (
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                    {tagStore.tags.length}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
