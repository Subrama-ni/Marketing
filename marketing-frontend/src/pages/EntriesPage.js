import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  getCustomers,
  createEntry,
  getEntriesByCustomer,
  deleteEntry,
  updateEntry,
} from "../api";
import { toast, Slide } from "react-toastify";

const useQuery = () => new URLSearchParams(useLocation().search);

export default function EntriesPage({ selectedCustomer, onSelectCustomer }) {
  const query = useQuery();
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || "");
  const [entries, setEntries] = useState([]);

  // form state (includes paid_amount)
  const [form, setForm] = useState({
    date: "",
    kgs: "",
    rate: "",
    commission: "",
    item_name: "",
    bags: "",
    paid_amount: "",
  });

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // load customers (useCallback to satisfy lint)
  const loadCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data || []);
    } catch (e) {
      console.error("❌ Error fetching customers:", e);
      toast.error("Error loading customers", { position: "top-right", transition: Slide });
    }
  }, []);

  // load entries by customer (useCallback)
  const loadEntries = useCallback(
    async (cid) => {
      try {
        setLoading(true);
        const res = await getEntriesByCustomer(cid);
        const data = res.data || [];
        // allow negative remaining: remaining = amount - paid
        const processed = data.map((e) => {
          const kgs = Number(e.kgs || 0);
          const rate = Number(e.rate || 0);
          const commission = Number(e.commission || 0);
          const paid = Number(e.paid_amount || 0);
          const amount = (kgs - commission) * rate;
          const remaining = Number(amount - paid); // allow negative
          return { ...e, amount, remaining, kgs, rate, commission };
        });
        setEntries(processed);
      } catch (e) {
        console.error("❌ Error loading entries:", e);
        toast.error("Error loading entries", { position: "top-right", transition: Slide });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // initial load of customers
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // when parent changes selectedCustomer
  useEffect(() => {
    if (selectedCustomer) setCustomerId(selectedCustomer.id);
  }, [selectedCustomer]);

  // read customerId from URL param if provided
  useEffect(() => {
    const urlCustomerId = query.get("customerId");
    if (urlCustomerId && urlCustomerId !== customerId) {
      setCustomerId(urlCustomerId);
    }
  }, [query, customerId]);

  // load entries when customerId changes
  useEffect(() => {
    if (customerId) loadEntries(customerId);
    else setEntries([]);
  }, [customerId, loadEntries]);

  const submit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.warn("Please select a customer", { position: "top-right", transition: Slide });
      return;
    }
    if (!form.date || !form.kgs || !form.rate) {
      toast.warn("Date, Kgs, and Rate are required", { position: "top-right", transition: Slide });
      return;
    }

    const payload = {
      customerId: Number(customerId),
      entry_date: dayjs(form.date).format("YYYY-MM-DD"),
      kgs: Number(form.kgs),
      rate: Number(form.rate),
      commission: Number(form.commission || 0),
      item_name: form.item_name || "",
      bags: Number(form.bags || 0),
      paid_amount: Number(form.paid_amount || 0),
    };

    try {
      if (editingId) {
        await updateEntry(editingId, payload);
        toast.success("Entry updated successfully!", { position: "top-right", transition: Slide });
      } else {
        await createEntry(payload);
        toast.success("Entry added successfully!", { position: "top-right", transition: Slide });
      }

      setForm({
        date: "",
        kgs: "",
        rate: "",
        commission: "",
        item_name: "",
        bags: "",
        paid_amount: "",
      });
      setEditingId(null);
      // reload entries
      await loadEntries(customerId);
    } catch (err) {
      console.error("Error saving entry", err);
      const msg = err?.response?.data?.message || "Error saving entry";
      toast.error(msg, { position: "top-right", transition: Slide });
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    const localDate = dayjs(entry.entry_date).format("YYYY-MM-DD");
    setForm({
      date: localDate,
      kgs: entry.kgs,
      rate: entry.rate,
      commission: entry.commission,
      item_name: entry.item_name || "",
      bags: entry.bags || "",
      paid_amount: entry.paid_amount || "",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      date: "",
      kgs: "",
      rate: "",
      commission: "",
      item_name: "",
      bags: "",
      paid_amount: "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry(id);
      toast.success("Entry deleted", { position: "top-right", transition: Slide });
      await loadEntries(customerId);
    } catch (err) {
      console.error("Error deleting entry", err);
      toast.error("Error deleting entry", { position: "top-right", transition: Slide });
    }
  };

  return (
    <div className="col">
      <div className="card">
        <h2>{editingId ? "Edit Entry" : "Add / Manage Entries"}</h2>

        <form className="form-row" onSubmit={submit}>
          <select
            className="input"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const selected = customers.find((c) => c.id === Number(e.target.value));
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
            placeholder="Item Name"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
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

          <input
            className="input"
            placeholder="Bags"
            type="number"
            value={form.bags}
            onChange={(e) => setForm({ ...form, bags: e.target.value })}
          />

          {/* Paid amount (optional) */}
          <input
            className="input"
            placeholder="Paid Amount (optional)"
            type="number"
            value={form.paid_amount}
            onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" type="submit">
              {editingId ? "Save Changes" : "Add Entry"}
            </button>
            {editingId && (
              <button type="button" className="btn ghost" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h2>Entries</h2>

        {loading ? (
          <div style={{ padding: 12 }}>Loading entries...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Bags</th>
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
                  <td colSpan="10" style={{ textAlign: "center", padding: 12 }}>
                    No entries found
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td>{dayjs(e.entry_date).format("DD/MM/YYYY")}</td>
                    <td>{e.item_name || "-"}</td>
                    <td>{e.bags || 0}</td>
                    <td>{e.kgs}</td>
                    <td>{e.rate}</td>
                    <td>{e.commission}</td>
                    <td>₹{Number(e.amount || 0).toFixed(2)}</td>
                    <td>₹{Number(e.paid_amount || 0).toFixed(2)}</td>
                    <td>₹{Number(e.remaining || 0).toFixed(2)}</td>

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
