import React, { useState, useMemo } from "react";
import { Tag, TaggedContent, TagCategory } from "../types";
import {
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  TextField
} from '@mui/material';
import { Modal } from './common/Modal';

interface TagPanelProps {
  tags: Tag[];
  categories: TagCategory[];
  taggedContent: TaggedContent[];
  selectedTag: string | null;
  onTagSelect: (tagId: string) => void;
  onDeleteTag: (tagId: string) => Promise<void>;
}

export const TagPanel: React.FC<TagPanelProps> = ({
  tags,
  categories,
  taggedContent,
  selectedTag,
  onTagSelect,
  onDeleteTag
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tags, searchQuery]);

  const getTagCount = (tagId: string) => {
    return taggedContent.filter(content => content.tagId === tagId).length;
  };

  return (
    <>
      <TextField
        label="Search tags"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        fullWidth
        margin="normal"
      />

      <List>
        {categories.map(category => {
          const categoryTags = filteredTags.filter(tag => tag.categoryId === category.id);
          if (categoryTags.length === 0) return null;

          return (
            <ListItem key={category.id}>
              <div>
                <Typography variant="h6">{category.name}</Typography>
                {categoryTags.map(tag => {
                  const count = getTagCount(tag.id);
                  return (
                    <Chip
                      key={tag.id}
                      label={`${tag.name} (${count})`}
                      onClick={() => onTagSelect(tag.id)}
                      onDelete={() => setDeleteConfirm(tag.id)}
                      color={selectedTag === tag.id ? "primary" : "default"}
                      sx={{ m: 0.5 }}
                    />
                  );
                })}
              </div>
            </ListItem>
          );
        })}
      </List>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Tag"
        onSave={async () => {
          if (deleteConfirm) {
            await onDeleteTag(deleteConfirm);
            setDeleteConfirm(null);
          }
        }}
      >
        <Typography>Are you sure you want to delete this tag?</Typography>
      </Modal>
    </>
  );
};
