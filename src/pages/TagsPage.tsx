import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { TagPanel } from '../components/TagPanel';
import { SearchScope } from '../components/SearchScope';
import { ContentDisplay } from '../components/ContentDisplay';
import { AddCategoryModal } from '../components/AddCategoryModal';

export const TagsPage: React.FC = observer(() => {
  const { bookStore, tagStore, categoryStore, uiStore } = useStore();
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  useEffect(() => {
    categoryStore.loadCategories();
    tagStore.loadTags();
  }, [categoryStore, tagStore]);

  const handleTagSelect = (tagId: string) => {
    const tag = tagStore.tags.find(t => t.id === tagId);
    tagStore.setSelectedTag(tag);
  };

  const handleDeleteTag = async (tagId: string) => {
    tagStore.deleteTag(tagId);
  };

  const handleBulkDeleteTags = async (tagIds: string[]) => {
    tagIds.forEach(id => tagStore.deleteTag(id));
  };

  const handleAddCustomCategory = async (categoryData: {
    name: string;
    description?: string;
    color?: string;
    dataType?: string;
  }) => {
    const newCategory = await categoryStore.createCategory(categoryData);
    return newCategory;
  };

  const handleScopeChange = (scope: 'all' | 'book' | 'tag', value?: string) => {
    // Implementation for scope change
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tags</h2>
        <button
          onClick={() => setShowAddCategoryModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Category
        </button>
      </div>
      
      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onAddCategory={handleAddCustomCategory}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TagPanel
            tags={Array.from(tagStore.tags)}
            categories={Array.from(categoryStore.categories)}
            taggedContent={Array.from(tagStore.taggedContent)}
            selectedTag={tagStore.selectedTag?.id || null}
            onTagSelect={handleTagSelect}
            onDeleteTag={handleDeleteTag}
            onBulkDeleteTags={handleBulkDeleteTags}
          />
        </div>
        
        <div className="lg:col-span-2">
          {bookStore.currentBook && (
            <>
              <SearchScope
                currentBook={bookStore.currentBook}
                selectedTag={tagStore.selectedTag?.id || null}
                tags={tagStore.tags}
                onScopeChange={handleScopeChange}
              />
              <ContentDisplay
                book={bookStore.currentBook}
                taggedContent={tagStore.taggedContent}
                selectedTag={tagStore.selectedTag?.id || null}
                tags={tagStore.tags}
                isProcessing={uiStore.isProcessing}
                processingProgress={uiStore.processingProgress}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
});