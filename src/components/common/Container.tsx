import { Container as MuiContainer, ContainerProps as MuiContainerProps } from '@mui/material';
import { ReactNode } from 'react';

interface ContainerProps extends Omit<MuiContainerProps, 'children'> {
  children: ReactNode;
  type?: 'page' | 'card' | 'section' | 'sidebar' | 'modal' | 'full' | 'narrow';
}

export const Container = ({ children, type = 'page', ...props }: ContainerProps) => {
  const maxWidth = type === 'modal' ? 'sm' : 
                   type === 'narrow' ? 'md' : 
                   type === 'full' ? false : 'lg';
  
  return (
    <MuiContainer maxWidth={maxWidth} {...props}>
      {children}
    </MuiContainer>
  );
};