import React, { useEffect, useState } from "react";
import { getCustomers, getEntriesByCustomer } from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css";

export default function DashboardPage() {
  const [customers, setCustomers] = useState([]);
  const [totals, setTotals] = useState({
    customers: 0,
    unpaid: 0,
    paid: 0,
    total: 0,
    recentEntries: [],
  });
  const [search, setSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trend, setTrend] = useState({ unpaidTrend: "neutral" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    const query = search.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.serial?.toString().includes(query) ||
          (c.phone || "").includes(query)
      )
    );
  }, [search, customers]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await getCustomers();
      const cs = res.data || [];
      setCustomers(cs);

      let unpaidSum = 0;
      let paidSum = 0;
      const recentEntries = [];

      await Promise.all(
        cs.map(async (c) => {
          try {
            const eRes = await getEntriesByCustomer(c.id);
            const entries = eRes.data || [];

            const entriesWithAmount = entries.map((e) => {
              const kgs = Number(e.kgs || 0);
              const rate = Number(e.rate || 0);
              const commission = Number(e.commission || 0);
              const paid = Number(e.paid_amount || 0);
              const amount = (kgs - commission) * rate;
              const remaining = Math.max(amount - paid, 0);
              return { ...e, amount, remaining };
            });

            const unpaidForCustomer = entriesWithAmount.reduce(
              (sum, e) => sum + e.remaining,
              0
            );
            const paidForCustomer = entriesWithAmount.reduce(
              (sum, e) => sum + Math.min(e.paid_amount, e.amount),
              0
            );

            unpaidSum += unpaidForCustomer;
            paidSum += paidForCustomer;

            entriesWithAmount
              .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
              .slice(0, 3)
              .forEach((entry) =>
                recentEntries.push({
                  customer: c.name,
                  customerId: c.id,
                  ...entry,
                })
              );
          } catch (e) {
            console.error(`Error fetching entries for ${c.name}`, e);
          }
        })
      );

      const totalAmount = paidSum + unpaidSum;
      const lastUnpaid = totals.unpaid || 0;
      const trendStatus =
        unpaidSum > lastUnpaid
          ? "up"
          : unpaidSum < lastUnpaid
          ? "down"
          : "neutral";

      setTrend({ unpaidTrend: trendStatus });
      setTotals({
        customers: cs.length,
        unpaid: unpaidSum,
        paid: paidSum,
        total: totalAmount,
        recentEntries: recentEntries.sort(
          (a, b) => new Date(b.entry_date) - new Date(a.entry_date)
        ),
      });
    } catch (err) {
      console.error("❌ Error fetching overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCustomer = (customerId) => {
    navigate(`/entries?customerId=${customerId}`);
  };

  const unpaidPercent =
    totals.total > 0 ? Math.round((totals.unpaid / totals.total) * 100) : 0;
  const paidPercent = 100 - unpaidPercent;

  return (
    <div className="dashboard-page">
      <h2 className="dashboard-heading">📊 Dashboard Overview</h2>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card stat-card">
          <h3>Customers</h3>
          <p className="stat-value">{totals.customers}</p>
          <span className="badge neutral">Total</span>
        </div>

        <div className="summary-card stat-card">
          <h3>Total Unpaid</h3>
          <div className="progress-container">
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(var(--accent) ${
                  unpaidPercent * 3.6
                }deg, var(--border) 0deg)`,
              }}
            ></div>
            <div className="progress-text">₹{totals.unpaid.toFixed(2)}</div>
          </div>
          <span
            className={`badge ${
              trend.unpaidTrend === "up"
                ? "up"
                : trend.unpaidTrend === "down"
                ? "down"
                : "neutral"
            }`}
          >
            {trend.unpaidTrend === "up"
              ? "↑ Increasing"
              : trend.unpaidTrend === "down"
              ? "↓ Decreasing"
              : "→ Stable"}
          </span>
        </div>

        <div className="summary-card stat-card">
          <h3>Recent Entries</h3>
          <p className="stat-value">{totals.recentEntries.length}</p>
          <span className="badge neutral">Last Added</span>
        </div>
      </div>

      {/* ==============================
          DYNAMIC DONUT CHART
      =============================== */}
      <div className="card donut-card">
        <h3>Payment Distribution</h3>
        <p className="donut-sub">Live Paid vs Unpaid visualization</p>

        <div className="donut-chart">
          <div className="donut-wrapper">
            <div
              className="donut-segment paid"
              style={{
                background: `conic-gradient(var(--accent) 0deg ${
                  paidPercent * 3.6
                }deg, transparent ${paidPercent * 3.6}deg 360deg)`,
              }}
              data-tooltip={`Paid: ${paidPercent}%`}
            ></div>

            <div
              className="donut-segment unpaid"
              style={{
                background: `conic-gradient(#ef4444 ${
                  paidPercent * 3.6
                }deg 360deg, transparent 0deg ${paidPercent * 3.6}deg)`,
              }}
              data-tooltip={`Unpaid: ${unpaidPercent}%`}
            ></div>

            <div className="donut-center">
              <div className="donut-center-text">
                {paidPercent}% Paid
              </div>
            </div>
          </div>

          <div className="donut-legend">
            <div className="legend-item">
              <span className="dot paid"></span> Paid (₹
              {totals.paid.toFixed(2)})
            </div>
            <div className="legend-item">
              <span className="dot unpaid"></span> Unpaid (₹
              {totals.unpaid.toFixed(2)})
            </div>
          </div>
        </div>
      </div>

      {/* ==============================
          PERFORMANCE ANALYTICS
      =============================== */}
      <div className="card analytics-card">
        <h3>Performance Analytics</h3>
        <p className="analytics-sub">
          Visual representation of your key business metrics
        </p>

        <div className="bar-chart">
          <div className="bar-item" style={{ "--bar-height": "80%" }}>
            <div className="bar"></div>
            <span className="bar-label">Entries</span>
            <span className="bar-value">80%</span>
          </div>

          <div className="bar-item" style={{ "--bar-height": `${paidPercent}%` }}>
            <div className="bar"></div>
            <span className="bar-label">Paid</span>
            <span className="bar-value">{paidPercent}%</span>
          </div>

          <div className="bar-item" style={{ "--bar-height": `${unpaidPercent}%` }}>
            <div className="bar"></div>
            <span className="bar-label">Unpaid</span>
            <span className="bar-value">{unpaidPercent}%</span>
          </div>

          <div className="bar-item" style={{ "--bar-height": "90%" }}>
            <div className="bar"></div>
            <span className="bar-label">Customers</span>
            <span className="bar-value">90%</span>
          </div>
        </div>
      </div>

      {/* ==============================
          SEARCH SECTION
      =============================== */}
      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by name, serial, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading && <span className="loading">⏳ Loading...</span>}
      </div>

      {/* ==============================
          CUSTOMER LIST
      =============================== */}
      <div className="card">
        <div className="card-header">
          <h3>Customers</h3>
        </div>
        <div className="list">
          {filteredCustomers.length === 0 ? (
            <div className="no-data">No customers found</div>
          ) : (
            filteredCustomers.map((c) => (
              <div className="list-item" key={c.id}>
                <div>
                  <div className="item-name">{c.name}</div>
                  <div className="item-sub">
                    #{c.serial || "-"} • {c.phone || "N/A"}
                  </div>
                </div>
                <button
                  className="btn ghost small"
                  onClick={() => handleOpenCustomer(c.id)}
                >
                  Open
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ==============================
          RECENT ENTRIES
      =============================== */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Entries</h3>
        </div>
        <div className="list">
          {totals.recentEntries.length === 0 ? (
            <div className="no-data">No recent entries</div>
          ) : (
            totals.recentEntries.map((r, i) => (
              <div className="list-item" key={i}>
                <div>
                  <div className="item-name">{r.customer}</div>
                  <div className="item-sub">
                    {new Date(r.entry_date).toLocaleDateString()} • {r.kgs} kg • ₹
                    {r.amount.toFixed(2)}
                  </div>
                </div>
                <button
                  className="btn ghost small"
                  onClick={() => handleOpenCustomer(r.customerId)}
                >
                  Open
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
