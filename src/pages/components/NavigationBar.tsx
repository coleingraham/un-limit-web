import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export default function NavigationBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <IconButton onClick={() => setOpen(true)} size="small" sx={{ color: 'text.secondary' }}>
        <MenuIcon fontSize="small" />
      </IconButton>
      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <List sx={{ width: 200 }}>
          <ListItemButton onClick={() => go('/')}>
            <ListItemText primary="Instrument" />
          </ListItemButton>
          <ListItemButton onClick={() => go('/settings')}>
            <ListItemText primary="Settings" />
          </ListItemButton>
          <ListItemButton onClick={() => go('/editor')}>
            <ListItemText primary="SynthDef Editor" />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  );
}
