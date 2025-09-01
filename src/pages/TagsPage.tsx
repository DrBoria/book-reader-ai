import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores';
import { TagPanel } from '../components/Tag/TagPanel';
import { TaggedContentDisplay } from '../components/Tag/TaggedContentDisplay';
import { AddCategoryModal } from '../components/Modal/AddCategoryModal';
import { Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Container } from '../components/common/Container';
import { ContentCard } from '../components/common/ContentCard';

export const TagsPage: React.FC = observer(() => {
  const { bookStore, tagStore, categoryStore, uiStore } = useStore();
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  useEffect(() => {
    categoryStore.loadCategories();
    tagStore.loadTags();
  }, [categoryStore, tagStore]);

  const handleTagSelect = (tagId: string) => {
    tagStore.setSelectedTag(tagId);
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
    dataType?: 'text' | 'date' | 'number';
  }) => {
    await categoryStore.createCategory(categoryData);
  };

  return (
    <Container type="page">
      <Typography variant="h4" gutterBottom>
        Tags
      </Typography>
      
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setShowAddCategoryModal(true)}
        style={{ marginBottom: '1.5rem' }}
      >
        Add Category
      </Button>
      
      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onAddCategory={handleAddCustomCategory}
      />
      
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', minWidth: 300 }}>
          <ContentCard type="list" fullWidth>
            <TagPanel
              tags={Array.from(tagStore.tags)}
              categories={Array.from(categoryStore.categories)}
              taggedContent={Array.from(tagStore.taggedContent)}
              selectedTag={tagStore.selectedTag || null}
              onTagSelect={handleTagSelect}
              onDeleteTag={handleDeleteTag}
            />
          </ContentCard>
        </div>
        
        <div style={{ flex: '2 1 600px', minWidth: 300 }}>
          <ContentCard type="list" fullWidth>
            <TaggedContentDisplay
              taggedContent={Array.from(tagStore.taggedContent)}
              selectedTag={tagStore.selectedTag || null}
              tags={Array.from(tagStore.tags)}
            />
          </ContentCard>
        </div>
      </div>
    </Container>
  );
});
