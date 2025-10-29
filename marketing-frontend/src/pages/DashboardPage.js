import React, { useEffect, useState } from 'react';
import { getCustomers, getEntriesByCustomer } from '../api';
import './DashboardPage.css';

export default function DashboardPage({ onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [totals, setTotals] = useState({ customers: 0, unpaid: 0, recentEntries: [] });
  const [search, setSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  useEffect(() => { fetchOverview(); }, []);

  useEffect(() => {
    const query = search.toLowerCase();
    setFilteredCustomers(customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.serial?.toString().includes(query) ||
      (c.phone || "").includes(query)
    ));
  }, [search, customers]);

  const fetchOverview = async () => {
    try {
      const res = await getCustomers();
      const cs = res.data || [];
      setCustomers(cs);

      let unpaidSum = 0;
      const recentEntries = [];

      // ✅ Parallel fetch for better performance and accuracy
      const allEntries = await Promise.all(
        cs.map(async (c) => {
          try {
            const eRes = await getEntriesByCustomer(c.id);
            const entries = eRes.data || [];

            // ✅ Correct total amount = (kgs - commission) * rate
            const entriesWithAmount = entries.map(e => {
              const kgs = Number(e.kgs || 0);
              const rate = Number(e.rate || 0);
              const commission = Number(e.commission || 0);
              const amount = (kgs - commission) * rate;
              const paid = Number(e.paid_amount || 0);
              const remaining = Math.max(amount - paid, 0);
              return { ...e, amount, remaining };
            });

            // ✅ Unpaid total for that customer
            const unpaidForC = entriesWithAmount.reduce((s, e) => s + e.remaining, 0);
            unpaidSum += unpaidForC;

            // ✅ Add up to 3 latest entries for "Recent Entries"
            entriesWithAmount
              .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
              .slice(0, 3)
              .forEach(en => recentEntries.push({ customer: c.name, customerId: c.id, ...en }));

          } catch (e) {
            console.error(`Error fetching entries for ${c.name}`, e);
          }
        })
      );

      setTotals({
        customers: cs.length,
        unpaid: unpaidSum,
        recentEntries: recentEntries.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)),
      });
    } catch (err) {
      console.error('Error fetching overview:', err);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top summary cards */}
      <div className="summary-cards">
        <div className="card summary-card">
          <div className="card-content">
            <div className="value">{totals.customers}</div>
            <div className="label">Customers</div>
          </div>
        </div>
        <div className="card summary-card">
          <div className="card-content">
            <div className="value">₹{totals.unpaid.toFixed(2)}</div>
            <div className="label">Total Unpaid</div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name, serial, or phone"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Customers list */}
      <div className="card">
        <h3>Customers</h3>
        <div className="list">
          {filteredCustomers.length === 0 ? (
            <div className="no-data">No customers found</div>
          ) : filteredCustomers.map(c => (
            <div className="list-item" key={c.id}>
              <div>
                <div className="item-name">{c.name}</div>
                <div className="item-sub">#{c.serial} • {c.phone}</div>
              </div>
              <button
                className="btn ghost"
                onClick={() => onSelectCustomer && onSelectCustomer({ id: c.id, name: c.name })}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent entries */}
      <div className="card">
        <h3>Recent Entries</h3>
        <div className="list">
          {(totals.recentEntries || []).length === 0 ? (
            <div className="no-data">No recent entries</div>
          ) : (totals.recentEntries || []).map((r, i) => (
            <div className="list-item" key={i}>
              <div>
                <div className="item-name">{r.customer}</div>
                <div className="item-sub">
                  {new Date(r.entry_date).toLocaleDateString()} • {r.kgs} kgs • ₹{r.amount.toFixed(2)}
                </div>
              </div>
              <button
                className="btn ghost"
                onClick={() => onSelectCustomer && onSelectCustomer({ id: r.customerId, name: r.customer })}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
