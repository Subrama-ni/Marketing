import API from "./index"; // your axios instance

export const getPendingUsers = () =>
  API.get("/admin/pending");

export const approveUser = (id) =>
  API.post(`/admin/approve/${id}`);

export const rejectUser = (id) =>
  API.delete(`/admin/reject/${id}`);
