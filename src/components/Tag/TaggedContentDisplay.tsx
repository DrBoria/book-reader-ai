import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem
} from '@mui/material';
import { FileText, Quote, Star } from "lucide-react";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { TaggedContent as TaggedContentType, Tag } from "../../types";
import { ContentCard } from '../common/ContentCard';
import { EmptyState } from '../common/EmptyState';

interface TaggedContentProps {
  taggedContent: TaggedContentType[];
  selectedTag: string | null;
  tags?: Tag[];
}

export const TaggedContentDisplay: React.FC<TaggedContentProps> = observer(({ taggedContent, selectedTag, tags }) => {
  const allTags = tags || [];
  const [sortBy, setSortBy] = useState<"page" | "relevance">("page");
  
  const selectedTagInfo = allTags.find(tag => tag.id === selectedTag);

  const filteredContent = selectedTag 
    ? taggedContent.filter(content => content.tagId === selectedTag)
    : [];

  const sortedContent = [...filteredContent].sort((a, b) => {
    if (sortBy === "page") {
      return a.pageNumber - b.pageNumber;
    }
    return b.relevance - a.relevance;
  });

  if (!selectedTag) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No tag selected"
        description="Choose a tag to view its content"
      />
    );
  }

  return (
    <ContentCard>
      <Typography variant="h5" gutterBottom>
        {selectedTagInfo?.name || "Content"}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {filteredContent.length} items found
      </Typography>

      <FormControl size="small">
        <InputLabel>Sort by</InputLabel>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "page" | "relevance")}
          label="Sort by"
        >
          <MenuItem value="page">Page Number</MenuItem>
          <MenuItem value="relevance">Relevance</MenuItem>
        </Select>
      </FormControl>

      <List>
        {sortedContent.map((content) => (
          <ContentCard key={content.id} type="content">
            <ListItem>
              <FileText />
              <Typography variant="body2">
                Page {content.pageNumber}
              </Typography>
              <Star />
              <Typography variant="body2">
                {Math.round(content.relevance * 100)}% relevant
              </Typography>
            </ListItem>
            
            <ListItem>
              <Quote />
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                "{content.content}"
              </Typography>
            </ListItem>

            {content.context && (
              <ListItem>
                <Typography variant="body2">
                  Context: {content.context}
                </Typography>
              </ListItem>
            )}

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">
                  View full page context
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {content.originalText}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </ContentCard>
        ))}
      </List>

      {filteredContent.length === 0 && (
        <EmptyState
          icon={<FileText />}
          title="No content found for this tag"
          description="The AI agent might not have identified relevant content, or the book may not contain information related to this tag."
        />
      )}
    </ContentCard>
  );
});
