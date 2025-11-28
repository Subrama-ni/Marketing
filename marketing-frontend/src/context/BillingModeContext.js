import React, { createContext, useContext, useEffect, useState } from "react";

const BillingModeContext = createContext();

export const BillingModeProvider = ({ children }) => {
  const [billingMode, setBillingMode] = useState(localStorage.getItem("billingMode") || "farmer");

  useEffect(() => {
    localStorage.setItem("billingMode", billingMode);
  }, [billingMode]);

  return (
    <BillingModeContext.Provider value={{ billingMode, setBillingMode }}>
      {children}
    </BillingModeContext.Provider>
  );
};

export const useBillingMode = () => useContext(BillingModeContext);
