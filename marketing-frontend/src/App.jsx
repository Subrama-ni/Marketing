// src/App.jsx
import React, { useState } from 'react';
import CustomerForm from '../components/CustomerForm';
import CustomerSearch from '../components/CustomerSearch';
import CustomerDashboard from '../components/CustomerDashboard';

export default function App() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  return (
    <div className="app-root">
      <header className="topbar">
        <h1>Marketing Payments Manager</h1>
      </header>
      <main className="container">
        <aside className="left">
          <CustomerForm onCreated={c => setSelectedCustomer(c)} />
          <CustomerSearch onSelect={c => setSelectedCustomer(c)} />
        </aside>
        <section className="right">
          {selectedCustomer ? (
            <CustomerDashboard customer={selectedCustomer} />
          ) : (
            <div className="card muted">Select or create a customer to begin.</div>
          )}
        </section>
      </main>
      <footer className="footer">Built with React • Backend: Node + Prisma + Neon</footer>
    </div>
  );
}
