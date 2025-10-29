import React, { useEffect, useState } from 'react';
import { getCustomers, getEntriesForPayment, makePayment, getPaymentHistory } from '../api';
import dayjs from 'dayjs';
import './DashboardPage.css';

export default function PaymentsPage({ selectedCustomer: initialSelectedCustomer, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(initialSelectedCustomer || null);
  const [customerId, setCustomerId] = useState(initialSelectedCustomer?.id || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entriesData, setEntriesData] = useState({ entries: [], totals: { totalAmount:0, totalPaid:0, remainingOutside:0 }});
  const [payAmount, setPayAmount] = useState(0);
  const [mode, setMode] = useState('cash');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadCustomers(); }, []);
  useEffect(() => {
    if (initialSelectedCustomer) {
      setSelectedCustomer(initialSelectedCustomer);
      setCustomerId(initialSelectedCustomer.id);
      fetchHistory(initialSelectedCustomer.id);
    }
  }, [initialSelectedCustomer]);

  const loadCustomers = async () => {
    try {
      const res = await getCustomers();
      const customerList = res.data || [];
      setCustomers(customerList);
      if (!selectedCustomer && customerList.length > 0) {
        setSelectedCustomer(customerList[0]);
        setCustomerId(customerList[0].id);
        fetchHistory(customerList[0].id);
        onSelectCustomer && onSelectCustomer(customerList[0]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchEntries = async () => {
    if (!customerId) return alert('Select customer');
    if (!fromDate || !toDate) return alert('Select date range');
    try {
      setLoading(true);
      const res = await getEntriesForPayment(customerId, fromDate, toDate);
      const payload = res.data;
      if (payload.entries) {
        setEntriesData(payload);
        const balance = payload.totals.totalAmount - payload.totals.totalPaid;
        setPayAmount(balance > 0 ? balance.toFixed(2) : 0);
      } else {
        setEntriesData({ entries: [], totals:{ totalAmount:0, totalPaid:0, remainingOutside:0 }});
        setPayAmount(0);
      }
    } catch (err) { alert(err.response?.data?.message || 'Error fetching entries'); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (cid) => {
    if (!cid) { setHistory([]); return; }
    try { const res = await getPaymentHistory(cid); setHistory(res.data || []); } 
    catch (err) { console.error(err); }
  };

  const handlePay = async () => {
    if (!customerId || !fromDate || !toDate || !payAmount) return alert('Enter all fields');
    try {
      setLoading(true);
      const payload = { customerId:Number(customerId), amount:Number(payAmount), paymentMode:mode, fromDate, toDate };
      const res = await makePayment(payload);
      if (res.data?.pdfUrl) window.open(res.data.pdfUrl, '_blank');
      await fetchEntries();
      await fetchHistory(customerId);
    } catch (err) { alert(err.response?.data?.message || 'Payment failed'); }
    finally { setLoading(false); }
  };

  const formatDD = d => d ? dayjs(d).format('DD/MM/YYYY') : '';

  return (
    <div className="dashboard-container">
      <div className="card">
        <h2>Payments</h2>
        <div className="form-row" style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
          <select className="input" value={customerId} onChange={e => { const cid = Number(e.target.value); setCustomerId(cid); const cust = customers.find(c=>c.id===cid); setSelectedCustomer(cust); onSelectCustomer && onSelectCustomer(cust); fetchHistory(cid); }}>
            <option value="">-- select customer --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} • #{c.serial}</option>)}
          </select>
          <input className="input" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
          <input className="input" type="date" value={toDate} onChange={e=>setToDate(e.target.value)} />
          <button className="btn ghost" onClick={fetchEntries} disabled={loading}>{loading?'Loading...':'Load'}</button>
        </div>

        <table className="table">
          <thead><tr><th>Date</th><th>Kgs</th><th>Rate</th><th>Comm</th><th>Amount</th><th>Paid</th><th>Remaining</th></tr></thead>
          <tbody>
            {entriesData.entries.length===0 ? <tr><td colSpan="7" style={{padding:12}}>No entries</td></tr> :
              entriesData.entries.map(e => (
                <tr key={e.id}>
                  <td>{formatDD(e.entry_date)}</td>
                  <td>{Number(e.kgs)}</td>
                  <td>{Number(e.rate)}</td>
                  <td>{Number(e.commission)}</td>
                  <td>{Number(e.amount).toFixed(2)}</td>
                  <td>{Number(e.paid_amount).toFixed(2)}</td>
                  <td>{(Number(e.amount)-Number(e.paid_amount)).toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <div style={{marginTop:12, display:'flex', gap:12, flexWrap:'wrap'}}>
          <input className="input" type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} />
          <select className="input" value={mode} onChange={e=>setMode(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="qr">QR</option>
            <option value="upi">UPI</option>
            <option value="netbanking">NetBanking</option>
            <option value="check">Check</option>
          </select>
          <button className="btn ghost" onClick={handlePay}>{loading?'Processing...':`Pay ₹${Number(payAmount).toFixed(2)}`}</button>
        </div>

        <h3 style={{marginTop:16}}>Payment History</h3>
        <table className="table">
          <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Period</th><th>Bill</th></tr></thead>
          <tbody>
            {history.length===0 ? <tr><td colSpan="5" style={{padding:12}}>No payments</td></tr> :
              history.map(h => (
                <tr key={h.id}>
                  <td>{dayjs(h.payment_date).format('DD/MM/YYYY HH:mm')}</td>
                  <td>{Number(h.amount).toFixed(2)}</td>
                  <td>{h.mode}</td>
                  <td>{dayjs(h.from_date).format('DD/MM/YYYY')} → {dayjs(h.to_date).format('DD/MM/YYYY')}</td>
                  <td><a href={`/bills/bill_${h.id}.pdf`} target="_blank" rel="noreferrer">Download</a></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
