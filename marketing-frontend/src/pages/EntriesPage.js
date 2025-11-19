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

  const [form, setForm] = useState({
    date: "",
    kgs: "",
    rate: "",
    commission: "",
    item_name: "",
    bags: "",
    paid_amount: "",
    already_paid: "",
  });

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  /** Load Customers */
  const loadCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data || []);
    } catch (e) {
      toast.error("Error loading customers", { transition: Slide });
    }
  }, []);

  /** Load Entries */
  const loadEntries = useCallback(async (cid) => {
    try {
      setLoading(true);
      const res = await getEntriesByCustomer(cid);
      const data = res.data || [];

      const processed = data.map((e) => {
        const kgs = Number(e.kgs || 0);
        const rate = Number(e.rate || 0);
        const commission = Number(e.commission || 0);
        const paid = Number(e.paid_amount || 0);
        const amount = (kgs - commission) * rate;
        const remaining = Math.max(amount - paid, 0);

        return { ...e, amount, remaining };
      });

      setEntries(processed);
    } catch (e) {
      toast.error("Error loading entries", { transition: Slide });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (selectedCustomer) setCustomerId(selectedCustomer.id);
  }, [selectedCustomer]);

  useEffect(() => {
    const cid = query.get("customerId");
    if (cid && cid !== customerId) {
      setCustomerId(cid);
    }
  }, [query, customerId]);

  useEffect(() => {
    if (customerId) loadEntries(customerId);
    else setEntries([]);
  }, [customerId, loadEntries]);

  /** Submit Entry */
  const submit = async (e) => {
    e.preventDefault();
    if (!customerId) return toast.warn("Please select a customer");

    if (!form.date || !form.kgs || !form.rate) {
      return toast.warn("Date, Kgs, and Rate are required");
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
      already_paid: Number(form.already_paid || 0),
    };

    try {
      if (editingId) {
        await updateEntry(editingId, payload);
        toast.success("Entry updated!");
      } else {
        await createEntry(payload);
        toast.success("Entry added!");
      }

      setForm({
        date: "",
        kgs: "",
        rate: "",
        commission: "",
        item_name: "",
        bags: "",
        paid_amount: "",
        already_paid: "",
      });

      setEditingId(null);
      loadEntries(customerId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error saving entry");
    }
  };

  /** Edit */
  const handleEdit = (entry) => {
    setEditingId(entry.id);

    setForm({
      date: dayjs(entry.entry_date).format("YYYY-MM-DD"),
      kgs: entry.kgs,
      rate: entry.rate,
      commission: entry.commission,
      item_name: entry.item_name || "",
      bags: entry.bags || "",
      paid_amount: entry.paid_amount || "",
      already_paid: entry.already_paid || "",
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
      already_paid: "",
    });
  };

  /** Delete */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await deleteEntry(id);
      toast.success("Entry deleted");
      loadEntries(customerId);
    } catch {
      toast.error("Error deleting entry");
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
            type="text"
            name="item_name"
            placeholder="Item Name"
            value={form.item_name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
            }
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
            onChange={(e) =>
              setForm({ ...form, commission: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Bags"
            type="number"
            value={form.bags}
            onChange={(e) => setForm({ ...form, bags: e.target.value })}
          />

          <input
            className="input"
            placeholder="Paid Amount"
            type="number"
            value={form.paid_amount}
            onChange={(e) =>
              setForm({ ...form, paid_amount: e.target.value })
            }
          />

          {/* NEW FIELD */}
          <input
            className="input"
            placeholder="Already Paid"
            type="number"
            value={form.already_paid}
            onChange={(e) =>
              setForm({ ...form, already_paid: e.target.value })
            }
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" type="submit">
              {editingId ? "Save Changes" : "Add Entry"}
            </button>

            {editingId && (
              <button
                type="button"
                className="btn ghost"
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLE */}
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
                <th>Already Paid</th>
                <th>Remaining</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ padding: 12, textAlign: "center" }}>
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
                    <td>₹{Number(e.amount).toFixed(2)}</td>
                    <td>₹{Number(e.paid_amount).toFixed(2)}</td>

                    {/* NEW FIELD */}
                    <td>₹{Number(e.already_paid || 0).toFixed(2)}</td>

                    <td>₹{Number(e.remaining).toFixed(2)}</td>

                    <td style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="btn ghost"
                        onClick={() => handleEdit(e)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => handleDelete(e.id)}
                      >
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
