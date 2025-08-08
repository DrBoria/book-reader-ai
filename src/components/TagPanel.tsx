import React, { useState, useMemo, useCallback, useRef } from "react";
import { VariableSizeList } from "react-window";
import { Tag, TaggedContent, TagCloud, TagCategory } from "../types";
import { List, Cloud, ChevronDown, ChevronRight, X, Trash2, Search } from "lucide-react";

interface TagPanelProps {
  tags: Tag[];
  categories: TagCategory[];
  taggedContent: TaggedContent[];
  selectedTag: string | null;
  onTagSelect: (tagId: string) => void;
  onDeleteTag: (tagId: string) => Promise<void>;
  onBulkDeleteTags: (tagIds: string[]) => Promise<void>;
}

export const TagPanel: React.FC<TagPanelProps> = ({
  tags,
  categories,
  taggedContent,
  selectedTag,
  onTagSelect,
  onDeleteTag,
  onBulkDeleteTags
}) => {
  const [viewMode, setViewMode] = useState<"list" | "cloud">("list");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [listHeight, setListHeight] = useState(400);
  const listRef = useRef<VariableSizeList>(null);

  React.useEffect(() => {
    const updateHeight = () => {
      setListHeight(Math.max(300, window.innerHeight - 350));
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
    
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    }, 0);
  };

  const toggleTagSelection = (tagId: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
  };

  const selectAllTagsInCategory = (categoryId: string) => {
    const categoryTags = tags.filter(tag => tag.categoryId === categoryId);
    const newSelected = new Set(selectedTags);
    categoryTags.forEach(tag => newSelected.add(tag.id));
    setSelectedTags(newSelected);
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await onDeleteTag(tagId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await onBulkDeleteTags(Array.from(selectedTags));
      setSelectedTags(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to bulk delete tags:', error);
      alert('Failed to delete tags. Please try again.');
    }
  };

  // Fuzzy search utility
  const fuzzySearch = (text: string, query: string): boolean => {
    if (!query.trim()) return true;
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Simple fuzzy search: check if all query characters appear in order
    let textIndex = 0;
    let queryIndex = 0;
    
    while (textIndex < textLower.length && queryIndex < queryLower.length) {
      if (textLower[textIndex] === queryLower[queryIndex]) {
        queryIndex++;
      }
      textIndex++;
    }
    
    return queryIndex === queryLower.length;
  };

  const getTagCounts = (): TagCloud[] => {
    const counts = tags.map(tag => {
      // Use server-provided contentCount if available, otherwise calculate from taggedContent
      const count = tag.contentCount ?? taggedContent.filter(content => content.tagId === tag.id).length;
      return {
        tag,
        count,
        weight: count > 0 ? Math.log(count + 1) : 0
      };
    });

    return counts.sort((a, b) => b.count - a.count);
  };

  const tagClouds = useMemo(() => {
    const allTagClouds = getTagCounts();
    
    if (!searchQuery.trim()) {
      return allTagClouds;
    }
    
    return allTagClouds.filter(({ tag }) => 
      fuzzySearch(tag.name, searchQuery) || 
      (tag.description && fuzzySearch(tag.description, searchQuery))
    );
  }, [tags, taggedContent, searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    
    return categories.filter(category => {
      const hasMatchingTags = tagClouds.some(({ tag }) => tag.categoryId === category.id);
      return hasMatchingTags || fuzzySearch(category.name, searchQuery);
    });
  }, [categories, tagClouds, searchQuery]);

  const maxWeight = Math.max(...tagClouds.map(tc => tc.weight), 0);

  // Функция для расчета высоты каждой категории
  const getItemSize = useCallback((index: number) => {
    const category = filteredCategories[index];
    const categoryTags = tagClouds.filter(({ tag }) => tag.categoryId === category.id);
    const isCollapsed = collapsedCategories.has(category.id);
    
    // Базовая высота заголовка категории
    let height = 60; // заголовок + отступы
    
    if (!isCollapsed) {
      // Добавляем высоту для кнопки "Select all"
      if (categoryTags.length > 0) {
        height += 30;
      }
      // Добавляем высоту для каждого тега
      height += categoryTags.length * 50; // примерно 50px на тег
      // Добавляем отступы между тегами
      height += Math.max(0, categoryTags.length - 1) * 4;
    }
    
    return height;
  }, [filteredCategories, tagClouds, collapsedCategories]);

  const TagListItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const category = filteredCategories[index];
    const categoryTags = tagClouds.filter(({ tag }) => tag.categoryId === category.id);
    const totalCount = categoryTags.reduce((sum, { count }) => sum + count, 0);
    const isCollapsed = collapsedCategories.has(category.id);

    return (
      <div style={style} className="px-1">
        <div className="space-y-2">
          {/* Category Header */}
          <button 
            onClick={() => toggleCategory(category.id)}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full"
          >
            <div className="flex items-center">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 mr-1 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 mr-1 text-gray-500" />
              )}
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: category.color }}
              />
              <span className="font-medium text-gray-900">{category.name}</span>
            </div>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
              {totalCount}
            </span>
          </button>
          
          {/* Category Tags */}
          {!isCollapsed && (
            <div className="ml-4 space-y-1">
              {categoryTags.length > 0 && (
                <button
                  onClick={() => selectAllTagsInCategory(category.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 mb-2"
                >
                  Select all in category
                </button>
              )}
              {categoryTags.map(({ tag, count }) => (
                <div
                  key={tag.id}
                  className={`p-2 rounded border transition-all ${
                    selectedTag === tag.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(tag.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleTagSelection(tag.id);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagSelect(tag.id);
                        }}
                        className="flex-1 text-left focus:outline-none"
                      >
                        <span className="text-gray-900">{tag.name}</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(tag.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete tag"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [filteredCategories, tagClouds, collapsedCategories, selectedTag, selectedTags, onTagSelect, toggleCategory, selectAllTagsInCategory, toggleTagSelection, setShowDeleteConfirm]);

  const renderTagList = () => (
    <div className="h-full">
      <VariableSizeList
        ref={listRef}
        height={listHeight}
        itemCount={filteredCategories.length}
        itemSize={getItemSize}
        width="100%"
        className="pr-2"
      >
        {TagListItem}
      </VariableSizeList>
    </div>
  );

  const renderTagCloud = () => (
    <div className="flex flex-wrap gap-2 p-4">
      {tagClouds.map(({ tag, count, weight }) => {
        const fontSize = Math.max(0.75, (weight / maxWeight) * 1.5);
        
        return (
          <button
            key={tag.id}
            onClick={() => onTagSelect(tag.id)}
            className={`px-3 py-1 rounded-full transition-all hover:scale-105 ${
              selectedTag === tag.id
                ? "ring-2 ring-blue-500 ring-offset-1"
                : ""
            }`}
            style={{
              backgroundColor: tag.color + "20",
              color: tag.color,
              fontSize: `${fontSize}rem`,
              borderWidth: "1px",
              borderColor: tag.color + "40"
            }}
          >
            {tag.name} ({count})
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setViewMode("list")}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md transition-colors ${
            viewMode === "list"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <List className="h-4 w-4 mr-1" />
          List
        </button>
        <button
          onClick={() => setViewMode("cloud")}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md transition-colors ${
            viewMode === "cloud"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Cloud className="h-4 w-4 mr-1" />
          Cloud
        </button>
      </div>

      {/* Tags Display */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "list" ? renderTagList() : renderTagCloud()}
      </div>

      {/* Bulk Actions */}
      {selectedTags.size > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedTags.size} tag{selectedTags.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {searchQuery && (
            <div className="flex justify-between mb-1">
              <span>Filtered tags:</span>
              <span className="font-medium">{tagClouds.length} / {tags.length}</span>
            </div>
          )}
          {!searchQuery && (
            <div className="flex justify-between">
              <span>Total tags:</span>
              <span className="font-medium">{tags.length}</span>
            </div>
          )}
          <div className="flex justify-between mt-1">
            <span>Tagged content:</span>
            <span className="font-medium">{taggedContent.length}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this tag and all its associated content? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTag(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Bulk Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedTags.size} tag{selectedTags.size > 1 ? 's' : ''} and all their associated content? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
