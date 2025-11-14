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

  const submit = async (e) => {
    e.preventDefault();

    if (!form.name || form.serial === "") {
      toast.warn("Name & Serial are required");
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
      toast.error(
        err.response?.data?.message || "Error saving customer"
      );
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || "", serial: c.serial });
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

  return (
    <div className="col">
      <div className="card">
        <h2>{editingId ? "Edit Customer" : "Add Customer"}</h2>

        <form onSubmit={submit}>
          <div className="form-row">
            <input
              className="input"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              className="input"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <input
              className="input small"
              placeholder="Serial"
              type="number"
              value={form.serial}
              onChange={(e) =>
                setForm({ ...form, serial: e.target.value })
              }
            />

            <button className="btn" type="submit">
              {editingId ? "Update" : "Create"}
            </button>

            {editingId && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: "", phone: "", serial: "" });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

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
                  onClick={() =>
                    onSelectCustomer && onSelectCustomer(c)
                  }
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
