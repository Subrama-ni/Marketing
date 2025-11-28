import React, { useEffect, useState, useCallback } from "react";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getEntriesByCustomer,
} from "../api";
import { toast } from "react-toastify";
import { useBillingMode } from "../context/BillingModeContext";

export default function CustomersPage({ onSelectCustomer }) {
  const { billingMode } = useBillingMode();

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [form, setForm] = useState({ name: "", phone: "", serial: "" });
  const [editingId, setEditingId] = useState(null);

  const [errors, setErrors] = useState({
    name: "",
    serial: "",
    phone: "",
  });

  /* ------------------------------------------------
        FETCH CUSTOMERS + AUTO-SERIAL (NO WARNINGS)
  ------------------------------------------------ */
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      const all = res.data || [];

      // Filter by billing mode
      const list = [];
      for (let c of all) {
        try {
          const enr = await getEntriesByCustomer(c.id, billingMode);
          if (enr.data.length > 0) list.push(c);
        } catch {}
      }

      setCustomers(list);
      setFilteredCustomers(list);

      // Auto-serial only if NOT editing
      if (!editingId) {
        const maxSerial = all.length
          ? Math.max(...all.map((c) => Number(c.serial)))
          : 0;

        setForm((prev) => ({
          ...prev,
          serial: maxSerial + 1,
        }));
      }
    } catch (err) {
      toast.error("Failed to load customers");
    }
  }, [billingMode, editingId]);

  // FIXED WARNING: fetchCustomers included
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setFilteredCustomers(customers);
  }, [customers]);

  /* ------------------------------------------------
                  VALIDATION
  ------------------------------------------------ */
  const validateField = (field, value) => {
    let message = "";

    if (field === "name" && !value.trim()) {
      message = "Name is required";
    }

    if (field === "serial") {
      if (!value) message = "Serial is required";
      else if (isNaN(value)) message = "Serial must be numeric";
      else {
        const exists = customers.some(
          (c) => c.serial === Number(value) && c.id !== editingId
        );
        if (exists) message = "Serial already exists";
      }
    }

    if (field === "phone") {
      if (value.trim() !== "") {
        if (!/^[0-9]{10}$/.test(value)) message = "Phone must be 10 digits";

        const exists = customers.some(
          (c) => c.phone === value && c.id !== editingId
        );
        if (exists) message = "Phone already exists";
      }
    }

    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const handleInput = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const isFormValid = () => {
    return (
      form.name.trim() &&
      form.serial &&
      !errors.serial &&
      !errors.phone &&
      !errors.name
    );
  };

  /* ------------------------------------------------
                    SUBMIT
  ------------------------------------------------ */
  const submit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return toast.error("Fix errors before saving");

    try {
      if (editingId) {
        await updateCustomer(editingId, {
          name: form.name,
          phone: form.phone || null,
          serial: Number(form.serial),
        });
        toast.success("Customer updated");
      } else {
        await createCustomer({
          name: form.name,
          phone: form.phone || null,
          serial: Number(form.serial),
        });
        toast.success("Customer created");
      }

      setForm({ name: "", phone: "", serial: "" });
      setEditingId(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving customer");
    }
  };

  /* ------------------------------------------------
                EDIT + DELETE
  ------------------------------------------------ */
  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || "", serial: c.serial });
    setErrors({ name: "", serial: "", phone: "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete customer?")) return;

    try {
      await deleteCustomer(id);
      toast.success("Customer deleted");
      fetchCustomers();
    } catch {
      toast.error("Failed to delete");
    }
  };

  /* ------------------------------------------------
                    UI
  ------------------------------------------------ */
  return (
    <div className="col">
      {/* FORM */}
      <div className="card">
        <h2>{editingId ? "Edit Customer" : "Add Customer"}</h2>

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <input
                className="input"
                placeholder="Name"
                value={form.name}
                onChange={(e) => handleInput("name", e.target.value)}
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div className="field">
              <input
                className="input"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => handleInput("phone", e.target.value)}
              />
              {errors.phone && <div className="error-text">{errors.phone}</div>}
            </div>

            <div className="field">
              <input
                className="input small"
                type="number"
                placeholder="Serial"
                value={form.serial}
                onChange={(e) => handleInput("serial", e.target.value)}
              />
              {errors.serial && (
                <div className="error-text">{errors.serial}</div>
              )}
            </div>

            <button className="btn" type="submit" disabled={!isFormValid()}>
              {editingId ? "Update" : "Create"}
            </button>

            {editingId && (
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: "", phone: "", serial: "" });
                  setErrors({ name: "", serial: "", phone: "" });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LIST */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>
          Customers ({billingMode === "luggage" ? "Luggage" : "Farmer"} Mode)
        </h2>

        <div className="list">
          {filteredCustomers.length === 0 && (
            <div style={{ padding: 12 }}>No customers found.</div>
          )}

          {filteredCustomers.map((c) => (
            <div className="item" key={c.id}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="small">#{c.serial} • {c.phone || "-"}</div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn ghost" onClick={() => onSelectCustomer?.(c)}>
                  Open
                </button>
                <button className="btn" onClick={() => startEdit(c)}>
                  Edit
                </button>
                <button className="btn ghost" onClick={() => handleDelete(c.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
