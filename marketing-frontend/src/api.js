import axios from "axios";
import dayjs from "dayjs";
import { toast } from "react-toastify";

// Base URL (from .env or default)
const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

/* =========================================================
   🛡️ Axios Setup — Adds token + handles 401
========================================================= */
const API = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      toast.error("Session expired. Please log in again.");
      setTimeout(() => (window.location.href = "/login"), 1200);
    }
    return Promise.reject(err);
  }
);

/* =========================================================
   ⚠️ Centralized Error Handler
========================================================= */
const handleError = (error) => {
  console.error("❌ API Error:", error.response?.data || error.message);
  toast.error(error.response?.data?.message || "Something went wrong");
  throw error;
};

/* =========================================================
   👥 Customers
========================================================= */
export const getCustomers = async () => {
  try {
    return await API.get(`/customers`);
  } catch (error) {
    handleError(error);
  }
};

export const createCustomer = async (data) => {
  try {
    return await API.post(`/customers`, data);
  } catch (error) {
    handleError(error);
  }
};

export const updateCustomer = async (id, data) => {
  try {
    return await API.put(`/customers/${id}`, data);
  } catch (error) {
    handleError(error);
  }
};

export const deleteCustomer = async (id) => {
  try {
    return await API.delete(`/customers/${id}`);
  } catch (error) {
    handleError(error);
  }
};

/* =========================================================
   📘 Entries
========================================================= */
export const createEntry = async (data) => {
  try {
    const payload = {
      ...data,
      kgs: Number(data.kgs),
      rate: Number(data.rate),
      commission: Number(data.commission || 0),
      bags: Number(data.bags || 0),
    };
    return await API.post(`/entries`, payload);
  } catch (error) {
    handleError(error);
  }
};

export const getEntriesByCustomer = async (customerId) => {
  try {
    return await API.get(`/entries/${customerId}`);
  } catch (error) {
    handleError(error);
  }
};

export const updateEntry = async (id, data) => {
  try {
    const payload = {
      ...data,
      kgs: Number(data.kgs),
      rate: Number(data.rate),
      commission: Number(data.commission || 0),
      bags: Number(data.bags || 0),
    };
    return await API.put(`/entries/${id}`, payload);
  } catch (error) {
    handleError(error);
  }
};

export const deleteEntry = async (id) => {
  try {
    return await API.delete(`/entries/${id}`);
  } catch (error) {
    handleError(error);
  }
};

/* =========================================================
   💰 Payments
========================================================= */
const normalizeDateForApi = (d) => {
  if (!d) return null;
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

export const getEntriesForPayment = async (customerId, fromDate, toDate) => {
  try {
    const f = normalizeDateForApi(fromDate);
    const t = normalizeDateForApi(toDate);
    return await API.get(
      `/payments/entries/${customerId}?fromDate=${f}&toDate=${t}`
    );
  } catch (error) {
    handleError(error);
  }
};

export const makePayment = async (data) => {
  try {
    const payload = {
      ...data,
      bag_amount: Number(data.bag_amount || 0),
    };
    return await API.post(`/payments`, payload);
  } catch (error) {
    handleError(error);
  }
};

export const getPaymentHistory = async (customerId) => {
  try {
    return await API.get(`/payments/history/${customerId}`);
  } catch (error) {
    handleError(error);
  }
};

/* =========================================================
   🔐 Auth
========================================================= */
export const loginUser = async (data) => {
  try {
    return await API.post(`/auth/login`, data);
  } catch (error) {
    handleError(error);
  }
};

export const registerUser = async (data) => {
  try {
    return await API.post(`/auth/register`, data);
  } catch (error) {
    handleError(error);
  }
};

export const forgotPasswordRequest = async (email) => {
  try {
    return await API.post(`/auth/forgot-password`, { email });
  } catch (error) {
    handleError(error);
  }
};

export const resetPasswordRequest = async (token, newPassword) => {
  try {
    return await API.post(`/auth/reset-password`, { token, newPassword });
  } catch (error) {
    handleError(error);
  }
};
