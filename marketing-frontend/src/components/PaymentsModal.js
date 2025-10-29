import React from 'react';
import { Box, Typography, Modal, Button } from '@mui/material';
import { jsPDF } from 'jspdf';

export default function PaymentsModal({ open, onClose, payment }) {
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Payment Bill", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Customer: ${payment.customerName || payment.customerId}`, 20, 40);
    doc.text(`Entry Date: ${new Date(payment.entryDate).toLocaleDateString()}`, 20, 50);
    doc.text(`Kgs: ${payment.kgs}`, 20, 60);
    doc.text(`Rate/Kg: ₹${payment.ratePerKg}`, 20, 70);
    doc.text(`Commission: ₹${payment.commission}`, 20, 80);
    doc.text(`Amount Paid: ₹${payment.totalAmount}`, 20, 90);
    doc.text(`Payment Date: ${new Date(payment.paymentDate).toLocaleString()}`, 20, 100);
    doc.text(`Payment Mode: ${payment.mode.toUpperCase()}`, 20, 110);

    doc.save(`Payment_Bill_${payment.customerName || payment.customerId}.pdf`);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}>
        <Typography variant="h5" gutterBottom>Payment Bill</Typography>
        <Typography variant="body1">{`Customer: ${payment.customerName || payment.customerId}`}</Typography>
        <Typography variant="body1">{`Entry Date: ${new Date(payment.entryDate).toLocaleDateString()}`}</Typography>
        <Typography variant="body1">{`Kgs: ${payment.kgs}`}</Typography>
        <Typography variant="body1">{`Rate/Kg: ₹${payment.ratePerKg}`}</Typography>
        <Typography variant="body1">{`Commission: ₹${payment.commission}`}</Typography>
        <Typography variant="body1">{`Amount Paid: ₹${payment.totalAmount}`}</Typography>
        <Typography variant="body1">{`Payment Date: ${new Date(payment.paymentDate).toLocaleString()}`}</Typography>
        <Typography variant="body1">{`Payment Mode: ${payment.mode.toUpperCase()}`}</Typography>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="contained" onClick={handlePrint}>Print Bill</Button>
          <Button variant="outlined" onClick={handleDownloadPDF}>Download PDF</Button>
        </Box>
      </Box>
    </Modal>
  );
}
