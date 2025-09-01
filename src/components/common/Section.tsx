import { Typography } from '@mui/material';
import { ReactNode } from 'react';
import { Container } from './Container';

interface SectionProps {
  title?: string;
  children: ReactNode;
  type?: 'section' | 'subsection' | 'card';
}

export const Section = ({ title, children, type = 'section' }: SectionProps) => {
  const containerType = type === 'card' ? 'card' : 'section';
  
  return (
    <Container type={containerType}>
      {title && (
        <Typography 
          variant={type === 'subsection' ? 'h6' : 'h5'} 
          component={type === 'subsection' ? 'h3' : 'h2'} 
          gutterBottom
        >
          {title}
        </Typography>
      )}
      {children}
    </Container>
  );
};