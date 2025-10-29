import React, { useEffect, useState } from 'react';
import { getEntriesByCustomer, createEntry, getCustomers } from '../api';
import './DashboardPage.css';

export default function EntriesPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [kgs, setKgs] = useState('');
  const [rate, setRate] = useState('');
  const [commission, setCommission] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await getCustomers();
        setCustomers(res.data || []);
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to load customers');
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) loadEntries();
    else setEntries([]);
  }, [selectedCustomer]);

  const loadEntries = async () => {
    try {
      const res = await getEntriesByCustomer(selectedCustomer.id);
      setEntries(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load entries');
    }
  };

  const addEntry = async () => {
    if (!selectedCustomer) return alert('Select customer');
    if (!date || !kgs || !rate) return alert('Date, Kgs, and Rate are required');
    try {
      await createEntry({
        customerId: selectedCustomer.id,
        entry_date: date,
        kgs: Number(kgs),
        rate: Number(rate),
        commission: Number(commission || 0)
      });
      setKgs(''); setRate(''); setCommission(''); setDate('');
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add entry');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="card">
        <h3>Entries</h3>
        <div style={{ marginBottom: 12 }}>
          <select
            value={selectedCustomer?.id || ''}
            onChange={e => setSelectedCustomer(customers.find(c => c.id === Number(e.target.value)))}
          >
            <option value="">-- Select Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {selectedCustomer && <span style={{ marginLeft: 8 }}>• {selectedCustomer.name}</span>}
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} />
          <input className="input" placeholder="Kgs" value={kgs} onChange={e=>setKgs(e.target.value)} />
          <input className="input" placeholder="Rate" value={rate} onChange={e=>setRate(e.target.value)} />
          <input className="input" placeholder="Commission" value={commission} onChange={e=>setCommission(e.target.value)} />
          <button className="btn ghost" onClick={addEntry}>Add</button>
        </div>

        <table className="table">
          <thead>
            <tr><th>Date</th><th>Kgs</th><th>Rate</th><th>Comm</th><th>Amount</th><th>Paid</th></tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan="6" style={{padding:12}}>No entries</td></tr>
            ) : entries.map(e => (
              <tr key={e.id}>
                <td>{new Date(e.entry_date).toLocaleDateString()}</td>
                <td>{e.kgs}</td>
                <td>{e.rate}</td>
                <td>{e.commission}</td>
                <td>{e.amount}</td>
                <td>{e.paid_amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
