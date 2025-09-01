import React from 'react';
import { ChatMessage } from '../../types';
import { Typography, Paper, Chip, Collapse, IconButton, List, ListItem } from '@mui/material';
import { Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { ContentCard } from '../common/ContentCard';

interface MessageItemProps {
  message: ChatMessage;
  onToggleReferences: (messageId: string) => void;
  isReferencesExpanded: boolean;
  onLoadPageContent: (pageNumber: number) => void;
  pageContent: Record<string, string>;
  loadingPages: Set<string>;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onToggleReferences,
  isReferencesExpanded,
  onLoadPageContent,
  pageContent,
  loadingPages,
}) => {
  const isUser = message.type === 'user';
  const hasReferences = message.references && message.references.length > 0;

  return (
    <ContentCard>
      <ListItem>
        {isUser ? <User size={20} /> : <Bot size={20} />}
        <Typography variant="subtitle2" ml={1}>
          {isUser ? 'You' : 'AI Assistant'}
        </Typography>
      </ListItem>
      
      <Typography variant="body1" component="div" p={2}>
        {message.content}
      </Typography>

      {hasReferences && (
        <List>
          <ListItem>
            <Typography variant="caption" color="text.secondary">
              References ({message.references!.length})
            </Typography>
            <IconButton
              size="small"
              onClick={() => onToggleReferences(message.id)}
            >
              {isReferencesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </IconButton>
          </ListItem>
          
          <Collapse in={isReferencesExpanded}>
            <ListItem>
              {message.references!.map((ref, index) => (
                <Chip
                  key={index}
                  label={`Page ${ref.pageNumber}`}
                  size="small"
                  variant="outlined"
                  onClick={() => onLoadPageContent(ref.pageNumber)}
                  disabled={loadingPages.has(ref.pageNumber.toString())}
                />
              ))}
            </ListItem>
          </Collapse>
        </List>
      )}
    </ContentCard>
  );
};
