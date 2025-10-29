// src/components/CustomerForm.jsx
import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function CustomerForm({ onCreated }) {
  const [serial, setSerial] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, name, phone })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSerial(''); setName(''); setPhone('');
      onCreated && onCreated(data);
    } catch (err) {
      alert('Error creating customer: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h3>Create customer</h3>
      <label>Serial</label>
      <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="CUST-0001" required />
      <label>Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
      <label>Phone</label>
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit phone" required />
      <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
    </form>
  );
}
