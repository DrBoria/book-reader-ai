import { Box, Typography, Button } from '@mui/material';
import { ReactNode } from 'react';

type EmptyStateVariant = 'no-books' | 'no-tags' | 'no-content' | 'no-results' | 'error';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

const emptyStateConfig: Record<EmptyStateVariant, {
  title: string;
  description: string;
  icon: string;
}> = {
  'no-books': {
    title: 'No books uploaded',
    description: 'Upload your first PDF to get started',
    icon: '📚',
  },
  'no-tags': {
    title: 'No tags created',
    description: 'Create tags to organize your content',
    icon: '🏷️',
  },
  'no-content': {
    title: 'No content available',
    description: 'Add some content to see it here',
    icon: '📝',
  },
  'no-results': {
    title: 'No results found',
    description: 'Try adjusting your search criteria',
    icon: '🔍',
  },
  'error': {
    title: 'Something went wrong',
    description: 'Please try again later',
    icon: '⚠️',
  },
};

export const EmptyState = ({ 
  variant, 
  title, 
  description, 
  action, 
  icon 
}: EmptyStateProps) => {
  const config = emptyStateConfig[variant];
  
  return (
    <Box textAlign="center" py={4}>
      <Typography variant="h3" color="text.secondary" gutterBottom>
        {icon || config.icon}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title || config.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {description || config.description}
      </Typography>
      {action && (
        <Button 
          variant="contained" 
          color="primary" 
          onClick={action.onClick}
          sx={{ mt: 2 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
};