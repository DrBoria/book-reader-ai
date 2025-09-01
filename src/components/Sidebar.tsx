import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Chip
} from '@mui/material';
import { Container } from '../components/common/Container';
import { Book, Tag, MessageSquare, Upload, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../stores';

export const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { bookStore, tagStore } = useStore();

  const menuItems = [
    { id: 'books', path: '/books', label: 'Books', icon: Book },
    { id: 'tags', path: '/tags', label: 'Tags', icon: Tag },
    { id: 'chat', path: '/chat', label: 'Chat', icon: MessageSquare },
    { id: 'upload', path: '/upload', label: 'Upload', icon: Upload },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Container
      type="sidebar"
      sx={{
        width: isExpanded ? 240 : 64,
        height: '100vh',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease-in-out',
        overflow: 'hidden',
        p: 0
      }}
    >
      <List sx={{ flex: 1 }}>
        <ListItem sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
          {isExpanded && (
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              MD Book Reader
            </Typography>
          )}
          <IconButton onClick={toggleSidebar} size="small">
            {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </IconButton>
        </ListItem>

        {menuItems.map(({ path, label, icon: Icon }) => (
          <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
            <NavLink to={path} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
              {({ isActive }) => (
                <ListItemButton
                  selected={isActive}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    justifyContent: isExpanded ? 'flex-start' : 'center',
                    px: isExpanded ? 2 : 1
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isExpanded ? 40 : 'auto', justifyContent: 'center' }}>
                    <Icon size={20} />
                  </ListItemIcon>
                  {isExpanded && (
                    <>
                      <ListItemText primary={label} sx={{ ml: -1 }} />
                      {(label === 'Books' && bookStore.books.length > 0) && (
                        <Chip label={bookStore.books.length} size="small" sx={{ ml: 'auto' }} />
                      )}
                      {(label === 'Tags' && tagStore.tags.length > 0) && (
                        <Chip label={tagStore.tags.length} size="small" sx={{ ml: 'auto' }} />
                      )}
                    </>
                  )}
                </ListItemButton>
              )}
            </NavLink>
          </ListItem>
        ))}
      </List>
    </Container>
  );
};
