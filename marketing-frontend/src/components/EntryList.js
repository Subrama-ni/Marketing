import React, { useEffect, useState } from 'react';
import { getEntriesByCustomer, deleteEntry } from '../api';

export default function EntryList({ customerId }) {
  const [entries, setEntries] = useState([]);

  const fetch = async () => {
    try {
      const res = await getEntriesByCustomer(customerId);
      setEntries(res.data);
    } catch (err) {
      console.error(err);
      setEntries([]);
    }
  };

  useEffect(()=>{ if(customerId) fetch(); }, [customerId]);

  return (
    <div className="card">
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
                <button className="secondary" onClick={async ()=>{ if(window.confirm('Delete entry?')){ await deleteEntry(e.id); fetch(); }}}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
