import React from "react";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt, FaUsers, FaListAlt, FaMoneyBillAlt } from "react-icons/fa";
import './Sidebar.css'; // Reuse the same CSS

export default function Sidebar({ collapsed, setCollapsed }) {

  const links = [
    { to: "/", label: "Dashboard", icon: <FaTachometerAlt /> },
    { to: "/customers", label: "Customers", icon: <FaUsers /> },
    { to: "/entries", label: "Entries", icon: <FaListAlt /> },
    { to: "/payments", label: "Payments", icon: <FaMoneyBillAlt /> },
  ];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <h2 style={{color:'#3d8361'}}>MyApp</h2>}
        <button 
          className="toggle-btn" 
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background:'transparent',
            border:'none',
            cursor:'pointer',
            fontSize:'1.3rem',
            color:'#3d8361'
          }}
        >
          {collapsed ? "☰" : "✕"}
        </button>
      </div>
      <nav>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={collapsed ? link.label : ""}
            style={{
              display:'flex',
              alignItems:'center',
              gap:'12px',
              padding:'12px 16px',
              margin:'4px 8px',
              borderRadius:'8px',
              color:'#1b262c',
              textDecoration:'none',
              transition:'all 0.2s'
            }}
          >
            <span className="icon" style={{fontSize:'1.2rem', color:'#3d8361'}}>{link.icon}</span>
            {!collapsed && <span className="label" style={{fontWeight:500}}>{link.label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
