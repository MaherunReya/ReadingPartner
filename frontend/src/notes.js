import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// Keep in sync with NoteColor / NoteCreate in backend/schemas.py.
export const NOTE_COLORS = {
  sun: { label: "Sand", bg: "bg-sun" },
  pink: { label: "Rose", bg: "bg-pink" },
  sky: { label: "Sky", bg: "bg-sky" },
  mint: { label: "Mint", bg: "bg-mint" },
};
export const MAX_NOTE_CHARS = 20000;

export const useNotes = () =>
  useQuery({ queryKey: ["notes"], queryFn: () => api.get("/notes").then((r) => r.data) });

function useNoteMutation(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }) });
}

export const useCreateNote = () => useNoteMutation((body) => api.post("/notes", body).then((r) => r.data));
export const useUpdateNote = () => useNoteMutation(({ id, ...body }) => api.patch(`/notes/${id}`, body).then((r) => r.data));
export const useDeleteNote = () => useNoteMutation((id) => api.delete(`/notes/${id}`));
