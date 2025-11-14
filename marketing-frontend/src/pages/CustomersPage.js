import React, { useEffect, useState } from "react";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../api";
import { toast } from "react-toastify";

export default function CustomersPage({ onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", serial: "" });
  const [editingId, setEditingId] = useState(null);

  // Validation state
  const [errors, setErrors] = useState({
    name: "",
    serial: "",
    phone: "",
  });

  const fetch = async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customers");
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  /* ---------------------------------------------------
     LIVE VALIDATION
  ----------------------------------------------------- */
  const validateField = (field, value) => {
    let message = "";

    if (field === "name") {
      if (!value.trim()) message = "Name is required";
    }

    if (field === "serial") {
      if (!value) message = "Serial number is required";
      else if (isNaN(value)) message = "Serial must be a number";
      else {
        const exists = customers.some(
          (c) => c.serial === Number(value) && c.id !== editingId
        );
        if (exists) message = "Serial number already exists";
      }
    }

    if (field === "phone") {
      if (value.trim() !== "") {
        if (!/^[0-9]{10}$/.test(value))
          message = "Phone must be a 10-digit number";

        const exists = customers.some(
          (c) => c.phone === value && c.id !== editingId
        );
        if (exists) message = "Phone number already exists";
      }
    }

    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const handleInput = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    validateField(field, value);
  };

  /* ---------------------------------------------------
     FORM SUBMIT
  ----------------------------------------------------- */
  const isFormValid = () => {
    return (
      form.name.trim() &&
      form.serial &&
      !errors.serial &&
      !errors.phone &&
      !errors.name
    );
  };

  const submit = async (e) => {
    e.preventDefault();

    // Final validation before save
    if (!isFormValid()) {
      toast.error("Fix validation errors before saving");
      return;
    }

    try {
      if (editingId) {
        await updateCustomer(editingId, {
          name: form.name,
          phone: form.phone || null,
          serial: Number(form.serial),
        });
        toast.success("Customer updated successfully");
      } else {
        await createCustomer({
          name: form.name,
          phone: form.phone || null,
          serial: Number(form.serial),
        });
        toast.success("Customer created successfully");
      }

      setForm({ name: "", phone: "", serial: "" });
      setEditingId(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving customer");
    }
  };

  /* ---------------------------------------------------
     EDIT + DELETE
  ----------------------------------------------------- */
  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone || "",
      serial: c.serial,
    });
    setErrors({ name: "", serial: "", phone: "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete customer?")) return;
    try {
      await deleteCustomer(id);
      toast.success("Customer deleted");
      fetch();
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  /* ---------------------------------------------------
     UI
  ----------------------------------------------------- */

  return (
    <div className="col">
      <div className="card">
        <h2>{editingId ? "Edit Customer" : "Add Customer"}</h2>

        <form onSubmit={submit}>
          <div className="form-row">
            {/* NAME */}
            <div className="field">
              <input
                className="input"
                placeholder="Name"
                value={form.name}
                onChange={(e) => handleInput("name", e.target.value)}
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            {/* PHONE */}
            <div className="field">
              <input
                className="input"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => handleInput("phone", e.target.value)}
              />
              {errors.phone && (
                <div className="error-text">{errors.phone}</div>
              )}
            </div>

            {/* SERIAL */}
            <div className="field">
              <input
                className="input small"
                placeholder="Serial"
                type="number"
                value={form.serial}
                onChange={(e) => handleInput("serial", e.target.value)}
              />
              {errors.serial && (
                <div className="error-text">{errors.serial}</div>
              )}
            </div>

            <button
              className="btn"
              type="submit"
              disabled={!isFormValid()}
              style={{ opacity: isFormValid() ? 1 : 0.5 }}
            >
              {editingId ? "Update" : "Create"}
            </button>

            {editingId && (
              <button
                type="button"
                className="btn ghost"
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

      {/* CUSTOMER LIST */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Customers</h2>

        <div className="list">
          {customers.map((c) => (
            <div className="item" key={c.id}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="small">
                  #{c.serial} • {c.phone || "-"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn ghost"
                  onClick={() => onSelectCustomer && onSelectCustomer(c)}
                >
                  Open
                </button>
                <button className="btn" onClick={() => startEdit(c)}>
                  Edit
                </button>
                <button
                  className="btn ghost"
                  onClick={() => handleDelete(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {customers.length === 0 && (
            <div style={{ padding: 12 }}>No customers yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
