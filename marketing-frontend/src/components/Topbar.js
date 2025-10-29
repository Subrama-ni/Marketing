import React, { useContext } from "react";
import { ThemeContext } from "../App";

export default function Topbar({ onToggleSidebar }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <div className="topbar">
      <button className="hamburger-btn" onClick={onToggleSidebar}>☰</button>
      <button onClick={toggleTheme} style={{marginLeft: 'auto'}}>
        {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </button>
    </div>
  );
}
