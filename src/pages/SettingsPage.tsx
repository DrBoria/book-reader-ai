import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { CategoryManager } from '../components/TagManager';

export const SettingsPage: React.FC = observer(() => {
  const { tagStore, categoryStore } = useStore();

  const handleAddCustomCategory = async (categoryData: {
    name: string;
    description?: string;
    color?: string;
    dataType?: string;
  }) => {
    const newCategory = {
      ...categoryData,
      id: Date.now().toString(),
      type: 'custom' as const,
      dataType: categoryData.dataType || 'text',
      keywords: [] as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    categoryStore.addCategory(newCategory);
    return newCategory;
  };

  const handleCategoriesUpdate = () => {
    // Refresh categories if needed
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <CategoryManager
        tags={tagStore.tags}
        categories={categoryStore.categories}
        onAddCategory={handleAddCustomCategory}
        onClose={() => {}}
        onCategoriesUpdate={handleCategoriesUpdate}
        isModal={false}
      />
    </div>
  );
});