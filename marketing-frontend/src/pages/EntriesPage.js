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
import { useBillingMode } from "../context/BillingModeContext"; // <- use context

const useQuery = () => new URLSearchParams(useLocation().search);
const ONLY_SHOW_CUSTOMERS_WITH_ENTRIES = false;

export default function EntriesPage({ selectedCustomer, onSelectCustomer }) {
  const query = useQuery();
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || "");
  const [entries, setEntries] = useState([]);

  // billing mode comes from shared context
  const { billingMode, setBillingMode } = useBillingMode();

  const [form, setForm] = useState({
    date: "",
    kgs: "",
    rate: "",
    commission: "",
    item_name: "",
    bags: "",
    already_paid: "",
    // luggage-specific
    luggage_amount: "",
  });

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // When true the page will only list customers that have entries for the selected billingMode.
  // If you want to allow selecting any customer even when they don't have entries in the selected mode,
  // set this to false.

  /** Load Customers (filtered by billingMode when ONLY_SHOW_CUSTOMERS_WITH_ENTRIES is true) */
  const loadCustomers = useCallback(
    async (mode = billingMode) => {
      try {
        const res = await getCustomers();
        const all = res.data || [];

        if (!ONLY_SHOW_CUSTOMERS_WITH_ENTRIES) {
          setCustomers(all);
          return;
        }

        // For each customer check if they have at least one entry in the current billingMode.
        // We call getEntriesByCustomer(customerId, billingMode) — the API supports billingType param.
        const checks = await Promise.all(
          all.map(async (c) => {
            try {
              const r = await getEntriesByCustomer(c.id, mode);
              const entriesForMode = r.data || [];
              return { customer: c, hasEntries: entriesForMode.length > 0 };
            } catch (err) {
              // if API fails for a customer, treat as no entries (don't block UI)
              return { customer: c, hasEntries: false };
            }
          })
        );

        const filtered = checks.filter((x) => x.hasEntries).map((x) => x.customer);

        setCustomers(filtered);
      } catch (e) {
        toast.error("Error loading customers", { transition: Slide });
      }
    },
    [billingMode]
  );

  /** Load Entries */
  const loadEntries = useCallback(
    async (cid) => {
      try {
        setLoading(true);
        const res = await getEntriesByCustomer(cid, billingMode); // pass billingType
        const data = res.data || [];

        const processed = data.map((e) => {
          const kgs = Number(e.kgs || 0);
          const rate = Number(e.rate || 0);
          const commission = Number(e.commission || 0);
          const paid = Number(e.paid_amount || 0);
          const luggageAmount = Number(e.luggage_amount || 0);

          const amount =
            billingMode === "luggage" ? kgs * rate : (kgs - commission) * rate;
          const remaining = Math.max(amount - paid, 0);

          return {
            ...e,
            amount,
            remaining,
            kgs,
            rate,
            commission,
            luggage_amount: luggageAmount,
          };
        });

        setEntries(processed);
      } catch (e) {
        toast.error("Error loading entries", { transition: Slide });
      } finally {
        setLoading(false);
      }
    },
    [billingMode]
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // reload filtered customers whenever billingMode changes
  useEffect(() => {
    loadCustomers(billingMode);
    // If the currently selected customer does not belong to the new filtered list, clear selection.
    // This prevents showing customers from the other mode after a mode switch.
    setCustomerId((curId) => {
      if (!curId) return curId;
      // will check after customers update in the next effect — so do nothing here.
      return curId;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingMode]);

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
    // persist billing mode in localStorage for backward compatibility
    localStorage.setItem("billingMode", billingMode);

    // if current customer is not in filtered customers, clear it
    if (ONLY_SHOW_CUSTOMERS_WITH_ENTRIES && customerId) {
      const found = customers.find((c) => Number(c.id) === Number(customerId));
      if (!found) {
        setCustomerId("");
        setEntries([]);
        return;
      }
    }

    if (customerId) loadEntries(customerId);
    else setEntries([]);
  }, [customerId, billingMode, loadEntries, customers]);

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
      item_name: form.item_name || "",
      already_paid: Number(form.already_paid || 0),
      billing_type: billingMode,
    };

    if (billingMode === "farmer") {
      payload.commission = Number(form.commission || 0);
      payload.bags = Number(form.bags || 0);
    } else {
      // luggage mode
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

      setEditingId(null);
      // reload customers & entries (new entry may make the customer appear in filtered list)
      await loadCustomers(billingMode);
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
      already_paid: entry.already_paid || "",
      luggage_amount: entry.luggage_amount || "",
    });

    // switch shared billingMode to match entry while editing
    if (entry.billing_type) setBillingMode(entry.billing_type);
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
      already_paid: "",
      luggage_amount: "",
    });
  };

  /** Delete */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await deleteEntry(id);
      toast.success("Entry deleted");
      loadEntries(customerId);
      // if deleting last entry for the customer in this mode, reload customer list
      await loadCustomers(billingMode);
    } catch {
      toast.error("Error deleting entry");
    }
  };

  return (
    <div className="col">
      <div className="card">
        <h2>{editingId ? "Edit Entry" : "Add / Manage Entries"}</h2>

        <div style={{ marginBottom: 10 }}>
          <label style={{ marginRight: 8 }}>Billing Mode:</label>
          <select
            className="input"
            value={billingMode}
            onChange={(e) => setBillingMode(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="farmer">Farmer Billing</option>
            <option value="luggage">Luggage Billing</option>
          </select>
        </div>

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
            type="text"
            name="item_name"
            placeholder="Item Name"
            value={form.item_name}
            onChange={(e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
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

          {billingMode === "farmer" ? (
            <>
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
            </>
          ) : (
            <input
              className="input"
              placeholder="Luggage Amount (₹)"
              type="number"
              value={form.luggage_amount}
              onChange={(e) => setForm({ ...form, luggage_amount: e.target.value })}
            />
          )}

          <input
            className="input"
            placeholder="Already Paid"
            type="number"
            value={form.already_paid}
            onChange={(e) => setForm({ ...form, already_paid: e.target.value })}
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

      {/* TABLE */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Entries — {billingMode === "luggage" ? "Luggage" : "Farmer"}</h2>

        {loading ? (
          <div style={{ padding: 12 }}>Loading entries...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                {billingMode === "luggage" ? <th>Luggage</th> : <th>Bags</th>}
                <th>Kgs</th>
                <th>Rate</th>
                {billingMode === "farmer" && <th>Comm</th>}
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
                    {billingMode === "luggage" ? (
                      <td>₹{Number(e.luggage_amount || 0).toFixed(2)}</td>
                    ) : (
                      <td>{e.bags || 0}</td>
                    )}
                    <td>{e.kgs}</td>
                    <td>{e.rate}</td>
                    {billingMode === "farmer" && <td>{e.commission}</td>}
                    <td>₹{Number(e.amount).toFixed(2)}</td>
                    <td>₹{Number(e.paid_amount).toFixed(2)}</td>
                    <td>₹{Number(e.already_paid || 0).toFixed(2)}</td>
                    <td>₹{Number(e.remaining).toFixed(2)}</td>

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
