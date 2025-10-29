import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, TextField, MenuItem, Button, Typography } from '@mui/material';

export default function PaymentsForm() {
  const [entries, setEntries] = useState([]);
  const [entryId, setEntryId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('');

  useEffect(() => {
    axios.get('http://localhost:4000/api/entries/unpaid')
      .then(res => setEntries(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4000/api/payments', { entryId, amount, mode });
      alert('Payment Added Successfully');
      setEntryId('');
      setAmount('');
      setMode('');
    } catch (err) {
      console.error(err);
      alert('Error adding payment');
    }
  };

  return (
    <Box sx={{ marginLeft: '250px', padding: 3 }}>
      <Typography variant="h5">Add Payment</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          select
          label="Select Entry"
          value={entryId}
          onChange={(e) => setEntryId(e.target.value)}
          fullWidth
          margin="normal"
        >
          {entries.map(entry => (
            <MenuItem key={entry.id} value={entry.id}>
              {`Customer: ${entry.customer.name} | Date: ${new Date(entry.date).toLocaleDateString()} | Kgs: ${entry.kgs}`}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Amount Paid"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          select
          label="Payment Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          fullWidth
          margin="normal"
        >
          {['cash','upi','qr','netbanking','check'].map(m => (
            <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>Add Payment</Button>
      </form>
    </Box>
  );
}
