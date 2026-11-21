import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name) => api.patch("/account/profile", { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export const useChangePassword = () =>
  useMutation({ mutationFn: (body) => api.post("/account/password", body).then((r) => r.data) });

// Deactivate keeps everything and can be undone by logging in. Delete is permanent.
export const useDeactivate = () =>
  useMutation({ mutationFn: (password) => api.post("/account/deactivate", { password }).then((r) => r.data) });

export const useDeleteAccount = () =>
  useMutation({ mutationFn: (password) => api.post("/account/delete", { password, confirm: "DELETE" }) });