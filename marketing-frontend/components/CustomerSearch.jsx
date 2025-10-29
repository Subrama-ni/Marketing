// src/components/CustomerSearch.jsx
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function CustomerSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/customers?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="card">
      <h3>Search customers</h3>
      <input placeholder="Search by name, phone or serial" value={q} onChange={e => setQ(e.target.value)} />
      {loading && <div className="muted">Searching...</div>}
      <ul className="results">
        {results.map(r => (
          <li key={r.id} onClick={() => onSelect(r)}>
            <strong>{r.name}</strong> — {r.serial} — {r.phone}
          </li>
        ))}
      </ul>
    </div>
  );
}
