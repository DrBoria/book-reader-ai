import { Card, CardContent, CardHeader, Paper, Box } from '@mui/material';
import { ReactNode, forwardRef, HTMLAttributes } from 'react';

interface ContentCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  type?: 'default' | 'book' | 'upload' | 'empty' | 'page' | 'form' | 'list';
  elevation?: number;
  fullWidth?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
  sx?: any;
}

export const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(({
  title, 
  subtitle, 
  children, 
  actions, 
  type = 'default',
  elevation = 2,
  fullWidth = false,
  padding = 'medium',
  sx,
  ...props
}, ref) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'small': return 1;
      case 'large': return 4;
      default: return 2;
    }
  };

  const commonProps = {
    elevation: type === 'page' ? 0 : elevation,
    sx: {
      width: fullWidth ? '100%' : 'auto',
      height: '100%',
      ...sx
    },
    ref,
    ...props
  };

  if (type === 'page') {
    return (
      <Paper {...commonProps}>
        <Box sx={{ p: getPadding() }}>
          {children}
        </Box>
      </Paper>
    );
  }

  return (
    <Card {...commonProps}>
      {(title || subtitle || actions) && (
        <CardHeader
          title={title}
          subheader={subtitle}
          action={actions}
        />
      )}
      <CardContent sx={{ p: getPadding() }}>
        {children}
      </CardContent>
    </Card>
  );
});