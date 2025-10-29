import axios from 'axios';
import dayjs from 'dayjs';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// customers
export const getCustomers = () => axios.get(`${BASE}/customers`);
export const createCustomer = (data) => axios.post(`${BASE}/customers`, data);
export const updateCustomer = (id, data) => axios.put(`${BASE}/customers/${id}`, data);
export const deleteCustomer = (id) => axios.delete(`${BASE}/customers/${id}`);

// entries
export const createEntry = (data) => axios.post(`${BASE}/entries`, data);
export const getEntriesByCustomer = (customerId) => axios.get(`${BASE}/entries/${customerId}`);
export const deleteEntry = (id) => axios.delete(`${BASE}/entries/${id}`);
export const updateEntry = (id, data) => axios.put(`${BASE}/entries/${id}`, data);

// payments
const normalizeDateForApi = (d) => {
  if (!d) return null;
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
};

export const getEntriesForPayment = (customerId, fromDate, toDate) => {
  const params = {};
  const f = normalizeDateForApi(fromDate);
  const t = normalizeDateForApi(toDate);
  if (f) params.fromDate = f;
  if (t) params.toDate = t;
  return axios.get(`${BASE}/payments/entries/${customerId}`, { params });
};

export const makePayment = (data) => axios.post(`${BASE}/payments`, data);
export const getPaymentHistory = (customerId) => axios.get(`${BASE}/payments/history/${customerId}`);
