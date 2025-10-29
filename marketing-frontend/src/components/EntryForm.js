import React, { useState } from 'react';
import { createEntry } from '../api';

export default function EntryForm({ customerId, onAdded }) {
  const [date, setDate] = useState('');
  const [kgs, setKgs] = useState('');
  const [rate, setRate] = useState('');
  const [commission, setCommission] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!date || !kgs || !rate) return alert('date, kgs and rate required');

    const numericKgs = parseFloat(kgs);
    const numericRate = parseFloat(rate);
    const numericCommission = parseFloat(commission || 0);
    const amount = numericKgs * numericRate;

    const payload = {
      customerId: Number(customerId),
      entry_date: new Date(date).toISOString(),
      kgs: numericKgs,
      rate: numericRate,
      commission: numericCommission,
      amount
    };

    try {
      await createEntry(payload);
      setDate(''); setKgs(''); setRate(''); setCommission('');
      if (onAdded) onAdded();
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding entry');
    }
  };

  return (
    <div className="card">
      <h2>Add Entry</h2>
      <form onSubmit={submit}>
        <label>Date</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} required />
        <label>Kgs</label>
        <input type="number" value={kgs} onChange={e=>setKgs(e.target.value)} required />
        <label>Rate</label>
        <input type="number" value={rate} onChange={e=>setRate(e.target.value)} required />
        <label>Commission</label>
        <input type="number" value={commission} onChange={e=>setCommission(e.target.value)} />
        <div style={{marginTop:12}}><button type="submit">Add Entry</button></div>
      </form>
    </div>
  );
}
