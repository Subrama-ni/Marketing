// App.js
import React, { useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import EntriesPage from "./pages/EntriesPage";
import PaymentsPage from "./pages/PaymentsPage";
import './App.css';

// Theme context
export const ThemeContext = createContext();

export default function App() {
  const [theme, setTheme] = useState("light"); // light or dark
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // sidebar toggle

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");
  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`app ${theme}`}>
        <Router>
          <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
          <div className={`main ${sidebarCollapsed ? "collapsed" : ""}`}>
            <Topbar onToggleSidebar={toggleSidebar} />
            <div className="content">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/entries" element={<EntriesPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
              </Routes>
            </div>
          </div>
        </Router>
      </div>
    </ThemeContext.Provider>
  );
}
