import React from 'react';
import { AppBar, Toolbar, Button, Typography } from '@mui/material';

export default function Navbar({ setPage }) {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Marketing Management
        </Typography>
        <Button color="inherit" onClick={() => setPage('dashboard')}>Dashboard</Button>
        <Button color="inherit" onClick={() => setPage('customers')}>Customers</Button>
        <Button color="inherit" onClick={() => setPage('entries')}>Entries</Button>
        <Button color="inherit" onClick={() => setPage('payments')}>Payments</Button>
      </Toolbar>
    </AppBar>
  );
}
