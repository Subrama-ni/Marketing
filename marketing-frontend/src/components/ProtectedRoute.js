import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token"); // or your custom auth key
  return token ? children : <Navigate to="/login" replace />;
}
