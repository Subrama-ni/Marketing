import React, { useEffect, useState } from 'react';
import { getCustomers, createEntry, getEntriesByCustomer, deleteEntry } from '../api';

export default function EntriesPage({ selectedCustomer, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || '');
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ date:'', kgs:'', rate:'', commission:'' });

  useEffect(()=>{ loadCustomers(); }, []);
  useEffect(()=>{ if(selectedCustomer) setCustomerId(selectedCustomer.id); }, [selectedCustomer]);
  useEffect(()=>{ if(customerId) loadEntries(customerId); else setEntries([]); }, [customerId]);

  const loadCustomers = async ()=> {
    try { const res = await getCustomers(); setCustomers(res.data || []); } catch(e){ console.error(e); }
  };

  const loadEntries = async (cid) => {
    try { const res = await getEntriesByCustomer(cid); setEntries(res.data || []); } catch(e){ console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert('Select customer');
    if (!form.date || !form.kgs || !form.rate) return alert('date, kgs and rate required');

    const payload = {
      customerId: Number(customerId),
      entry_date: new Date(form.date).toISOString(),
      kgs: Number(form.kgs),
      rate: Number(form.rate),
      commission: Number(form.commission || 0),
      amount: Number(form.kgs) * Number(form.rate)
    };
    try {
      await createEntry(payload);
      setForm({ date:'', kgs:'', rate:'', commission:'' });
      loadEntries(customerId);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating entry');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete entry?')) return;
    await deleteEntry(id);
    loadEntries(customerId);
  };

  return (
    <div className="col">
      <div className="card">
        <h2>Add / Manage Entries</h2>
        <div className="form-row">
          <select className="input" value={customerId} onChange={(e)=>{ setCustomerId(e.target.value); onSelectCustomer && onSelectCustomer(customers.find(c=>c.id===Number(e.target.value))) }}>
            <option value="">-- select customer --</option>
            {customers.map(c=> <option key={c.id} value={c.id}>{c.name} • #{c.serial}</option>)}
          </select>
          <input className="input" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} />
          <input className="input" placeholder="Kgs" type="number" value={form.kgs} onChange={e=>setForm({...form, kgs:e.target.value})} />
          <input className="input" placeholder="Rate" type="number" value={form.rate} onChange={e=>setForm({...form, rate:e.target.value})} />
          <input className="input" placeholder="Commission" type="number" value={form.commission} onChange={e=>setForm({...form, commission:e.target.value})} />
          <button className="btn" onClick={submit}>Add</button>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h2>Entries</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Kgs</th><th>Rate</th><th>Comm</th><th>Amount</th><th>Paid</th><th>Actions</th></tr></thead>
          <tbody>
            {entries.map(e=>(
              <tr key={e.id}>
                <td>{new Date(e.entry_date).toLocaleDateString()}</td>
                <td>{e.kgs}</td>
                <td>{e.rate}</td>
                <td>{e.commission}</td>
                <td>{e.amount}</td>
                <td>{e.paid_amount}</td>
                <td>
                  <button className="btn ghost" onClick={()=>handleDelete(e.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {entries.length===0 && (<tr><td colSpan="7" style={{padding:12}}>No entries</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
