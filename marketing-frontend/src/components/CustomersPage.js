import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ serial: "", name: "", phone: "" });

  const API_URL = "http://localhost:5000/api/customers"; // update with your backend URL

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const res = await axios.get(API_URL);
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle open form modal
  const handleOpen = (customer = null) => {
    setEditingCustomer(customer);
    setFormData(customer || { serial: "", name: "", phone: "" });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // Handle form submit
  const handleSubmit = async () => {
    try {
      if (editingCustomer) {
        // Update existing customer
        await axios.put(`${API_URL}/${editingCustomer.id}`, formData);
      } else {
        // Create new customer
        await axios.post(API_URL, formData);
      }
      fetchCustomers();
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        fetchCustomers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Customers
      </Typography>
      <Button variant="contained" onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Add Customer
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Serial</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((cust) => (
              <TableRow key={cust.id}>
                <TableCell>{cust.serial}</TableCell>
                <TableCell>{cust.name}</TableCell>
                <TableCell>{cust.phone}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(cust)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(cust.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Customer Form Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Serial"
            value={formData.serial}
            onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
          />
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCustomer ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
