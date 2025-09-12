import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Typography } from '@mui/material';
import { useStore } from '../stores';
import { TagManager } from '../components/Tag/TagManager';
import { TagCategory } from '../types';
import { Container } from '../components/common/Container';

export const SettingsPage: React.FC = observer(() => {
  const { tagStore, categoryStore } = useStore();

  useEffect(() => {
    categoryStore.loadCategories();
  }, [categoryStore]);

  const handleAddCustomCategory = async (categoryData: {
    name: string;
    description?: string;
    color?: string;
    dataType?: string;
  }) => {
    const newCategory = await categoryStore.createCategory({
      name: categoryData.name,
      description: categoryData.description,
      color: categoryData.color,
      dataType: (categoryData.dataType as 'text' | 'date' | 'number') || 'text',
      type: 'custom',
    });
    return newCategory;
  };

  const handleUpdateCustomCategory = async (categoryId: string, categoryData: {
    name: string;
    description?: string;
    color?: string;
    dataType?: string;
  }) => {
    await categoryStore.updateCategory(categoryId, {
      name: categoryData.name,
      description: categoryData.description,
      color: categoryData.color,
      dataType: (categoryData.dataType as 'text' | 'date' | 'number') || 'text',
    });
  };

  const handleDeleteCustomCategory = async (categoryId: string) => {
    categoryStore.removeCategory(categoryId);
  };

  return (
    <Container type="page">
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <TagManager
        tags={tagStore.tags}
        categories={categoryStore.categories}
        onAddCategory={handleAddCustomCategory}
        onUpdateCategory={handleUpdateCustomCategory}
        onDeleteCategory={handleDeleteCustomCategory}
        onClose={() => {}}
      />
    </Container>
  );
});
