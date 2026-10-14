import { useQuery } from "@tanstack/react-query";
import api from "./api";

export const useBilling = () =>
  useQuery({ queryKey: ["billing"], queryFn: () => api.get("/billing/me").then((r) => r.data), staleTime: 15000 });

export const isLimitReached = (err) => err.response?.status === 429 && err.response?.data?.detail?.code === "limit_reached";
