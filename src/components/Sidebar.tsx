import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Chip
} from '@mui/material';
import { Book, Tag, MessageSquare, Upload, Settings, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <Drawer variant="permanent">
      <List>
        <ListItem>
          {isExpanded && (
            <Typography variant="h6">
              Book Reader AI
            </Typography>
          )}
          <IconButton onClick={toggleSidebar}>
            {isExpanded ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </ListItem>

        {menuItems.map(({ path, label, icon: Icon }) => (
          <ListItem key={path} disablePadding>
            <NavLink to={path} style={{ textDecoration: 'none', color: 'inherit' }}>
              {({ isActive }) => (
                <ListItemButton selected={isActive}>
                  <ListItemIcon>
                    <Icon />
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary={label} />}
                  {isExpanded && label === 'Books' && bookStore.books.length > 0 && (
                    <Chip label={bookStore.books.length} size="small" />
                  )}
                  {isExpanded && label === 'Tags' && tagStore.tags.length > 0 && (
                    <Chip label={tagStore.tags.length} size="small" />
                  )}
                </ListItemButton>
              )}
            </NavLink>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};
