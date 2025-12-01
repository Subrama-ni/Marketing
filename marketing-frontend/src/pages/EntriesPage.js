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
import { toast, Slide } from "react-toastify";
import { useBillingMode } from "../context/BillingModeContext";

const useQuery = () => new URLSearchParams(useLocation().search);

export default function EntriesPage({ selectedCustomer, onSelectCustomer }) {
  const query = useQuery();
  const { billingMode, setBillingMode } = useBillingMode();

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [customerId, setCustomerId] = useState(selectedCustomer?.id || "");
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

  /** LOAD ALL CUSTOMERS (never filtered here) */
  const loadCustomers = useCallback(async () => {
    try {
      const res = await getCustomers(); // get ALL customers
      setCustomers(res.data || []);
    } catch {
      toast.error("Error loading customers");
    }
  }, []);

  /** FILTER customers based on current billingMode */
  const applyFilter = useCallback(() => {
    const filtered = customers.filter((c) => {
      if (billingMode === "farmer") return true; // all customers allowed
      if (billingMode === "luggage") return true; // all customers allowed
      return true;
    });

    setFilteredCustomers(filtered);
  }, [customers, billingMode]);

  /** LOAD ENTRIES FOR SELECTED CUSTOMER */
  const loadEntries = useCallback(
    async (cid) => {
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
            billingMode === "luggage" ? kgs * rate : (kgs - commission) * rate;

          return {
            ...e,
            amount,
            remaining: Math.max(amount - paid, 0),
            luggage_amount: luggageAmount,
          };
        });

        setEntries(processed);
      } catch {
        toast.error("Error loading entries");
      } finally {
        setLoading(false);
      }
    },
    [billingMode]
  );

  /** INITIAL LOAD */
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  /** Whenever billing mode changes — filter customers */
  useEffect(() => {
    applyFilter();
  }, [customers, billingMode, applyFilter]);

  /** Update Selected Customer */
  useEffect(() => {
    if (customerId) loadEntries(customerId);
    else setEntries([]);
  }, [customerId, billingMode, loadEntries]);

  /** Submit Entry */
  const submit = async (e) => {
    e.preventDefault();

    if (!customerId) return toast.warn("Please select customer");
    if (!form.date || !form.kgs || !form.rate)
      return toast.warn("Date, Kgs, and Rate required");

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
        toast.success("Entry updated!");
      } else {
        await createEntry(payload);
        toast.success("Entry added!");
      }

      loadEntries(customerId);
    } catch (err) {
      toast.error("Error saving entry");
    }
  };

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
            onChange={(e) => {
              setCustomerId(e.target.value);
            }}
          >
            <option value="">-- select customer --</option>
            {filteredCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} • #{c.serial}
              </option>
            ))}
          </select>

          


          {/* DATE */}
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          {/* ITEM NAME */}
          <input
            className="input"
            name="item_name"
            placeholder="Item Name"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
          />

          {/* KGS */}
          <input
            className="input"
            type="number"
            placeholder="Kgs"
            value={form.kgs}
            onChange={(e) => setForm({ ...form, kgs: e.target.value })}
          />

          {/* RATE */}
          <input
            className="input"
            type="number"
            placeholder="Rate"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
          />

          {/* MODE-BASED INPUTS */}
          {billingMode === "farmer" ? (
            <>
              <input
                className="input"
                type="number"
                placeholder="Commission"
                value={form.commission}
                onChange={(e) => setForm({ ...form, commission: e.target.value })}
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
              placeholder="Luggage Amount (₹)"
              value={form.luggage_amount}
              onChange={(e) => setForm({ ...form, luggage_amount: e.target.value })}
            />
          )}

          <input
            className="input"
            type="number"
            placeholder="Already Paid"
            value={form.already_paid}
            onChange={(e) => setForm({ ...form, already_paid: e.target.value })}
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" type="submit">
              {editingId ? "Save Changes" : "Add Entry"}
            </button>
            {editingId && (
              <button className="btn ghost" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Entries — {billingMode === "luggage" ? "Luggage" : "Farmer"}</h2>

        {loading ? (
          <div>Loading entries...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                {billingMode === "luggage" ? <th>Luggage</th> : <th>Bags</th>}
                <th>Kgs</th>
                <th>Rate</th>
                {billingMode === "farmer" && <th>Commission</th>}
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
                  <td colSpan="11" style={{ textAlign: "center" }}>
                    No entries found
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td>{dayjs(e.entry_date).format("DD/MM/YYYY")}</td>
                    <td>{e.item_name || "-"}</td>

                    {billingMode === "luggage" ? (
                      <td>₹{Number(e.luggage_amount || 0).toFixed(2)}</td>
                    ) : (
                      <td>{e.bags || 0}</td>
                    )}

                    <td>{e.kgs}</td>
                    <td>{e.rate}</td>

                    {billingMode === "farmer" && <td>{e.commission}</td>}

                    <td>₹{e.amount.toFixed(2)}</td>
                    <td>₹{Number(e.paid_amount).toFixed(2)}</td>
                    <td>₹{Number(e.already_paid).toFixed(2)}</td>
                    <td>₹{e.remaining.toFixed(2)}</td>

                    <td style={{ display: "flex", gap: 6 }}>
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
