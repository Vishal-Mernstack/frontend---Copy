import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export default function usePrescriptions(options = {}) {
  const { patient_id = "", doctor_id = "", page = 1, limit = 20 } = options;
  
  const queryKey = ["prescriptions", { patient_id, doctor_id, page, limit }];
  
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (patient_id) params.append("patient_id", patient_id);
      if (doctor_id) params.append("doctor_id", doctor_id);
      params.append("page", page);
      params.append("limit", limit);
      const response = await api.get(`/prescriptions?${params}`);
      return response.data;
    },
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/prescriptions", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.put(`/prescriptions/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });

  return {
    ...query,
    createPrescription: createMutation.mutateAsync,
    updatePrescription: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}