// src/components/CustomerDashboard.jsx
import React, { useState, useEffect } from 'react';
import EntryForm from './EntryForm';
import PaymentModal from './PaymentModal';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function calculateCommissionKg(kgs) {
  return Math.floor((Number(kgs) + 2) / 10);
}

function PaymentHistory({ payments }) {
  if (!payments || payments.length===0) return <div className="card">No payments yet.</div>;
  return (
    <div className="card">
      <h4>Payment history</h4>
      <table className="history">
        <thead><tr><th>Date</th><th>End</th><th>Amount</th><th>Method</th></tr></thead>
        <tbody>
          {payments.map(p=> (
            <tr key={p.id}>
              <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
              <td>{p.paymentEndDate? new Date(p.paymentEndDate).toLocaleDateString(): '-'}</td>
              <td>{p.amount.toFixed(2)}</td>
              <td>{p.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomerDashboard({ customer }) {
  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showPayment, setShowPayment] = useState(false);

  async function load() {
    try {
      const eRes = await fetch(`${API_BASE}/customers/${customer.id}/entries`);
      const pRes = await fetch(`${API_BASE}/customers/${customer.id}/payments`);
      const eData = await eRes.json();
      const pData = await pRes.json();
      setEntries(eData);
      setPayments(pData);
    } catch (err) { console.error(err); }
  }

  useEffect(()=>{ load(); }, [customer.id]);

  const totalKg = entries.reduce((s,x)=>s + Number(x.kgs || 0), 0);
  const gross = entries.reduce((s,x)=>s + Number(x.totalAmount || 0), 0);
  const paid = payments.reduce((s,x)=>s + Number(x.amount || 0), 0);
  const totalCommissionKg = entries.reduce((s,x)=> s + calculateCommissionKg(x.kgs), 0);

  return (
    <div className="dashboard">
      <div className="card summary">
        <h3>{customer.name}</h3>
        <div>Serial: {customer.serial}</div>
        <div>Phone: {customer.phone}</div>
        <hr />
        <div>Total kg: <strong>{totalKg.toFixed(2)}</strong></div>
        <div>Commission (kgs total): <strong>{totalCommissionKg}</strong></div>
        <div>Gross amount: <strong>{gross.toFixed(2)}</strong></div>
        <div>Paid: <strong>{paid.toFixed(2)}</strong></div>
        <div>Remaining: <strong>{(gross - paid).toFixed(2)}</strong></div>
        <div className="actions">
          <button className="btn" onClick={()=>setShowPayment(true)}>Make payment</button>
        </div>
      </div>

      <div className="card">
        <h4>Entries</h4>
        <table className="history">
          <thead><tr><th>Date</th><th>Kgs</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>
            {entries.map(en=> (
              <tr key={en.id}><td>{new Date(en.date).toLocaleDateString()}</td><td>{en.kgs}</td><td>{en.ratePerKg}</td><td>{en.totalAmount}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaymentHistory payments={payments} />

      <EntryForm customerId={customer.id} onAdded={load} />

      {showPayment && <PaymentModal customer={customer} onClose={()=>setShowPayment(false)} onPaid={load} />}
    </div>
  );
}