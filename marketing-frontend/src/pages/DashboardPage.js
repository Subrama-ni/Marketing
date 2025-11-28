// src/pages/DashboardPage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { getCustomers, getEntriesByCustomer } from "../api";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "../styles/DashboardPage.css";

/* ===== Register Chart.js elements & plugins ===== */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const PERIOD_OPTIONS = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
  { label: "ALL", months: null },
];

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
  const [periodMonths, setPeriodMonths] = useState(6);
  const [barHighlight, setBarHighlight] = useState(null);
  const [timeBuckets, setTimeBuckets] = useState([]);
  const navigate = useNavigate();

  const prevUnpaidRef = useRef(0);
  const chartRef = useRef(null);

  // billing mode (localStorage). Option A: dashboard shows only luggage entries when luggage mode selected.
  const [billingMode, setBillingMode] = useState(localStorage.getItem("billingMode") || "farmer");

  useEffect(() => {
    const root = document.querySelector(".dashboard-page") || document.body;
    if (billingMode === "luggage") {
      root.classList.add("billing-luggage");
    } else {
      root.classList.remove("billing-luggage");
    }
  }, [billingMode]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "billingMode") {
        setBillingMode(e.newValue || "farmer");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleBillingMode = () => {
    const next = billingMode === "luggage" ? "farmer" : "luggage";
    localStorage.setItem("billingMode", next);
    setBillingMode(next);
  };

  // fetch overview & compute aggregates (now depends on billingMode)
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCustomers();
      const cs = res.data || [];

      // Fetch entries per customer using the selected billingMode
      const allEntriesByCustomer = await Promise.all(
        cs.map(async (c) => {
          try {
            const eRes = await getEntriesByCustomer(c.id, billingMode);
            return { customer: c, entries: eRes.data || [] };
          } catch (err) {
            console.error("entry load error for", c.id, err);
            return { customer: c, entries: [] };
          }
        })
      );

      // If in luggage mode, only consider customers who have at least one luggage entry.
      const customersWithEntries = allEntriesByCustomer
        .filter((ce) => (ce.entries || []).length > 0)
        .map((ce) => ce.customer);

      // Decide which customer list to use for dashboard counts / display:
      // - In luggage mode: show only customers that have luggage entries
      // - Otherwise: show all customers
      const effectiveCustomers = billingMode === "luggage" ? customersWithEntries : cs;

      // Compute totals from the entries of the selected billing mode only
      let unpaidSum = 0;
      let paidSum = 0;
      const recentEntries = [];

      allEntriesByCustomer.forEach(({ customer, entries }) => {
        // entries were fetched already with the billingMode filter
        const entriesWithAmount = entries.map((e) => {
          const kgs = Number(e.kgs || 0);
          const rate = Number(e.rate || 0);
          const commission = Number(e.commission || 0);
          const paid = Number(e.paid_amount || 0);
          // If billingMode is luggage the backend's entry amount should already reflect that,
          // but keep calculation defensive (amount field may or may not be present).
          const amount = e.amount != null ? Number(e.amount) : (billingMode === "luggage" ? kgs * rate : (kgs - commission) * rate);
          const remaining = Math.max(amount - paid, 0);
          return { ...e, amount, remaining, customerName: customer.name, customerId: customer.id };
        });

        unpaidSum += entriesWithAmount.reduce((s, x) => s + (x.remaining || 0), 0);
        paidSum += entriesWithAmount.reduce((s, x) => s + Math.min(Number(x.paid_amount || 0), Number(x.amount || 0)), 0);

        entriesWithAmount
          .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
          .slice(0, 3)
          .forEach((entry) =>
            recentEntries.push({
              customer: customer.name,
              customerId: customer.id,
              ...entry,
            })
          );
      });

      const totalAmount = paidSum + unpaidSum;
      const lastUnpaid = prevUnpaidRef.current || 0;
      const trendStatus = unpaidSum > lastUnpaid ? "up" : unpaidSum < lastUnpaid ? "down" : "neutral";
      prevUnpaidRef.current = unpaidSum;

      setTrend({ unpaidTrend: trendStatus });
      setTotals({
        customers: effectiveCustomers.length,
        unpaid: unpaidSum,
        paid: paidSum,
        total: totalAmount,
        recentEntries: recentEntries.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)),
      });

      // update customers list shown in the dashboard (right column). We still keep full list in state if needed.
      setCustomers(effectiveCustomers);

      // Build time buckets for chart using entries (only those in selected billingMode)
      buildTimeBucketsFromEntries(allEntriesByCustomer.flatMap((x) => x.entries));
    } catch (err) {
      console.error("❌ Error fetching overview:", err);
    } finally {
      setLoading(false);
    }
  }, [billingMode]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // filter UI customers (search) — works on the customers array which is already filtered for luggage mode
  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.serial?.toString() || "").includes(q) ||
          (c.phone || "").includes(q)
      )
    );
  }, [search, customers]);

  // build monthly buckets (label, start, end) from entries or default last 12 months
  const buildTimeBucketsFromEntries = (allEntries) => {
    const dates = (allEntries || []).map((e) => new Date(e.entry_date)).filter(Boolean);
    let end = dayjs();
    let start = end.subtract(11, "month").startOf("month");
    if (dates.length) {
      const earliest = dayjs(Math.min(...dates.map((d) => d.getTime()))).startOf("month");
      if (earliest.isBefore(start)) start = earliest;
    }
    const buckets = [];
    let cur = start.startOf("month");
    while (cur.isBefore(end.endOf("month")) || cur.isSame(end.startOf("month"), "month")) {
      const label = cur.format("MMM YYYY");
      const bucketStart = cur.startOf("month").toDate();
      const bucketEnd = cur.endOf("month").toDate();
      buckets.push({ label, start: bucketStart, end: bucketEnd });
      cur = cur.add(1, "month");
      if (buckets.length > 60) break;
    }
    setTimeBuckets(buckets);
  };

  // Placeholder chartData (real aggregation performed async below)
  const chartData = useMemo(() => {
    const buckets = [...timeBuckets];
    if (!buckets.length) return { labels: [], datasets: [] };
    let selectedBuckets = buckets;
    if (periodMonths && periodMonths > 0) selectedBuckets = buckets.slice(-periodMonths);
    const paidArr = new Array(selectedBuckets.length).fill(0);
    const unpaidArr = new Array(selectedBuckets.length).fill(0);
    return {
      labels: selectedBuckets.map((b) => b.label),
      datasets: [
        { label: "Paid", data: paidArr, backgroundColor: "rgba(34,197,94,0.85)", stack: "stack1", borderRadius: 6 },
        { label: "Unpaid", data: unpaidArr, backgroundColor: "rgba(239,68,68,0.85)", stack: "stack1", borderRadius: 6 },
      ],
    };
  }, [timeBuckets, periodMonths]);

  // Build series by fetching entries bucketed (respects billingMode by virtue of fetchOverview having filtered customers,
  // and we again call getEntriesByCustomer here with billingMode to be accurate)
  useEffect(() => {
    if (!timeBuckets.length || !customers.length) return;
    let mounted = true;

    (async () => {
      try {
        const buckets = periodMonths ? timeBuckets.slice(-periodMonths) : timeBuckets;
        const labels = buckets.map((b) => b.label);
        const paidArr = new Array(buckets.length).fill(0);
        const unpaidArr = new Array(buckets.length).fill(0);

        await Promise.all(
          customers.map(async (c) => {
            try {
              const res = await getEntriesByCustomer(c.id, billingMode);
              const entries = res.data || [];
              entries.forEach((e) => {
                const entryDate = new Date(e.entry_date);
                const kgs = Number(e.kgs || 0);
                const rate = Number(e.rate || 0);
                const commission = Number(e.commission || 0);
                const amount = e.amount != null ? Number(e.amount) : (billingMode === "luggage" ? kgs * rate : (kgs - commission) * rate);
                const paid = Number(e.paid_amount || 0);
                const idx = buckets.findIndex((b) => entryDate >= b.start && entryDate <= b.end);
                if (idx >= 0) {
                  paidArr[idx] += Math.min(paid, amount);
                  unpaidArr[idx] += Math.max(amount - paid, 0);
                }
              });
            } catch (err) {
              // ignore per-customer failure
            }
          })
        );

        if (!mounted) return;
        setChartSeries({ labels, paidArr, unpaidArr });
      } catch (err) {
        console.error("Error building chart series", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [timeBuckets, periodMonths, customers, billingMode]);

  const [chartSeries, setChartSeries] = useState({ labels: [], paidArr: [], unpaidArr: [] });

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { usePointStyle: true, boxWidth: 10 } },
        title: { display: true, text: "Paid vs Unpaid — Monthly" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || "";
              const val = context.raw != null ? Number(context.raw).toFixed(2) : "0.00";
              return `${label}: ₹${val}`;
            },
          },
        },
        zoom: {
          pan: { enabled: true, mode: "x", modifierKey: "ctrl" },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        },
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, minRotation: 0 } },
        y: { stacked: true, beginAtZero: true, grid: { color: "rgba(200,200,200,0.08)" }, ticks: { callback: (v) => `₹${Number(v).toFixed(0)}` } },
      },
      onClick: (evt, elements) => {
        if (!elements.length) {
          setBarHighlight(null);
          return;
        }
        const el = elements[0];
        setBarHighlight(el.index);
      },
      transitions: {
        show: { animations: { x: { from: 0 }, y: { from: 0 } } },
        hide: { animations: { x: { to: 0 }, y: { to: 0 } } },
      },
    };
  }, []);

  const dataForChart = useMemo(() => {
    const labels = chartSeries.labels.length ? chartSeries.labels : chartData.labels;
    const paid = chartSeries.paidArr.length ? chartSeries.paidArr : (chartData.datasets[0]?.data || []);
    const unpaid = chartSeries.unpaidArr.length ? chartSeries.unpaidArr : (chartData.datasets[1]?.data || []);
    return {
      labels,
      datasets: [
        { label: "Paid", data: paid, backgroundColor: labels.map((_, i) => (barHighlight === i ? "rgba(34,197,94,1)" : "rgba(34,197,94,0.85)")), borderRadius: 6, stack: "stack1" },
        { label: "Unpaid", data: unpaid, backgroundColor: labels.map((_, i) => (barHighlight === i ? "rgba(239,68,68,1)" : "rgba(239,68,68,0.85)")), borderRadius: 6, stack: "stack1" },
      ],
    };
  }, [chartSeries, chartData, barHighlight]);

  const resetZoom = () => {
    const chart = chartRef.current;
    try {
      if (chart && chart.resetZoom) chart.resetZoom();
      if (chart && chart.chartInstance && chart.chartInstance.resetZoom) chart.chartInstance.resetZoom();
    } catch (e) {
      // ignore
    }
  };

  const setPeriod = (months) => {
    setPeriodMonths(months);
    setBarHighlight(null);
    resetZoom();
  };

  const handleOpenCustomer = (customerId) => {
    navigate(`/entries?customerId=${customerId}&billingMode=${billingMode}`);
  };

  const donutData = useMemo(() => {
    const paid = totals.paid || 0;
    const unpaid = totals.unpaid || 0;
    return { labels: ["Paid", "Unpaid"], datasets: [{ data: [paid, unpaid], backgroundColor: ["#22c55e", "#ef4444"], hoverOffset: 6 }] };
  }, [totals]);

  const refreshAll = async () => {
    setBarHighlight(null);
    setChartSeries({ labels: [], paidArr: [], unpaidArr: [] });
    await fetchOverview();
  };

  const displayedRecentEntries = useMemo(() => {
    if (barHighlight == null || !chartSeries.labels?.length) return totals.recentEntries;
    const bucketLabel = chartSeries.labels[barHighlight];
    return totals.recentEntries.filter((r) => dayjs(r.entry_date).format("MMM YYYY") === bucketLabel);
  }, [barHighlight, chartSeries.labels, totals.recentEntries]);

  return (
    <div className="dashboard-page enhanced">
      <div className="dashboard-top">
        <h2 className="dashboard-heading">📊 Dashboard Overview</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Mode:</div>
          <button className={`btn small ${billingMode === "luggage" ? "danger" : "ghost"}`} onClick={toggleBillingMode} title="Toggle billing mode (stored in localStorage)" style={{ padding: "6px 10px" }}>
            {billingMode === "luggage" ? "Luggage (theme)" : "Farmer (default)"}
          </button>
        </div>

        <div className="controls-row">
          <div className="period-buttons">
            {PERIOD_OPTIONS.map((o) => (
              <button key={o.label} className={`period-btn ${periodMonths === o.months ? "active" : ""}`} onClick={() => setPeriod(o.months)}>
                {o.label}
              </button>
            ))}
            <button className="btn ghost" onClick={refreshAll}>
              Refresh
            </button>
            <button className="btn ghost" onClick={() => resetZoom()}>
              Reset Zoom
            </button>
          </div>

          <div className="search-area">
            <input className="search-input" placeholder="🔍 search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card stat-card">
          <h3>Customers</h3>
          <p className="stat-value">{totals.customers}</p>
          <span className="badge neutral">Total</span>
        </div>

        <div className="summary-card stat-card big">
          <h3>Total Unpaid</h3>
          <div className="progress-container">
            <div className="progress-ring-outer">
              <div className="progress-ring" style={{ background: `conic-gradient(var(--accent) ${Math.min(100, (totals.unpaid / (totals.total || 1)) * 100) * 3.6}deg, var(--bg) 0deg)` }} />
              <div className="progress-center">
                <div className="progress-text">₹{totals.unpaid.toFixed(2)}</div>
                <div className={`trend ${trend.unpaidTrend}`}>{trend.unpaidTrend === "up" ? "↑" : trend.unpaidTrend === "down" ? "↓" : "→"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="summary-card stat-card">
          <h3>Recent Entries</h3>
          <p className="stat-value">{totals.recentEntries.length}</p>
          <span className="badge neutral">Last Added</span>
        </div>
      </div>

      <div className="grid-two">
        <div className="left-col">
          <div className="card donut-card interactive">
            <div className="card-header-compact">
              <h3>Payment Distribution</h3>
              <div className="card-actions">
                <button className="btn ghost" onClick={() => {}}>Export</button>
              </div>
            </div>
            <div className="donut-wrapper-compact">
              <div className="donut-chart-canvas">
                <Doughnut data={donutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
              </div>
              <div className="donut-legend-compact">
                <div className="legend-item">
                  <span className="dot paid"></span> Paid <strong>₹{totals.paid.toFixed(2)}</strong>
                </div>
                <div className="legend-item">
                  <span className="dot unpaid"></span> Unpaid <strong>₹{totals.unpaid.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="card analytics-card interactive" style={{ minHeight: 380 }}>
            <div className="card-header-compact">
              <h3>Performance Analytics</h3>
              <div className="card-actions">
                <div className="small-note">Zoom: wheel &amp; pinch, Pan: drag (hold Ctrl to pan)</div>
              </div>
            </div>
            <div className="chart-area">
              <Bar ref={chartRef} data={dataForChart} options={chartOptions} />
            </div>
            <div className="chart-footer">
              <div className="legend-mini">
                <span className="dot paid" /> Paid
                <span className="dot unpaid" style={{ marginLeft: 12 }} /> Unpaid
              </div>
              <div className="chart-stats">
                <div>
                  Showing: <strong>{chartSeries.labels.length ? chartSeries.labels.length : (chartData.labels || []).length}</strong> months
                </div>
                <div>Highlight: <strong>{barHighlight != null ? chartSeries.labels[barHighlight] : "—"}</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-col">
          <div className="card">
            <div className="card-header">
              <h3>Customers</h3>
            </div>
            <div className="list small-list">
              {filteredCustomers.length === 0 ? (
                <div className="no-data">No customers found</div>
              ) : (
                filteredCustomers.map((c) => (
                  <div className="list-item" key={c.id}>
                    <div>
                      <div className="item-name">{c.name}</div>
                      <div className="item-sub">#{c.serial || "-"} • {c.phone || "N/A"}</div>
                    </div>
                    <div className="item-actions">
                      <button className="btn ghost small" onClick={() => handleOpenCustomer(c.id)}>
                        Open
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Recent Entries {barHighlight != null ? `(Filtered: ${chartSeries.labels[barHighlight]})` : ""}</h3>
            </div>
            <div className="list small-list">
              {displayedRecentEntries.length === 0 ? (
                <div className="no-data">No recent entries</div>
              ) : (
                displayedRecentEntries.map((r, i) => (
                  <div className="list-item" key={i}>
                    <div>
                      <div className="item-name">{r.customer}</div>
                      <div className="item-sub">{new Date(r.entry_date).toLocaleDateString()} • {r.kgs} kg • ₹{r.amount.toFixed(2)}</div>
                    </div>
                    <div className="item-actions">
                      <button className="btn ghost small" onClick={() => handleOpenCustomer(r.customerId)}>
                        Open
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
