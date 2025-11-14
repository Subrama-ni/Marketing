// src/pages/DashboardPage.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // <-- ADDED: required for Doughnut / Pie charts ("arc" element)
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
  ArcElement, // <-- ADDED registration
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
  const [barHighlight, setBarHighlight] = useState(null); // index of selected bar (month)
  const [timeBuckets, setTimeBuckets] = useState([]); // [{label, start, end}]
  const navigate = useNavigate();

  const prevUnpaidRef = useRef(0);
  const chartRef = useRef(null);

  // fetch overview & compute aggregates
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCustomers();
      const cs = res.data || [];
      setCustomers(cs);

      let unpaidSum = 0;
      let paidSum = 0;
      const recentEntries = [];

      // Gather ALL entries (concurrently) to build time buckets
      const allEntriesByCustomer = await Promise.all(
        cs.map(async (c) => {
          try {
            const eRes = await getEntriesByCustomer(c.id);
            return { customer: c, entries: eRes.data || [] };
          } catch (err) {
            console.error("entry load error for", c.id, err);
            return { customer: c, entries: [] };
          }
        })
      );

      // compute paid/unpaid totals and collect recent entries
      allEntriesByCustomer.forEach(({ customer, entries }) => {
        const entriesWithAmount = entries.map((e) => {
          const kgs = Number(e.kgs || 0);
          const rate = Number(e.rate || 0);
          const commission = Number(e.commission || 0);
          const paid = Number(e.paid_amount || 0);
          const amount = (kgs - commission) * rate;
          // Dashboard uses non-negative remaining to present unpaid
          const remaining = Math.max(amount - paid, 0);
          return { ...e, amount, remaining, customerName: customer.name, customerId: customer.id };
        });

        // totals
        unpaidSum += entriesWithAmount.reduce((s, x) => s + x.remaining, 0);
        paidSum += entriesWithAmount.reduce((s, x) => s + Math.min(x.paid_amount || 0, x.amount || 0), 0);

        // recent
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
        customers: cs.length,
        unpaid: unpaidSum,
        paid: paidSum,
        total: totalAmount,
        recentEntries: recentEntries.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)),
      });

      // Build default time buckets for chart (last 12 months)
      buildTimeBucketsFromEntries(allEntriesByCustomer.flatMap(x => x.entries));
    } catch (err) {
      console.error("❌ Error fetching overview:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

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
    let end = dayjs(); // now
    let start = end.subtract(11, "month").startOf("month"); // last 12 months
    // If entries exist earlier, extend start to earliest entry month
    if (dates.length) {
      const earliest = dayjs(Math.min(...dates.map(d => d.getTime()))).startOf("month");
      if (earliest.isBefore(start)) start = earliest;
    }
    // create buckets month by month
    const buckets = [];
    let cur = start.startOf("month");
    while (cur.isBefore(end.endOf("month")) || cur.isSame(end.startOf("month"), 'month')) {
      const label = cur.format("MMM YYYY");
      const bucketStart = cur.startOf("month").toDate();
      const bucketEnd = cur.endOf("month").toDate();
      buckets.push({ label, start: bucketStart, end: bucketEnd });
      cur = cur.add(1, "month");
      // safety guard
      if (buckets.length > 60) break;
    }
    setTimeBuckets(buckets);
  };

  // Prepare chart dataset aggregated by selected periodMonths
  const chartData = useMemo(() => {
    // pick buckets according to selected period (periodMonths null => all)
    const buckets = [...timeBuckets];
    if (!buckets.length) return { labels: [], datasets: [] };

    let selectedBuckets = buckets;
    if (periodMonths && periodMonths > 0) selectedBuckets = buckets.slice(-periodMonths);

    // initialize sums
    const paidArr = new Array(selectedBuckets.length).fill(0);
    const unpaidArr = new Array(selectedBuckets.length).fill(0);

    // iterate through customers' entries
    customers.forEach((c) => {
      // we will need to fetch entries for each customer to compute per-month. But to avoid extra network calls,
      // we rely on entries previously loaded in fetchOverview only used there. For chart accuracy it's better to re-fetch,
      // but to keep this component self-contained we call getEntriesByCustomer synchronously here would be async.
      // So instead we will aggregate from totals.recentEntries and from totals — approximate visualization.
    });

    // Better approach: perform a light aggregation by calling getEntriesByCustomer for all customers *on demand*.
    // However we can't do async here. So we return placeholders; the real aggregation happens in fetchChartSeries() below.
    return {
      labels: selectedBuckets.map((b) => b.label),
      datasets: [
        {
          label: "Paid",
          data: paidArr,
          backgroundColor: "rgba(34,197,94,0.85)",
          stack: "stack1",
          borderRadius: 6,
        },
        {
          label: "Unpaid",
          data: unpaidArr,
          backgroundColor: "rgba(239,68,68,0.85)",
          stack: "stack1",
          borderRadius: 6,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeBuckets, periodMonths, customers]);

  // Async function to fetch series per bucket — this runs whenever buckets or customers change
  useEffect(() => {
    if (!timeBuckets.length || !customers.length) return;
    let mounted = true;

    (async () => {
      try {
        const buckets = periodMonths ? timeBuckets.slice(-periodMonths) : timeBuckets;
        const labels = buckets.map((b) => b.label);
        const paidArr = new Array(buckets.length).fill(0);
        const unpaidArr = new Array(buckets.length).fill(0);

        // For each customer fetch entries and bucket them
        await Promise.all(
          customers.map(async (c) => {
            try {
              const res = await getEntriesByCustomer(c.id);
              const entries = res.data || [];
              entries.forEach((e) => {
                const entryDate = new Date(e.entry_date);
                const kgs = Number(e.kgs || 0);
                const rate = Number(e.rate || 0);
                const commission = Number(e.commission || 0);
                const amount = (kgs - commission) * rate;
                const paid = Number(e.paid_amount || 0);
                // find bucket index
                const idx = buckets.findIndex((b) => entryDate >= b.start && entryDate <= b.end);
                if (idx >= 0) {
                  paidArr[idx] += Math.min(paid, amount);
                  unpaidArr[idx] += Math.max(amount - paid, 0);
                }
              });
            } catch (err) {
              // ignore per-customer failures
            }
          })
        );

        if (!mounted) return;
        // update chart by manipulating chart instance if exists (smooth transition)
        const chart = chartRef.current;
        if (chart && chart.chartInstance) {
          // react-chartjs-2 v4 exposes chartRef.current as chart instance in some setups,
          // but we update via React state below to be safe.
        }

        // set a stable dataset in local state by replacing chart data via a reference update:
        setChartSeries({
          labels,
          paidArr,
          unpaidArr,
        });
      } catch (err) {
        console.error("Error building chart series", err);
      }
    })();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeBuckets, periodMonths, customers]);

  // chartSeries state holds computed arrays for rendering
  const [chartSeries, setChartSeries] = useState({ labels: [], paidArr: [], unpaidArr: [] });

  // Chart.js options (interactive + zoom/pan)
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { usePointStyle: true, boxWidth: 10 },
        },
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
          pan: {
            enabled: true,
            mode: "x",
            modifierKey: "ctrl",
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { maxRotation: 0, minRotation: 0 },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: { color: "rgba(200,200,200,0.08)" },
          ticks: {
            callback: (v) => `₹${Number(v).toFixed(0)}`,
          },
        },
      },
      onClick: (evt, elements) => {
        if (!elements.length) {
          setBarHighlight(null);
          return;
        }
        const el = elements[0];
        setBarHighlight(el.index);
        // scroll page or do other interactions if required
      },
      transitions: {
        show: { animations: { x: { from: 0 }, y: { from: 0 } } },
        hide: { animations: { x: { to: 0 }, y: { to: 0 } } },
      },
    };
  }, []);

  // Build the data object used by <Bar />
  const dataForChart = useMemo(() => {
    const labels = chartSeries.labels.length ? chartSeries.labels : chartData.labels;
    const paid = chartSeries.paidArr.length ? chartSeries.paidArr : (chartData.datasets[0]?.data || []);
    const unpaid = chartSeries.unpaidArr.length ? chartSeries.unpaidArr : (chartData.datasets[1]?.data || []);

    return {
      labels,
      datasets: [
        {
          label: "Paid",
          data: paid,
          backgroundColor: labels.map((_, i) => (barHighlight === i ? "rgba(34,197,94,1)" : "rgba(34,197,94,0.85)")),
          borderRadius: 6,
          stack: "stack1",
        },
        {
          label: "Unpaid",
          data: unpaid,
          backgroundColor: labels.map((_, i) => (barHighlight === i ? "rgba(239,68,68,1)" : "rgba(239,68,68,0.85)")),
          borderRadius: 6,
          stack: "stack1",
        },
      ],
    };
  }, [chartSeries, chartData, barHighlight]);

  // Utility: reset zoom
  const resetZoom = () => {
    const chart = chartRef.current;
    try {
      // react-chartjs-2 + chartjs-plugin-zoom expose resetZoom on chart instance
      if (chart && chart.resetZoom) chart.resetZoom();
      if (chart && chart.chartInstance && chart.chartInstance.resetZoom) chart.chartInstance.resetZoom();
    } catch (e) {
      // ignore
    }
  };

  // handle period change
  const setPeriod = (months) => {
    setPeriodMonths(months);
    setBarHighlight(null);
    resetZoom();
  };

  // helper to open entries for a customer
  const handleOpenCustomer = (customerId) => {
    navigate(`/entries?customerId=${customerId}`);
  };

  // compute donut data
  const donutData = useMemo(() => {
    const paid = totals.paid || 0;
    const unpaid = totals.unpaid || 0;
    return {
      labels: ["Paid", "Unpaid"],
      datasets: [
        {
          data: [paid, unpaid],
          backgroundColor: ["#22c55e", "#ef4444"],
          hoverOffset: 6,
        },
      ],
    };
  }, [totals]);

  // expose reset / refresh
  const refreshAll = async () => {
    setBarHighlight(null);
    setChartSeries({ labels: [], paidArr: [], unpaidArr: [] });
    await fetchOverview();
  };

  // filter recent entries when a bar is highlighted
  const displayedRecentEntries = useMemo(() => {
    if (barHighlight == null || !chartSeries.labels?.length) return totals.recentEntries;
    const bucketLabel = chartSeries.labels[barHighlight];
    // filter totals.recentEntries by matching month-year
    return totals.recentEntries.filter((r) => dayjs(r.entry_date).format("MMM YYYY") === bucketLabel);
  }, [barHighlight, chartSeries.labels, totals.recentEntries]);

  return (
    <div className="dashboard-page enhanced">
      <div className="dashboard-top">
        <h2 className="dashboard-heading">📊 Dashboard Overview</h2>
        <div className="controls-row">
          <div className="period-buttons">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.label}
                className={`period-btn ${periodMonths === o.months ? "active" : ""}`}
                onClick={() => setPeriod(o.months)}
              >
                {o.label}
              </button>
            ))}
            <button className="btn ghost" onClick={refreshAll}>Refresh</button>
            <button
              className="btn ghost"
              onClick={() => {
                resetZoom();
              }}
            >
              Reset Zoom
            </button>
          </div>

          <div className="search-area">
            <input
              className="search-input"
              placeholder="🔍 search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
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
              <div
                className="progress-ring"
                style={{ background: `conic-gradient(var(--accent) ${Math.min(100, (totals.unpaid/(totals.total||1))*100)*3.6}deg, var(--bg) 0deg)` }}
              />
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

      {/* Layout: Left charts, Right lists */}
      <div className="grid-two">
        <div className="left-col">
          {/* DONUT */}
          <div className="card donut-card interactive">
            <div className="card-header-compact">
              <h3>Payment Distribution</h3>
              <div className="card-actions">
                <button className="btn ghost" onClick={() => { /* empty */ }}>Export</button>
              </div>
            </div>
            <div className="donut-wrapper-compact">
              <div className="donut-chart-canvas">
                <Doughnut data={donutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
              </div>
              <div className="donut-legend-compact">
                <div className="legend-item"><span className="dot paid"></span> Paid <strong>₹{totals.paid.toFixed(2)}</strong></div>
                <div className="legend-item"><span className="dot unpaid"></span> Unpaid <strong>₹{totals.unpaid.toFixed(2)}</strong></div>
              </div>
            </div>
          </div>

          {/* PERFORMANCE BAR CHART */}
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
                <div>Showing: <strong>{chartSeries.labels.length ? chartSeries.labels.length : (chartData.labels || []).length}</strong> months</div>
                <div>Highlight: <strong>{barHighlight != null ? chartSeries.labels[barHighlight] : "—"}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Customers & Recent */}
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
                      <button className="btn ghost small" onClick={() => handleOpenCustomer(c.id)}>Open</button>
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
                      <button className="btn ghost small" onClick={() => handleOpenCustomer(r.customerId)}>Open</button>
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
