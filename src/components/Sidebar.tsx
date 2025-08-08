import React, { useState, useEffect } from 'react';
import { Book, Tag, MessageSquare, Upload, Settings, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export type ActiveView = 'books' | 'tags' | 'chat' | 'upload' | 'settings';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  bookCount: number;
  tagCount: number;
  onWidthChange?: (width: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  bookCount,
  tagCount,
  onWidthChange
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const menuItems = [
    { id: 'books' as ActiveView, label: 'Books', icon: Book, count: bookCount },
    { id: 'tags' as ActiveView, label: 'Tags', icon: Tag, count: tagCount },
    { id: 'chat' as ActiveView, label: 'Chat', icon: MessageSquare },
    { id: 'upload' as ActiveView, label: 'Upload', icon: Upload },
    { id: 'settings' as ActiveView, label: 'Settings', icon: Settings },
  ];

  const toggleSidebar = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onWidthChange) {
      onWidthChange(newExpanded ? 256 : 64);
    }
  };

  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(isExpanded ? 256 : 64);
    }
  }, [isExpanded, onWidthChange]);

  return (
    <div className={`bg-white shadow-lg h-screen flex flex-col fixed left-0 top-0 $${isExpanded ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out`}>
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
          {menuItems.map(({ id, label, icon: Icon, count }) => (
            <li key={id}>
              <button
                onClick={() => onViewChange(id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  activeView === id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${
                  !isExpanded && 'justify-center'
                }`}
                title={label}
              >
                <div className={`flex items-center ${
                  isExpanded ? 'space-x-3' : ''
                }`}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && <span className="font-medium">{label}</span>}
                </div>
                {isExpanded && count !== undefined && count > 0 && (
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                    {count}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
