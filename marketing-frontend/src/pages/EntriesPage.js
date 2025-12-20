// src/pages/EntriesPage.js
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
import { toast } from "react-toastify";
import { useBillingMode } from "../context/BillingModeContext";

/* ---------------------------------------
   SAFE QUERY HELPER (FIXES CRASH)
--------------------------------------- */
function useQuery() {
  const location = useLocation();
  return new URLSearchParams(location.search || "");
}

export default function EntriesPage({ selectedCustomer }) {
  useQuery(); // kept for backward compatibility

  const { billingMode, setBillingMode } = useBillingMode();

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [customerId, setCustomerId] = useState(
    selectedCustomer?.id ? String(selectedCustomer.id) : ""
  );
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    date: "",
    kgs: "",
    rate: "",
    commission: "",
    item_name: "",
    bags: "",
    already_paid: "",
    luggage_amount: "",
  });

  /* ---------------------------------------
     LOAD CUSTOMERS
  --------------------------------------- */
  const loadCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data || []);
    } catch {
      toast.error("Failed to load customers");
    }
  }, []);

  /* ---------------------------------------
     APPLY BILLING MODE FILTER
  --------------------------------------- */
  useEffect(() => {
    setFilteredCustomers(customers);
  }, [customers, billingMode]);

  /* ---------------------------------------
     LOAD ENTRIES FOR CUSTOMER
  --------------------------------------- */
  const loadEntries = useCallback(
    async (cid) => {
      if (!cid) {
        setEntries([]);
        return;
      }

      try {
        setLoading(true);
        const res = await getEntriesByCustomer(cid, billingMode);
        const list = res.data || [];

        const processed = list.map((e) => {
          const kgs = Number(e.kgs || 0);
          const rate = Number(e.rate || 0);
          const commission = Number(e.commission || 0);
          const paid = Number(e.paid_amount || 0);
          const luggageAmount = Number(e.luggage_amount || 0);

          const amount =
            billingMode === "luggage"
              ? luggageAmount
              : (kgs - commission) * rate;

          return {
            ...e,
            amount,
            remaining: Math.max(amount - paid, 0),
          };
        });

        setEntries(processed);
      } catch {
        toast.error("Failed to load entries");
      } finally {
        setLoading(false);
      }
    },
    [billingMode]
  );

  /* ---------------------------------------
     INITIAL LOAD
  --------------------------------------- */
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  /* ---------------------------------------
     CUSTOMER / MODE CHANGE
  --------------------------------------- */
  useEffect(() => {
    loadEntries(customerId);
  }, [customerId, billingMode, loadEntries]);

  /* ---------------------------------------
     FORM SUBMIT
  --------------------------------------- */
  const submit = async (e) => {
    e.preventDefault();

    if (!customerId) return toast.warn("Select a customer");
    if (!form.date || !form.kgs || !form.rate)
      return toast.warn("Date, Kgs and Rate are required");

    const payload = {
      customerId: Number(customerId),
      entry_date: dayjs(form.date).format("YYYY-MM-DD"),
      kgs: Number(form.kgs),
      rate: Number(form.rate),
      item_name: form.item_name || "",
      already_paid: Number(form.already_paid || 0),
      billing_type: billingMode,
    };

    if (billingMode === "farmer") {
      payload.commission = Number(form.commission || 0);
      payload.bags = Number(form.bags || 0);
    } else {
      payload.luggage_amount = Number(form.luggage_amount || 0);
      payload.commission = 0;
      payload.bags = 0;
    }

    try {
      if (editingId) {
        await updateEntry(editingId, payload);
        toast.success("Entry updated");
      } else {
        await createEntry(payload);
        toast.success("Entry added");
      }

      handleCancel();
      loadEntries(customerId);
    } catch {
      toast.error("Failed to save entry");
    }
  };

  /* ---------------------------------------
     EDIT ENTRY
  --------------------------------------- */
  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      date: dayjs(entry.entry_date).format("YYYY-MM-DD"),
      kgs: entry.kgs || "",
      rate: entry.rate || "",
      commission: entry.commission || "",
      item_name: entry.item_name || "",
      bags: entry.bags || "",
      already_paid: entry.already_paid || "",
      luggage_amount: entry.luggage_amount || "",
    });
  };

  /* ---------------------------------------
     DELETE ENTRY
  --------------------------------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await deleteEntry(id);
      toast.success("Entry deleted");
      loadEntries(customerId);
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  /* ---------------------------------------
     CANCEL EDIT
  --------------------------------------- */
  const handleCancel = () => {
    setEditingId(null);
    setForm({
      date: "",
      kgs: "",
      rate: "",
      commission: "",
      item_name: "",
      bags: "",
      already_paid: "",
      luggage_amount: "",
    });
  };

  /* ---------------------------------------
     UI
  --------------------------------------- */
  return (
    <div className="col">
      <div className="card">
        <h2>Add / Manage Entries</h2>

        <label>Billing Mode:</label>
        <select
          className="input"
          value={billingMode}
          onChange={(e) => setBillingMode(e.target.value)}
        >
          <option value="farmer">Farmer</option>
          <option value="luggage">Luggage</option>
        </select>

        <form className="form-row" onSubmit={submit}>
          <select
            className="input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">-- select customer --</option>
            {filteredCustomers.map((c) => (
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
            type="number"
            placeholder="Kgs"
            value={form.kgs}
            onChange={(e) => setForm({ ...form, kgs: e.target.value })}
          />

          <input
            className="input"
            type="number"
            placeholder="Rate"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
          />

          {billingMode === "farmer" ? (
            <>
              <input
                className="input"
                type="number"
                placeholder="Commission"
                value={form.commission}
                onChange={(e) =>
                  setForm({ ...form, commission: e.target.value })
                }
              />
              <input
                className="input"
                type="number"
                placeholder="Bags"
                value={form.bags}
                onChange={(e) => setForm({ ...form, bags: e.target.value })}
              />
            </>
          ) : (
            <input
              className="input"
              type="number"
              placeholder="Luggage Amount"
              value={form.luggage_amount}
              onChange={(e) =>
                setForm({ ...form, luggage_amount: e.target.value })
              }
            />
          )}

          <input
            className="input"
            type="number"
            placeholder="Already Paid"
            value={form.already_paid}
            onChange={(e) =>
              setForm({ ...form, already_paid: e.target.value })
            }
          />

          <button className="btn" type="submit">
            {editingId ? "Save Changes" : "Add Entry"}
          </button>

          {editingId && (
            <button className="btn ghost" type="button" onClick={handleCancel}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h2>Entries</h2>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Kgs</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No entries found
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td>{dayjs(e.entry_date).format("DD/MM/YYYY")}</td>
                    <td>{e.item_name || "-"}</td>
                    <td>{e.kgs}</td>
                    <td>{e.rate}</td>
                    <td>₹{e.amount.toFixed(2)}</td>
                    <td>₹{Number(e.paid_amount || 0).toFixed(2)}</td>
                    <td>₹{e.remaining.toFixed(2)}</td>
                    <td>
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
