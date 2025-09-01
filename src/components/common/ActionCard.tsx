import { Card, CardContent, Typography, Box } from '@mui/material';

interface ActionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  children,
  onClick
}) => (
  <Card 
    sx={{ 
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { boxShadow: 4 } : {}
    }}
    onClick={onClick}
  >
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </CardContent>
  </Card>
);