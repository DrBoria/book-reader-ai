import React from "react";
import { observer } from "mobx-react-lite";
import { BookContent, Tag } from "../types";
import { Typography, List, ListItem, Chip, Container } from "@mui/material";
import { BookOpen } from "lucide-react";
import { ContentCard } from "./common/ContentCard";

interface BookOverviewProps {
  book: BookContent | null;
  tags?: Tag[];
}

export const BookOverview: React.FC<BookOverviewProps> = observer(({
  book,
  tags = []
}) => {
  if (!book) {
    return (
      <ContentCard>
        <BookOpen size={64} />
        <Typography variant="h6">No book selected</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a book from the sidebar to view its content
        </Typography>
      </ContentCard>
    );
  }

  return (
    <ContentCard type="overview" container>
      <BookOpen size={64} />
      <Typography variant="h4" gutterBottom>
        {book.title}
      </Typography>
      {book.author && (
        <Typography variant="body1" color="text.secondary" gutterBottom>
          by {book.author}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {book.pages?.length || 0} pages • Uploaded {new Date(book.uploadedAt).toLocaleDateString()}
      </Typography>

      <Typography variant="h6" gutterBottom>
        Select a tag to view content
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Choose from the tags on the left to see all content related to that topic.
      </Typography>
      
      <Container maxWidth="sm">
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Available tags:
        </Typography>
        <List dense>
          {tags?.slice(0, 8).map(tag => (
            <ListItem key={tag.id}>
              <Chip
                label={tag.name}
                size="small"
              />
            </ListItem>
          ))}
          {tags && tags.length > 8 && (
            <ListItem>
              <Typography variant="caption">
                +{tags.length - 8} more tags...
              </Typography>
            </ListItem>
          )}
        </List>
        
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Book statistics:
        </Typography>
        <List dense>
          <ListItem>
            <Typography variant="body2">
              Total pages: {book?.pages?.length || 0}
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              Characters: {book?.pages?.reduce((acc, page) => acc + page.text.length, 0) || 0}
            </Typography>
          </ListItem>
          <ListItem>
            <Typography variant="body2">
              Average page length: {book?.pages?.length ? Math.round(book.pages.reduce((acc, page) => acc + page.text.length, 0) / book.pages.length) : 0} chars
            </Typography>
          </ListItem>
        </List>
      </Container>
    </ContentCard>
  );
});