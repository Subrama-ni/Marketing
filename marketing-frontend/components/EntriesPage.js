import React, { useEffect, useState } from 'react';
import { getEntriesByCustomer, createEntry } from '../api';

export default function EntriesPage({ selectedCustomer }) {
  const [entries, setEntries] = useState([]);
  const [kgs, setKgs] = useState('');
  const [rate, setRate] = useState('');
  const [commission, setCommission] = useState('');
  const [date, setDate] = useState('');

  useEffect(()=>{ if (selectedCustomer) load(); else setEntries([]); }, [selectedCustomer]);

  const load = async () => {
    const res = await getEntriesByCustomer(selectedCustomer.id);
    setEntries(res.data || []);
  };

  const add = async () => {
    if (!selectedCustomer) return alert('Select customer');
    if (!date || !kgs || !rate) return alert('date,kgs,rate required');
    try {
      await createEntry({
        customerId: selectedCustomer.id,
        entry_date: date,
        kgs: Number(kgs),
        rate: Number(rate),
        commission: Number(commission || 0)
      });
      setKgs(''); setRate(''); setCommission(''); setDate('');
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="card">
      <h3>Entries{selectedCustomer ? ` • ${selectedCustomer.name}` : ''}</h3>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
        <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} />
        <input className="input" placeholder="Kgs" value={kgs} onChange={e=>setKgs(e.target.value)} />
        <input className="input" placeholder="Rate" value={rate} onChange={e=>setRate(e.target.value)} />
        <input className="input" placeholder="Commission" value={commission} onChange={e=>setCommission(e.target.value)} />
        <button className="btn" onClick={add}>Add</button>
      </div>

      <table className="table">
        <thead><tr><th>Date</th><th>Kgs</th><th>Rate</th><th>Comm</th><th>Amount</th><th>Paid</th></tr></thead>
        <tbody>
          {entries.length===0 ? <tr><td colSpan="6" style={{padding:12}}>No entries</td></tr> :
            entries.map(e=>(
              <tr key={e.id}>
                <td>{new Date(e.entry_date).toLocaleDateString()}</td>
                <td>{e.kgs}</td>
                <td>{e.rate}</td>
                <td>{e.commission}</td>
                <td>{e.amount}</td>
                <td>{e.paid_amount}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
