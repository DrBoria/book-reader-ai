import React from 'react';
import { List } from '@mui/material';
import { ChatMessage } from '../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  expandedReferences: Set<string>;
  onToggleReferences: (messageId: string) => void;
  onLoadPageContent: (pageNumber: number) => void;
  pageContent: Record<string, string>;
  loadingPages: Set<string>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  expandedReferences,
  onToggleReferences,
  onLoadPageContent,
  pageContent,
  loadingPages,
  messagesEndRef
}) => {
  return (
    <List>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onToggleReferences={onToggleReferences}
          isReferencesExpanded={expandedReferences.has(message.id)}
          onLoadPageContent={onLoadPageContent}
          pageContent={pageContent}
          loadingPages={loadingPages}
        />
      ))}
      <div ref={messagesEndRef} />
    </List>
  );
};