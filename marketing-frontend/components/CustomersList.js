import React, { useEffect, useState } from 'react';
import { getCustomers, createCustomer } from '../api';

export default function CustomersList({ onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(()=>{ load(); }, []);
  const load = async () => {
    const res = await getCustomers();
    setCustomers(res.data || []);
  };

  const handleAdd = async () => {
    if (!name || !serial) return alert('Name & serial required');
    try {
      await createCustomer({ name, serial: Number(serial), phone });
      setName(''); setPhone(''); setSerial('');
      load();
    } catch(err){ alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="card">
        <h3>Customers</h3>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="Serial" value={serial} onChange={e=>setSerial(e.target.value)} />
          <input className="input" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
          <button className="btn" onClick={handleAdd}>Add Customer</button>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {customers.map(c => (
          <div key={c.id} style={{padding:8, cursor:'pointer'}} onClick={()=>onSelect && onSelect(c)}>
            {c.name} • #{c.serial}
          </div>
        ))}
      </div>
    </div>
  );
}
