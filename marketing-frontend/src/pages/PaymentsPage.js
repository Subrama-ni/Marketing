// src/pages/PaymentsPage.js
import React, { useEffect, useState, useCallback } from "react";
import {
  getCustomers,
  getEntriesForPayment,
  makePayment,
  getPaymentHistory,
  updateEntry,
} from "../api";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../App.css";

export default function PaymentsPage({ selectedCustomer, onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [entriesData, setEntriesData] = useState({
    entries: [],
    totals: { totalAmount: 0, totalPaid: 0, remainingOutside: 0 },
  });

  const [scheduledEntries, setScheduledEntries] = useState([]);

  const [payAmount, setPayAmount] = useState(0);
  const [mode, setMode] = useState("cash");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState(new Set());

  // Commission
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [payableAfterCommission, setPayableAfterCommission] = useState(0);

  // Bags
  const [bagCount, setBagCount] = useState(0);
  const [bagAmountPer, setBagAmountPer] = useState(0);
  const [bagTotal, setBagTotal] = useState(0);

  // Already paid (auto only, read-only)
  const [alreadyPaid, setAlreadyPaid] = useState(0);

  // Entry selector
  const [selectedUnpaidIds, setSelectedUnpaidIds] = useState(new Set());

  const toISODate = useCallback((dateStr) => {
    if (!dateStr) return "";
    const parsed = dayjs(dateStr);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
  }, []);

  const formatDateDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr) return "";
    const d = dayjs(dateStr);
    return d.isValid() ? d.format("DD/MM/YYYY") : dateStr;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCustomers();
        setCustomers(res.data || []);
      } catch (e) {
        console.error("❌ Error loading customers:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerId(selectedCustomer.id);
      fetchHistory(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const fetchEntries = async () => {
    if (!customerId) return alert("Select customer");
    if (!fromDate || !toDate) return alert("Select date range");

    try {
      setLoading(true);
      const res = await getEntriesForPayment(
        customerId,
        toISODate(fromDate),
        toISODate(toDate)
      );

      const data = res.data?.entries || [];

      const normalized = data.map((e) => {
        const kgs = Number(e.kgs || 0);
        const rate = Number(e.rate || 0);
        const commission = Number(e.commission || 0);
        const amount = (kgs - commission) * rate;
        const paid = Number(e.paid_amount || 0);
        const remaining = Math.max(amount - paid, 0);

        return {
          ...e,
          entry_date: dayjs(e.entry_date).format("YYYY-MM-DD"),
          kgs,
          rate,
          commission,
          amount,
          paid_amount: paid,
          remaining,
          bags: Number(e.bags || 0),
          item_name: e.item_name || "",
        };
      });

      const blocked = new Set();
      normalized.forEach((e) => {
        if (e.remaining === 0) blocked.add(e.entry_date);
      });

      const totalAmount = normalized.reduce((s, e) => s + e.amount, 0);
      const totalPaid = normalized.reduce(
        (s, e) => s + Math.min(e.paid_amount, e.amount),
        0
      );
      const remainingOutside = Math.max(totalAmount - totalPaid, 0);

      const unpaidEntries = normalized.filter((e) => e.remaining > 0);
      const defaultSelected = new Set(unpaidEntries.map((e) => e.id));

      const totalBagsUnpaid = unpaidEntries.reduce(
        (s, e) => s + Number(e.bags || 0),
        0
      );

      const totalAlreadyPaidUnpaid = unpaidEntries.reduce(
        (s, e) => s + Number(e.paid_amount || 0),
        0
      );

      setBlockedDates(blocked);
      setEntriesData({
        entries: normalized,
        totals: { totalAmount, totalPaid, remainingOutside },
      });

      setScheduledEntries(normalized);
      setSelectedUnpaidIds(defaultSelected);

      setPayableAfterCommission(remainingOutside);
      setPayAmount(remainingOutside);

      setCommissionPercent("");
      setCommissionAmount(0);

      setBagCount(totalBagsUnpaid);
      setBagAmountPer(0);
      setBagTotal(0);

      setAlreadyPaid(totalAlreadyPaidUnpaid); // auto only
    } catch (err) {
      console.error("❌ Fetch entries:", err);
      alert("Error fetching entries");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (cid) => {
    try {
      const res = await getPaymentHistory(cid);
      setHistory(res.data || []);
    } catch (err) {
      console.error("❌ Fetch history:", err);
    }
  };

  // Auto recalc bags & alreadyPaid when unpaid selection changes
  useEffect(() => {
    if (!entriesData.entries?.length) return;
    const unpaidSelected = entriesData.entries.filter(
      (e) => e.remaining > 0 && selectedUnpaidIds.has(e.id)
    );

    const autoBags = unpaidSelected.reduce(
      (s, e) => s + Number(e.bags || 0),
      0
    );
    const autoAlready = unpaidSelected.reduce(
      (s, e) => s + Number(e.paid_amount || 0),
      0
    );

    setBagCount(autoBags);
    setAlreadyPaid(autoAlready);

    const total = autoBags * Number(bagAmountPer || 0);
    setBagTotal(Number(total.toFixed(2)));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnpaidIds, entriesData.entries]);

  // Recalculate final payable (NO alreadyPaid subtraction)
  useEffect(() => {
    const final = Number(payableAfterCommission) + Number(bagTotal);
    setPayAmount(Number(final.toFixed(2)));
  }, [payableAfterCommission, bagTotal]);

  const handleCommissionLoad = () => {
    const remaining = Number(entriesData.totals.remainingOutside || 0);
    const percent = Number(commissionPercent || 0);

    if (percent < 0 || percent > 100)
      return alert("Enter valid percentage (0–100)");

    const commissionValue = (remaining * percent) / 100;
    const payable = Math.max(remaining - commissionValue, 0);

    setCommissionAmount(Number(commissionValue.toFixed(2)));
    setPayableAfterCommission(Number(payable.toFixed(2)));
  };

  const handleBagLoad = () => {
    const total = Number(bagCount) * Number(bagAmountPer || 0);
    setBagTotal(Number(total.toFixed(2)));
  };

  const toggleUnpaidSelection = (id) => {
    setSelectedUnpaidIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllUnpaid = () => {
    const all = entriesData.entries.filter((e) => e.remaining > 0).map((e) => e.id);
    setSelectedUnpaidIds(new Set(all));
  };

  const clearAllUnpaid = () => setSelectedUnpaidIds(new Set());

  const handlePay = async () => {
    if (!customerId) return alert("Select customer");
    if (!fromDate || !toDate) return alert("Select range");
    if (Number(payAmount) <= 0) return alert("Enter valid amount");

    const unpaid = entriesData.entries.filter((e) => e.remaining > 0);
    if (!unpaid.length)
      return alert("All entries in this range are already paid.");

    try {
      setLoading(true);

      const payload = {
        customerId: Number(customerId),
        amount: Number(payAmount),
        paymentMode: mode,
        fromDate: toISODate(fromDate),
        toDate: toISODate(toDate),

        meta: {
          commissionPercent: Number(commissionPercent || 0),
          commissionAmount: Number(commissionAmount || 0),
          bagCount: Number(bagCount || 0),
          bagAmountPer: Number(bagAmountPer || 0),
          bagTotal: Number(bagTotal || 0),

          // NOTE: alreadyPaid NOT included in calculations anymore
          alreadyPaid,
          includedEntryIds: Array.from(selectedUnpaidIds),
        },
      };

      await makePayment(payload);

      // Mark entries as fully paid
      for (const entry of unpaid) {
        const upd = {
          customerId: entry.customer_id,
          entry_date: dayjs(entry.entry_date).format("YYYY-MM-DD"),
          kgs: entry.kgs,
          rate: entry.rate,
          commission: entry.commission,
          item_name: entry.item_name,
          bags: entry.bags,
          paid_amount: entry.amount,
          remaining: 0,
        };
        await updateEntry(entry.id, upd);
      }

      setPayAmount(0);
      setCommissionPercent("");
      setCommissionAmount(0);
      setPayableAfterCommission(0);
      setBagAmountPer(0);
      setBagTotal(0);
      setSelectedUnpaidIds(new Set());

      await fetchHistory(customerId);

      alert("Payment successful!");
      generatePDF();
    } catch (err) {
      console.error("❌ Payment error:", err);
      alert("Error processing payment");
    } finally {
      setLoading(false);
    }
  };

  // PDF Generator (supports Print option)
  const generatePDF = (historyRecord = null, forPrint = false) => {
    const doc = new jsPDF();

    const cust = customers.find((c) => c.id === Number(customerId));
    const cname = cust?.name || "";
    const cphone = cust?.phone || cust?.ph_number || "";

    doc.setFontSize(16);
    doc.text("Payment Receipt", 14, 20);

    doc.setFontSize(12);
    doc.text(`Customer: ${cname}`, 14, 30);
    doc.text(`Phone: ${cphone}`, 14, 36);

    if (historyRecord) {
      doc.text(
        `Period: ${formatDateDDMMYYYY(historyRecord.from_date)} → ${formatDateDDMMYYYY(
          historyRecord.to_date
        )}`,
        14,
        42
      );
      doc.text(`Mode: ${historyRecord.mode}`, 14, 48);
      doc.text(`Amount Paid: ₹${Number(historyRecord.amount).toFixed(2)}`, 14, 56);

      if (forPrint) {
        doc.autoPrint();
        window.open(doc.output("bloburl"));
        return;
      }

      doc.save(`Payment_${cname}_${historyRecord.id}.pdf`);
      return;
    }

    doc.text(
      `Period: ${formatDateDDMMYYYY(fromDate)} → ${formatDateDDMMYYYY(toDate)}`,
      14,
      42
    );
    doc.text(`Mode: ${mode}`, 14, 48);

    const rows = entriesData.entries.map((e) => [
      formatDateDDMMYYYY(e.entry_date),
      e.item_name || "-",
      e.kgs,
      e.rate,
      e.commission,
      e.bags || 0,
      `₹${e.amount.toFixed(2)}`,
      `₹${(e.paid_amount || 0).toFixed(2)}`,
      `₹${(e.remaining || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["Date", "Item", "Kgs", "Rate", "Comm", "Bags", "Amount", "Paid", "Remaining"]],
      body: rows,
      styles: { fontSize: 10 },
    });

    let y = doc.lastAutoTable.finalY + 10;

    doc.text(
      `Range Total: ₹${entriesData.totals.totalAmount.toFixed(2)} | Paid: ₹${entriesData.totals.totalPaid.toFixed(
        2
      )} | Remaining: ₹${entriesData.totals.remainingOutside.toFixed(2)}`,
      14,
      y
    );

    y += 10;

    if (commissionAmount > 0) {
      doc.text(`Commission: ₹${commissionAmount.toFixed(2)}`, 14, y);
      y += 6;
      doc.text(`Payable After Commission: ₹${payableAfterCommission.toFixed(2)}`, 14, y);
      y += 10;
    }

    if (bagTotal > 0) {
      doc.text(
        `Bag Charges (${bagCount} × ₹${bagAmountPer}): ₹${bagTotal.toFixed(2)}`,
        14,
        y
      );
      y += 10;
    }

    doc.setFontSize(14);
    doc.text(`Final Payable: ₹${payAmount.toFixed(2)}`, 14, y + 10);

    if (forPrint) {
      doc.autoPrint();
      window.open(doc.output("bloburl"));
      return;
    }

    doc.save(`Payment_${cname}_${Date.now()}.pdf`);
  };

  const isDateBlocked = (date) => blockedDates.has(date);

  return (
    <div className="col">

      {/* --- SELECTION --- */}
      <div className="card">
        <h2>💰 Payments Page</h2>

        <div className="form-row">
          <label>Customer:</label>
          <select
            className="input"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const c = customers.find((x) => x.id === Number(e.target.value));
              onSelectCustomer?.(c);
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

          <label>From:</label>
          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={(e) => {
              if (isDateBlocked(e.target.value)) {
                alert("This date is already fully paid.");
                return;
              }
              setFromDate(e.target.value);
            }}
          />

          <label>To:</label>
          <input
            className="input"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

          <button className="btn" onClick={fetchEntries} disabled={loading}>
            {loading ? "Loading..." : "Load Entries"}
          </button>
        </div>
      </div>

      {/* --- ENTRIES TABLE --- */}
      {scheduledEntries.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>📋 Entries in Scheduled Range</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="btn" onClick={selectAllUnpaid}>
              Select All Unpaid
            </button>
            <button className="btn ghost" onClick={clearAllUnpaid}>
              Clear Selection
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Include</th>
                <th>Date</th>
                <th>Item</th>
                <th>Kgs</th>
                <th>Rate</th>
                <th>Comm</th>
                <th>Bags</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {scheduledEntries.map((e) => {
                const isUnpaid = e.remaining > 0;
                return (
                  <tr key={e.id}>
                    <td>
                      {isUnpaid ? (
                        <input
                          type="checkbox"
                          checked={selectedUnpaidIds.has(e.id)}
                          onChange={() => toggleUnpaidSelection(e.id)}
                        />
                      ) : (
                        <input type="checkbox" disabled />
                      )}
                    </td>
                    <td>{formatDateDDMMYYYY(e.entry_date)}</td>
                    <td>{e.item_name || "-"}</td>
                    <td>{e.kgs}</td>
                    <td>{e.rate}</td>
                    <td>{e.commission}</td>
                    <td>{e.bags}</td>
                    <td>₹{e.amount.toFixed(2)}</td>
                    <td>₹{e.paid_amount.toFixed(2)}</td>
                    <td>₹{e.remaining.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- COMMISSION --- */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>🏦 Commission</h3>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            className="input"
            placeholder="Commission %"
            type="number"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
          />
          <button className="btn" onClick={handleCommissionLoad}>
            Apply
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <div>Remaining: ₹{entriesData.totals.remainingOutside}</div>
          <div>Commission Amount: ₹{commissionAmount}</div>
          <div>Payable After Commission: ₹{payableAfterCommission}</div>
        </div>
      </div>

      {/* --- BAG SECTION --- */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>🧺 Bag Charges</h3>

        <div style={{ display: "flex", gap: 12 }}>
          <div>
            <label>Bags (auto from unpaid, editable)</label>
            <input
              className="input"
              type="number"
              value={bagCount}
              onChange={(e) => setBagCount(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Amount per Bag</label>
            <input
              className="input"
              type="number"
              value={bagAmountPer}
              onChange={(e) => setBagAmountPer(Number(e.target.value))}
            />
          </div>

          <button className="btn" onClick={handleBagLoad}>
            Calculate
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          Bag Total: ₹{bagTotal}
        </div>
      </div>

      {/* --- ALREADY PAID (DISPLAY ONLY) --- */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>💵 Already Paid (from selected unpaid entries)</h3>

        <input
          className="input"
          type="number"
          value={alreadyPaid.toFixed(2)}
          disabled
          style={{ maxWidth: 220 }}
        />

        <div style={{ fontSize: 13, color: "#777" }}>
          (This is auto extracted from entries. Not included in calculation.)
        </div>
      </div>

      {/* --- PAYMENT CONTROLS --- */}
      <div style={{ marginTop: 16 }} className="card">
        <h3>Final Payment</h3>

        <div style={{ display: "flex", gap: 12 }}>
          <label>Final Payable</label>
          <input
            className="input"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(Number(e.target.value))}
            style={{ maxWidth: 200 }}
          />

          <select
            className="input"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="qr">QR</option>
            <option value="netbanking">Net Banking</option>
            <option value="cheque">Cheque</option>
          </select>

          <button className="btn" onClick={handlePay} disabled={loading}>
            {loading ? "Processing..." : `Pay ₹${payAmount}`}
          </button>

          <button className="btn ghost" onClick={() => generatePDF()}>
            Preview Bill
          </button>
        </div>
      </div>

      {/* --- HISTORY --- */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2>📜 Payment History</h2>

        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Period</th>
              <th>Download</th>
              <th>Print</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 12 }}>
                  No records found
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td>{formatDateDDMMYYYY(h.payment_date)}</td>
                  <td>₹{h.amount}</td>
                  <td>{h.mode}</td>
                  <td>
                    {formatDateDDMMYYYY(h.from_date)} →{" "}
                    {formatDateDDMMYYYY(h.to_date)}
                  </td>
                  <td>
                    <button className="btn ghost" onClick={() => generatePDF(h)}>
                      Download
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn ghost"
                      onClick={() => generatePDF(h, true)}
                    >
                      Print
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
