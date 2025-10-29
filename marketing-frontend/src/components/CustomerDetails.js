import React, { useState, useEffect } from 'react';
import { getCustomers, getEntries, getPayments } from '../api';
import { Card, CardContent, Typography, FormControl, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Box } from '@mui/material';

export default function CustomerDetails() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [totalRemaining, setTotalRemaining] = useState(0);

  // Fetch customers once
  useEffect(() => {
    getCustomers().then(setCustomers);
  }, []);

  // Fetch entries and payments for selected customer
  useEffect(() => {
    if (selectedCustomerId) {
      getEntries(Number(selectedCustomerId)).then(setEntries);
      getPayments(Number(selectedCustomerId)).then(setPayments);
    } else {
      setEntries([]);
      setPayments([]);
    }
  }, [selectedCustomerId]);

  // Calculate total remaining dynamically
  useEffect(() => {
    if (!entries.length) return setTotalRemaining(0);
    const totalEntries = entries.reduce((sum, e) => {
      let commission = 0;
      if (e.kgs >= 8 && e.kgs <= 10) commission = 1;
      else if (e.kgs >= 18 && e.kgs <= 20) commission = 2;
      return sum + e.kgs * e.ratePerKg - commission;
    }, 0);
    const paidSum = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    setTotalRemaining(totalEntries - paidSum);
  }, [entries, payments]);

  const selectedCustomer = customers.find(c => c.id === Number(selectedCustomerId));

  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Customer Dashboard</Typography>

        <FormControl fullWidth margin="normal">
          <Select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">Select Customer</MenuItem>
            {customers.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.name} ({c.serial})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedCustomer && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Entries</Typography>
            {entries.length === 0 ? <Typography>No entries for this customer.</Typography> : (
              <Table sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>KGs</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>Commission</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(e => {
                    let commission = 0;
                    if (e.kgs >= 8 && e.kgs <= 10) commission = 1;
                    else if (e.kgs >= 18 && e.kgs <= 20) commission = 2;
                    const total = e.kgs * e.ratePerKg - commission;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                        <TableCell>{e.kgs}</TableCell>
                        <TableCell>{e.ratePerKg}</TableCell>
                        <TableCell>{commission}</TableCell>
                        <TableCell>{total}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <Typography variant="h6" sx={{ mt: 3 }}>Payments</Typography>
            {payments.length === 0 ? <Typography>No payments yet.</Typography> : (
              <Table sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount Paid</TableCell>
                    <TableCell>Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>{p.amountPaid}</TableCell>
                      <TableCell>{p.method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Box sx={{ mt: 3, p: 2, backgroundColor: totalRemaining > 0 ? '#ffe0b2' : '#c8e6c9', borderRadius: 2 }}>
              <Typography variant="h6">
                Total Remaining: {totalRemaining}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
