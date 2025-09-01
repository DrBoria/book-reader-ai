import React from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  isBookLoaded: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  isTyping,
  isBookLoaded,
  inputRef
}) => {
  return (
    <Box p={2}>
      <Box display="flex" gap={1}>
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={isBookLoaded ? "Ask a question about your book..." : "Please upload a book first"}
          disabled={!isBookLoaded || isTyping}
          variant="outlined"
        />
        <Button
          variant="contained"
          onClick={onSend}
          disabled={!value.trim() || !isBookLoaded || isTyping}
          startIcon={isTyping ? <CircularProgress size={20} /> : <Send size={20} />}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};