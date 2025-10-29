// src/components/EntryForm.jsx
import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function calculateCommissionKg(kgs) {
  return Math.floor((Number(kgs) + 2) / 10);
}

export default function EntryForm({ customerId, onAdded }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [kgs, setKgs] = useState(0);
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);

  const commissionKg = calculateCommissionKg(kgs);
  const payableKgs = Math.max(0, Number(kgs) - commissionKg);
  const gross = Number(kgs) * Number(rate);
  const payable = payableKgs * Number(rate);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    const payload = { date, kgs: Number(kgs), ratePerKg: Number(rate), totalAmount: gross };
    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}/entries`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onAdded && onAdded(data);
      setKgs(0); setRate(0);
    } catch (err) {
      alert('Error adding entry: '+ (err.message||err));
    } finally { setLoading(false); }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h4>Add entry</h4>
      <label>Date</label>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} required />
      <label>Kgs</label>
      <input type="number" value={kgs} min="0" step="0.01" onChange={e=>setKgs(e.target.value)} required />
      <label>Rate / kg</label>
      <input type="number" value={rate} min="0" step="0.01" onChange={e=>setRate(e.target.value)} required />

      <div className="summary">
        <div>Gross: <strong>{gross.toFixed(2)}</strong></div>
        <div>Commission (kgs): <strong>{commissionKg}</strong></div>
        <div>Payable: <strong>{payable.toFixed(2)}</strong></div>
      </div>

      <button className="btn" type="submit" disabled={loading}>{loading? 'Saving...':'Save entry'}</button>
    </form>
  );
}
