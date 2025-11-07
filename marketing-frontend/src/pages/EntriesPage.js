import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs"; // ✅ Import dayjs for date formatting
import {
  getCustomers,
  createEntry,
  getEntriesByCustomer,
  deleteEntry,
  updateEntry,
} from "../api";

/** ✅ Helper to read ?customerId= from URL */
const useQuery = () => new URLSearchParams(useLocation().search);

export default function EntriesPage({ selectedCustomer, onSelectCustomer }) {
  const query = useQuery();
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || "");
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ date: "", kgs: "", rate: "", commission: "" });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ✅ Load customers initially
  useEffect(() => {
    loadCustomers();
  }, []);

  // ✅ Sync selected customer
  useEffect(() => {
    if (selectedCustomer) setCustomerId(selectedCustomer.id);
  }, [selectedCustomer]);

  // ✅ Handle ?customerId= from URL
  useEffect(() => {
    const urlCustomerId = query.get("customerId");
    if (urlCustomerId && urlCustomerId !== customerId) {
      setCustomerId(urlCustomerId);
    }
  }, [query]);

  // ✅ Load entries when customer changes
  useEffect(() => {
    if (customerId) loadEntries(customerId);
    else setEntries([]);
  }, [customerId]);

  /** ✅ Fetch customers */
  const loadCustomers = async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data || []);
    } catch (e) {
      console.error("❌ Error fetching customers:", e);
    }
  };

  /** ✅ Fetch entries */
  const loadEntries = async (cid) => {
    try {
      setLoading(true);
      const res = await getEntriesByCustomer(cid);
      const data = res.data || [];

      // 🧮 Correct formula (kgs - commission) * rate
      const processed = data.map((e) => {
        const kgs = Number(e.kgs || 0);
        const rate = Number(e.rate || 0);
        const commission = Number(e.commission || 0);
        const paid = Number(e.paid_amount || 0);
        const amount = (kgs - commission) * rate;
        return { ...e, amount, remaining: Math.max(amount - paid, 0) };
      });

      setEntries(processed);
    } catch (e) {
      console.error("❌ Error loading entries:", e);
    } finally {
      setLoading(false);
    }
  };

  /** ✅ Add or Update entry */
  const submit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert("Please select a customer");
    if (!form.date || !form.kgs || !form.rate)
      return alert("Date, Kgs, and Rate are required");

    const payload = {
      customerId: Number(customerId),
      // ✅ Ensure correct date format (no timezone shift)
      entry_date: dayjs(form.date).format("YYYY-MM-DD"),
      kgs: Number(form.kgs),
      rate: Number(form.rate),
      commission: Number(form.commission || 0),
    };

    try {
      if (editingId) {
        await updateEntry(editingId, payload);
        alert("✅ Entry updated successfully!");
      } else {
        await createEntry(payload);
        alert("✅ Entry added successfully!");
      }
      setForm({ date: "", kgs: "", rate: "", commission: "" });
      setEditingId(null);
      loadEntries(customerId);
    } catch (err) {
      alert(err.response?.data?.message || "Error saving entry");
    }
  };

  /** ✅ Start editing */
  const handleEdit = (entry) => {
    setEditingId(entry.id);

    // ✅ Fix timezone issue (use dayjs instead of new Date)
    const localDate = dayjs(entry.entry_date).format("YYYY-MM-DD");

    setForm({
      date: localDate,
      kgs: entry.kgs,
      rate: entry.rate,
      commission: entry.commission,
    });
  };

  /** ✅ Cancel editing */
  const handleCancel = () => {
    setEditingId(null);
    setForm({ date: "", kgs: "", rate: "", commission: "" });
  };

  /** ✅ Delete entry */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry(id);
      alert("🗑️ Entry deleted");
      loadEntries(customerId);
    } catch (err) {
      alert("Error deleting entry");
    }
  };

  return (
    <div className="col">
      <div className="card">
        <h2>{editingId ? "Edit Entry" : "Add / Manage Entries"}</h2>

        {/* 🔹 Entry Form */}
        <form className="form-row" onSubmit={submit}>
          <select
            className="input"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const selected = customers.find(
                (c) => c.id === Number(e.target.value)
              );
              onSelectCustomer && onSelectCustomer(selected);
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
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            className="input"
            placeholder="Kgs"
            type="number"
            value={form.kgs}
            onChange={(e) => setForm({ ...form, kgs: e.target.value })}
          />
          <input
            className="input"
            placeholder="Rate"
            type="number"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
          />
          <input
            className="input"
            placeholder="Commission"
            type="number"
            value={form.commission}
            onChange={(e) => setForm({ ...form, commission: e.target.value })}
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" type="submit">
              {editingId ? "Save Changes" : "Add"}
            </button>
            {editingId && (
              <button type="button" className="btn ghost" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 🔹 Entries Table */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Entries</h2>

        {loading ? (
          <div style={{ padding: 12 }}>Loading entries...</div>
        ) : (
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: 12, textAlign: "center" }}>
                    No entries found
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td>{dayjs(e.entry_date).format("DD/MM/YYYY")}</td>
                    <td>{e.kgs}</td>
                    <td>{e.rate}</td>
                    <td>{e.commission}</td>
                    <td>₹{e.amount.toFixed(2)}</td>
                    <td>₹{e.paid_amount || 0}</td>
                    <td>₹{e.remaining.toFixed(2)}</td>
                    <td style={{ display: "flex", gap: "6px" }}>
                      <button className="btn ghost" onClick={() => handleEdit(e)}>
                        Edit
                      </button>
                      <button className="btn ghost" onClick={() => handleDelete(e.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
