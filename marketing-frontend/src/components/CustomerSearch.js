import React, { useState } from 'react';
import { searchCustomers } from '../api';
import { Card, CardContent, TextField, Button, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

export default function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const data = await searchCustomers(query);
    setResults(data);
  };

  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h6">Search Customer</Typography>
        <TextField label="Search by name, phone, or serial" value={query} onChange={e => setQuery(e.target.value)} fullWidth margin="normal"/>
        <Button variant="contained" color="secondary" onClick={handleSearch} fullWidth>Search</Button>

        {results.length > 0 && (
          <Table sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Serial</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.serial}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
