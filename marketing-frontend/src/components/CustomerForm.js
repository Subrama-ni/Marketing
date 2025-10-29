import React, { useState } from 'react';
import { createCustomer } from '../api';

export default function CustomerForm({ onCreated }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serial, setSerial] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name || serial === '') return alert('Name & serial required');
    try {
      await createCustomer({ name, phone: phone || null, serial: Number(serial) });
      setName(''); setPhone(''); setSerial('');
      if (onCreated) onCreated();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating customer');
    }
  };

  return (
    <div className="card">
      <h2>Add Customer</h2>
      <form onSubmit={submit}>
        <label>Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} required />
        <label>Phone</label>
        <input value={phone} onChange={e=>setPhone(e.target.value)} />
        <label>Serial</label>
        <input type="number" value={serial} onChange={e=>setSerial(e.target.value)} required />
        <div style={{ marginTop:12 }}>
          <button type="submit">Create Customer</button>
        </div>
      </form>
    </div>
  );
}
