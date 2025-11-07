import React, { useEffect, useState, useCallback } from 'react';
import { 
  getCustomers, 
  getEntriesForPayment, 
  makePayment, 
  getPaymentHistory, 
  updateEntry 
} from '../api';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../App.css';

export default function PaymentsPage({ selectedCustomer, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entriesData, setEntriesData] = useState({
    entries: [],
    totals: { totalAmount: 0, totalPaid: 0, remainingOutside: 0 },
  });
  const [payAmount, setPayAmount] = useState(0);
  const [mode, setMode] = useState('cash');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState(new Set());

  // ✅ Commission-related states
  const [commissionPercent, setCommissionPercent] = useState('');
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [payableAfterCommission, setPayableAfterCommission] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCustomers();
        setCustomers(res.data || []);
      } catch (e) {
        console.error('❌ Error loading customers:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerId(selectedCustomer.id);
      fetchHistory(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const toISODate = useCallback((dateStr) => {
    if (!dateStr) return '';
    const parsed = dayjs(dateStr);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
  }, []);

  const formatDateDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr) return '';
    const d = dayjs(dateStr);
    return d.isValid() ? d.format('DD/MM/YYYY') : dateStr;
  }, []);

  // ✅ Fetch entries
  const fetchEntries = async () => {
    if (!customerId) return alert('Select customer');
    if (!fromDate || !toDate) return alert('Select date range');

    try {
      setLoading(true);
      const res = await getEntriesForPayment(customerId, toISODate(fromDate), toISODate(toDate));
      const data = res.data?.entries || [];

      const normalizedEntries = data.map((e) => {
        const kgs = Number(e.kgs || 0);
        const rate = Number(e.rate || 0);
        const commission = Number(e.commission || 0);
        const amount = (kgs - commission) * rate;
        const paid = Number(e.paid_amount || 0);
        const remaining = Math.max(amount - paid, 0);
        return {
          ...e,
          entry_date: dayjs(e.entry_date).format('YYYY-MM-DD'),
          kgs, rate, commission, amount, paid_amount: paid, remaining,
        };
      });

      const blocked = new Set();
      normalizedEntries.forEach((e) => {
        if (e.remaining === 0) blocked.add(e.entry_date);
      });

      const totalAmount = normalizedEntries.reduce((sum, e) => sum + e.amount, 0);
      const totalPaid = normalizedEntries.reduce(
        (sum, e) => sum + Math.min(e.paid_amount, e.amount),
        0
      );
      const remainingOutside = Math.max(totalAmount - totalPaid, 0);

      setBlockedDates(blocked);
      setEntriesData({ 
        entries: normalizedEntries, 
        totals: { totalAmount, totalPaid, remainingOutside } 
      });
      setPayAmount(remainingOutside.toFixed(2));
      setPayableAfterCommission(remainingOutside.toFixed(2));
      setCommissionPercent('');
      setCommissionAmount(0);
    } catch (err) {
      console.error('❌ Fetch entries error:', err);
      alert('Error fetching entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (cid) => {
    try {
      const res = await getPaymentHistory(cid);
      setHistory(res.data || []);
    } catch (err) {
      console.error('❌ Fetch history error:', err);
    }
  };

  // ✅ Generate PDF Bill
  const generatePDF = (historyRecord = null) => {
    const doc = new jsPDF();
    const customer = customers.find((c) => c.id === Number(customerId));
    const customerName = customer?.name || '';
    const customerPhone = customer?.phone || customer?.ph_number || 'N/A';

    // Header
    doc.setFontSize(16);
    doc.text('Payment Receipt', 14, 20);
    doc.setFontSize(12);
    doc.text(`Customer: ${customerName}`, 14, 30);
    doc.text(`Phone: ${customerPhone}`, 14, 36);

    // If this is a history record (download button)
    if (historyRecord) {
      doc.text(
        `Period: ${formatDateDDMMYYYY(historyRecord.from_date)} → ${formatDateDDMMYYYY(historyRecord.to_date)}`,
        14,
        42
      );
      doc.text(`Mode: ${historyRecord.mode}`, 14, 48);
      doc.text(`Amount Paid: ₹${Number(historyRecord.amount).toFixed(2)}`, 14, 56);
      doc.save(`Payment_${customerName}_${historyRecord.id}.pdf`);
      return;
    }

    // Regular payment PDF generation
    doc.text(`Period: ${formatDateDDMMYYYY(fromDate)} → ${formatDateDDMMYYYY(toDate)}`, 14, 42);
    doc.text(`Mode: ${mode}`, 14, 48);

    // Entries table
    const tableData = entriesData.entries.map((e) => [
      formatDateDDMMYYYY(e.entry_date),
      e.kgs,
      e.rate,
      e.commission,
      `₹${e.amount.toFixed(2)}`,
      `₹${e.paid_amount.toFixed(2)}`,
      `₹${e.remaining.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Date', 'Kgs', 'Rate', 'Comm', 'Amount', 'Paid', 'Remaining']],
      body: tableData,
      styles: { fontSize: 10 },
    });

    const finalY = doc.lastAutoTable.finalY || 85;

    // Totals section
    doc.text(
      `Range Total: ₹${entriesData.totals.totalAmount.toFixed(2)} | Paid: ₹${entriesData.totals.totalPaid.toFixed(2)} | Remaining: ₹${entriesData.totals.remainingOutside.toFixed(2)}`,
      14,
      finalY + 10
    );

    // ✅ Commission section
    if (commissionPercent && commissionAmount > 0) {
      doc.setFontSize(12);
      doc.text('--- Commission Summary ---', 14, finalY + 18);
      doc.setFontSize(11);
      doc.text(`Commission Percentage: ${commissionPercent}%`, 14, finalY + 26);
      doc.text(`Commission Amount: ₹${commissionAmount}`, 14, finalY + 32);
      doc.text(`Payable After Commission: ₹${payableAfterCommission}`, 14, finalY + 38);
    }

    // ✅ Total paid section at bottom
    doc.setFontSize(14);
    doc.text(
      `Total Amount Paid: ₹${Number(payAmount).toFixed(2)}`,
      14,
      (commissionPercent && commissionAmount > 0) ? finalY + 50 : finalY + 20
    );

    doc.save(`Payment_${customerName}_${Date.now()}.pdf`);
  };

  const handlePay = async () => {
  if (!customerId) return alert('Select customer');
  if (!fromDate || !toDate) return alert('Select date range');
  if (Number(payAmount) <= 0) return alert('Enter valid amount');

  const unpaid = entriesData.entries.filter((e) => e.remaining > 0);
  if (!unpaid.length) return alert('All entries in this range are already paid.');

  try {
    setLoading(true);

    const payload = {
      customerId: Number(customerId),
      amount: Number(payAmount),
      paymentMode: mode,
      fromDate: toISODate(fromDate),
      toDate: toISODate(toDate),
    };

    await makePayment(payload);

    // ✅ Permanently update all unpaid entries in the backend
    for (const entry of unpaid) {
      const updatePayload = {
        customerId: entry.customerId,
        entry_date: dayjs(entry.entry_date).format('YYYY-MM-DD'),
        kgs: entry.kgs,
        rate: entry.rate,
        commission: entry.commission,
        paid_amount: entry.amount,   // mark full payment
        remaining: 0,                // permanently zero remaining
      };
      await updateEntry(entry.id, updatePayload);
    }

    // ✅ Update UI after successful backend updates
    setEntriesData((prev) => {
      const updatedEntries = prev.entries.map((e) => ({
        ...e,
        paid_amount: e.amount,
        remaining: 0,
      }));
      return {
        entries: updatedEntries,
        totals: {
          totalAmount: prev.totals.totalAmount,
          totalPaid: prev.totals.totalAmount,
          remainingOutside: 0,
        },
      };
    });

    setPayAmount(0);
    await fetchHistory(customerId);
    alert('✅ Payment successful and entries permanently updated!');
    generatePDF();
  } catch (err) {
    console.error('❌ Payment error:', err);
    alert('Payment failed');
  } finally {
    setLoading(false);
  }
};


  // ✅ Commission calculation
  const handleCommissionLoad = () => {
    const remaining = Number(entriesData.totals.remainingOutside || 0);
    const percent = Number(commissionPercent || 0);
    if (percent < 0 || percent > 100) return alert('Enter valid percentage (0–100)');

    const commissionValue = (remaining * percent) / 100;
    const payable = remaining - commissionValue;
    setCommissionAmount(commissionValue.toFixed(2));
    setPayableAfterCommission(payable.toFixed(2));
    setPayAmount(payable.toFixed(2));
  };

  const isDateBlocked = (date) => blockedDates.has(date);

  return (
    <div className="col">
      <div className="card">
        <h2>Payments</h2>

        {/* Selection */}
        <div className="form-row">
          <select
            className="input"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const cust = customers.find((c) => c.id === Number(e.target.value));
              onSelectCustomer && onSelectCustomer(cust);
              fetchHistory(Number(e.target.value));
            }}
          >
            <option value="">-- select customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} • #{c.serial}
              </option>
            ))}
          </select>

          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={(e) => {
              if (isDateBlocked(e.target.value)) {
                alert('⚠️ This date was fully paid. Add new entries first to unblock.');
                return;
              }
              setFromDate(e.target.value);
            }}
          />
          <input
            className="input"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <button className="btn" onClick={fetchEntries} disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        {/* Entries Table */}
        <div style={{ marginTop: 12 }}>
          <h3>Entries in Selected Range</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Kgs</th>
                <th>Rate</th>
                <th>Comm</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {entriesData.entries.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 12 }}>
                    No entries found
                  </td>
                </tr>
              ) : (
                entriesData.entries.map((e) => (
                  <tr
                    key={e.id}
                    style={{
                      backgroundColor: e.remaining === 0 ? '#eafbea' : 'transparent',
                    }}
                  >
                    <td>{formatDateDDMMYYYY(e.entry_date)}</td>
                    <td>{e.kgs}</td>
                    <td>{e.rate}</td>
                    <td>{e.commission}</td>
                    <td>₹{e.amount.toFixed(2)}</td>
                    <td>₹{e.paid_amount.toFixed(2)}</td>
                    <td>₹{e.remaining.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
            <div>Range Total: ₹{entriesData.totals.totalAmount.toFixed(2)}</div>
            <div>Paid: ₹{entriesData.totals.totalPaid.toFixed(2)}</div>
            <div>Remaining: ₹{entriesData.totals.remainingOutside.toFixed(2)}</div>
          </div>

          {/* ✅ Commission Section */}
          <div
            className="card"
            style={{
              marginTop: 16,
              padding: 12,
              background: '#f8f9fa',
              borderRadius: 8,
            }}
          >
            <h3>Percentage Commission (on Remaining)</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="input"
                type="number"
                placeholder="Enter % commission"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                style={{ maxWidth: '200px' }}
              />
              <button className="btn" onClick={handleCommissionLoad}>
                Load Commission
              </button>
            </div>

            {commissionAmount > 0 && (
              <div style={{ marginTop: 12 }}>
                <div>💰 Remaining Amount: ₹{entriesData.totals.remainingOutside.toFixed(2)}</div>
                <div>🧾 Commission ({commissionPercent}%): ₹{commissionAmount}</div>
                <div>✅ Payable Amount: <strong>₹{payableAfterCommission}</strong></div>
              </div>
            )}
          </div>

          {/* Payment Controls */}
          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
            <input
              className="input"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="qr">QR</option>
              <option value="netbanking">NetBanking</option>
              <option value="check">Cheque</option>
            </select>
            <button className="btn" onClick={handlePay} disabled={loading}>
              {loading ? 'Processing...' : `Pay ₹${Number(payAmount).toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Payment History</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Period</th>
              <th>Bill</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 12 }}>
                  No payments
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td>{formatDateDDMMYYYY(h.payment_date || h.date)}</td>
                  <td>₹{Number(h.amount).toFixed(2)}</td>
                  <td>{h.mode}</td>
                  <td>
                    {formatDateDDMMYYYY(h.from_date)} → {formatDateDDMMYYYY(h.to_date)}
                  </td>
                  <td>
                    <button className="btn ghost" onClick={() => generatePDF(h)}>
                      Download
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
