import React from "react";
import "./LoaderOverlay.css";

export default function LoaderOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="loader-overlay">
      <div className="loader" />
      <p>Please wait…</p>
    </div>
  );
}
