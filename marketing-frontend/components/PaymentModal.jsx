// src/components/PaymentModal.jsx
import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function PaymentModal({ customer, onClose, onPaid }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10));
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  async function pay(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { startDate, endDate: endDate||null, amount: Number(amount), method };
      const res = await fetch(`${API_BASE}/customers/${customer.id}/payments`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if (res.status === 409) {
        const txt = await res.text();
        throw new Error('Duplicate payment or overlap: '+txt);
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onPaid && onPaid(data);
      onClose();
    } catch (err) {
      alert('Payment failed: ' + (err.message || err));
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal card">
        <h3>Make payment to {customer.name}</h3>
        <form onSubmit={pay} className="form">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required />
          <label>End date (optional)</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
          <label>Amount</label>
          <input type="number" value={amount} min="0" step="0.01" onChange={e=>setAmount(e.target.value)} required />
          <label>Method</label>
          <select value={method} onChange={e=>setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="qr">QR</option>
            <option value="upi">UPI</option>
            <option value="netbank">Net-banking</option>
          </select>
          <div className="modal-actions">
            <button className="btn muted" type="button" onClick={onClose}>Cancel</button>
            <button className="btn" type="submit" disabled={loading}>{loading? 'Processing...' : 'Pay'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
