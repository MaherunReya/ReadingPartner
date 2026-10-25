import { useMutation } from "@tanstack/react-query";
import api from "./api";

// Questions written by the AI from pasted or uploaded lecture text (POST /ai/test).
export const useGenerateTest = () =>
  useMutation({ mutationFn: (body) => api.post("/ai/test", body).then((r) => r.data.questions) });