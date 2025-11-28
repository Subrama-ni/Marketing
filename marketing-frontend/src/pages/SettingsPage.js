import React from "react";
import { useBillingMode } from "../context/BillingModeContext";

export default function SettingsPage() {
  const { billingMode, setBillingMode } = useBillingMode();

  return (
    <div className="col">
      <div className="card">
        <h2>Settings</h2>
        <div>
          <h4>Billing Mode</h4>
          <div style={{ display: "flex", gap: 12 }}>
            <label>
              <input
                type="radio"
                name="billingMode"
                checked={billingMode === "farmer"}
                onChange={() => setBillingMode("farmer")}
              />{" "}
              Farmer Billing (current behavior)
            </label>
            <label>
              <input
                type="radio"
                name="billingMode"
                checked={billingMode === "luggage"}
                onChange={() => setBillingMode("luggage")}
              />{" "}
              Luggage Billing
            </label>
          </div>
          <div style={{ marginTop: 12, color: "#555" }}>
            Selecting Luggage Billing will change Entries & Payments UI to Luggage mode.
            Data in each mode is stored separately.
          </div>
        </div>
      </div>
    </div>
  );
}
