import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? ""
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ url: string }>("/api/admin/uploads", form);
  return data.url;
}
