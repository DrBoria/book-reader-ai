import React from 'react';
import { observer } from 'mobx-react-lite';
import { Typography } from '@mui/material';
import { useStore } from '../stores';
import { TagManager } from '../components/TagManager';
import { TagCategory } from '../types';
import { Container } from '../components/common/Container';

export const SettingsPage: React.FC = observer(() => {
  const { tagStore, categoryStore } = useStore();

  const handleAddCustomCategory = async (categoryData: {
    name: string;
    description?: string;
    color?: string;
    dataType?: string;
  }) => {
    const newCategory: TagCategory = {
      ...categoryData,
      id: Date.now().toString(),
      type: 'custom',
      dataType: (categoryData.dataType as 'text' | 'date' | 'number' | 'string') || 'text',
      keywords: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    categoryStore.addCategory(newCategory as any);
    return newCategory;
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
        onClose={() => {}}
      />
    </Container>
  );
});
