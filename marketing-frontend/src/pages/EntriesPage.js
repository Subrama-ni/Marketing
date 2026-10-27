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

const money = (value) => Number(Number(value || 0).toFixed(2));
const formatMoney = (value) => money(value).toFixed(2);

export default function EntriesPage({ selectedCustomer }) {
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const queryCustomerId = query.get("customerId");
  const queryEntryId = query.get("entryId");
  const queryBillingMode = query.get("billingMode");

  const { billingMode, setBillingMode } = useBillingMode();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(
    queryCustomerId ||
      (selectedCustomer?.id ? String(selectedCustomer.id) : ""),
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

  useEffect(() => {
    if (
      queryBillingMode &&
      ["farmer", "luggage"].includes(queryBillingMode) &&
      queryBillingMode !== billingMode
    ) {
      setBillingMode(queryBillingMode);
    }

    if (queryCustomerId) {
      setCustomerId((currentId) =>
        currentId === queryCustomerId ? currentId : queryCustomerId,
      );
    } else if (selectedCustomer?.id) {
      setCustomerId(String(selectedCustomer.id));
    }
  }, [
    queryCustomerId,
    queryBillingMode,
    selectedCustomer?.id,
    billingMode,
    setBillingMode,
  ]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load customers");
    }
  }, []);

  useEffect(() => {
    setFilteredCustomers(customers);
  }, [customers, billingMode]);

  const loadEntries = useCallback(
    async (cid) => {
      if (!cid) {
        setEntries([]);
        return;
      }

      try {
        setLoading(true);
        const res = await getEntriesByCustomer(cid, billingMode);
        const list = Array.isArray(res.data) ? res.data : [];

        const processed = list.map((entry) => {
          const kgs = Number(entry.kgs || 0);
          const rate = Number(entry.rate || 0);
          const commission = Number(entry.commission || 0);
          const alreadyPaid = Number(entry.already_paid || 0);
          const actualPaid = Number(entry.paid_amount || 0);
          const luggageAmount = Number(entry.luggage_amount || 0);
          const isTransferred = Boolean(entry.balance_transferred_at);
          const isFullyPaid = Boolean(entry.fully_paid_at);

          // Keep the established calculation: farmer amount = (kgs - commission) * rate.
          const amount = money(
            billingMode === "luggage"
              ? luggageAmount > 0
                ? luggageAmount
                : kgs * rate
              : Math.max(0, (kgs - commission) * rate),
          );

          // `paid_amount` remains the true payment ledger amount. A transferred balance
          // is displayed as settled on this entry, but is not falsely added to the ledger.
          const displayedPaid =
            isTransferred || isFullyPaid
              ? amount
              : Math.min(amount, money(actualPaid + alreadyPaid));
          const remaining =
            isTransferred || isFullyPaid
              ? 0
              : Math.max(0, money(amount - actualPaid - alreadyPaid));

          return {
            ...entry,
            amount,
            paidDisplay: displayedPaid,
            remaining,
            isTransferred,
            isFullyPaid,
          };
        });

        setEntries(processed);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load entries");
      } finally {
        setLoading(false);
      }
    },
    [billingMode],
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadEntries(customerId);
  }, [customerId, billingMode, loadEntries]);

  useEffect(() => {
    if (!queryEntryId || entries.length === 0) return;

    const targetEntry = entries.find(
      (entry) => String(entry.id) === String(queryEntryId),
    );

    if (!targetEntry) return;

    const target = document.getElementById(`entry-${queryEntryId}`);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [queryEntryId, entries]);

  const resetForm = () => {
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

  const submit = async (event) => {
    event.preventDefault();
    if (!customerId) return toast.warn("Select a customer");
    if (!form.date || form.kgs === "" || form.rate === "") {
      return toast.warn("Date, Kgs and Rate are required");
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
      resetForm();
      await loadEntries(customerId);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save entry");
    }
  };

  const handleEdit = (entry) => {
    if (entry.isTransferred || entry.isFullyPaid) {
      toast.info(
        "This entry has already been settled or transferred. Edit it only if you intend to correct its historical details.",
      );
    }
    setEditingId(entry.id);
    setForm({
      date: dayjs(entry.entry_date).format("YYYY-MM-DD"),
      kgs: entry.kgs ?? "",
      rate: entry.rate ?? "",
      commission: entry.commission ?? "",
      item_name: entry.item_name || "",
      bags: entry.bags ?? "",
      already_paid: entry.already_paid ?? "",
      luggage_amount: entry.luggage_amount ?? "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry(id);
      toast.success("Entry deleted");
      await loadEntries(customerId);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete entry");
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
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">-- select customer --</option>
            {filteredCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} • #{customer.serial}
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
            min="0"
            step="any"
            placeholder="Kgs"
            value={form.kgs}
            onChange={(e) => setForm({ ...form, kgs: e.target.value })}
          />
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            placeholder="Rate"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
          />

          {billingMode === "farmer" ? (
            <>
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                placeholder="Commission"
                value={form.commission}
                onChange={(e) =>
                  setForm({ ...form, commission: e.target.value })
                }
              />
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                placeholder="Bags"
                value={form.bags}
                onChange={(e) => setForm({ ...form, bags: e.target.value })}
              />
            </>
          ) : (
            <input
              className="input"
              type="number"
              min="0"
              step="any"
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
            min="0"
            step="any"
            placeholder="Already Paid"
            value={form.already_paid}
            onChange={(e) => setForm({ ...form, already_paid: e.target.value })}
          />
          <button className="btn" type="submit">
            {editingId ? "Save Changes" : "Add Entry"}
          </button>
          {editingId && (
            <button className="btn ghost" type="button" onClick={resetForm}>
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
                entries.map((entry) => (
                  <tr key={entry.id} id={`entry-${entry.id}`}>
                    <td>{dayjs(entry.entry_date).format("DD/MM/YYYY")}</td>
                    <td>{entry.item_name || "-"}</td>
                    <td>{Number(entry.kgs || 0).toFixed(2)}</td>
                    <td>{Number(entry.rate || 0).toFixed(2)}</td>
                    <td>₹{formatMoney(entry.amount)}</td>
                    <td>₹{formatMoney(entry.paidDisplay)}</td>
                    <td>₹{formatMoney(entry.remaining)}</td>
                    <td>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => handleEdit(entry)}
                      >
                        Edit
                      </button>{" "}
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => handleDelete(entry.id)}
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
