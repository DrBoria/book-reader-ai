import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../../types";
import { bookService } from "../../services/bookService";
import { Box, Typography } from "@mui/material";
import { MessageCircle } from "lucide-react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isBookLoaded: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isBookLoaded
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [expandedReferences, setExpandedReferences] = useState<Set<string>>(new Set());
  const [pageContent, setPageContent] = useState<Record<string, string>>({});
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || !isBookLoaded) return;

    const message = inputMessage.trim();
    setInputMessage("");
    setIsTyping(true);

    try {
      await onSendMessage(message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleReferences = (messageId: string) => {
    const newExpanded = new Set(expandedReferences);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedReferences(newExpanded);
  };

  const loadPageContent = async (pageNumber: number) => {
    const pageKey = pageNumber.toString();
    if (pageContent[pageKey] || loadingPages.has(pageKey)) return;

    const newLoading = new Set(loadingPages);
    newLoading.add(pageKey);
    setLoadingPages(newLoading);

    try {
      // Note: This would need the current book ID, which should be passed as prop
      // For now, we'll just set a placeholder
      setPageContent(prev => ({
        ...prev,
        [pageKey]: `Content for page ${pageNumber}`
      }));
    } catch (error) {
      setPageContent(prev => ({
        ...prev,
        [pageKey]: 'Failed to load page content'
      }));
    } finally {
      const newLoading = new Set(loadingPages);
      newLoading.delete(pageKey);
      setLoadingPages(newLoading);
    }
  };

  if (messages.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
        <MessageCircle size={64} />
        <Typography variant="h6" gutterBottom>
          Start a conversation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isBookLoaded ? "Ask questions about your book" : "Upload a book to get started"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <MessageList
        messages={messages}
        expandedReferences={expandedReferences}
        onToggleReferences={toggleReferences}
        onLoadPageContent={loadPageContent}
        pageContent={pageContent}
        loadingPages={loadingPages}
        messagesEndRef={messagesEndRef}
      />
      
      <ChatInput
        value={inputMessage}
        onChange={setInputMessage}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        isTyping={isTyping}
        isBookLoaded={isBookLoaded}
        inputRef={inputRef}
      />
    </Box>
  );
};
