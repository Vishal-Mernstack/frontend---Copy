import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export default function useHospital(options = {}) {
  const queryClient = useQueryClient();

  // Beds
  const useBeds = (bedOptions = {}) => {
    const { ward_type = "", status = "", department_id = "", page = 1, limit = 20 } = bedOptions;
    return useQuery({
      queryKey: ["beds", bedOptions],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (ward_type) params.append("ward_type", ward_type);
        if (status) params.append("status", status);
        if (department_id) params.append("department_id", department_id);
        params.append("page", page);
        params.append("limit", limit);
        const response = await api.get(`/hospital/beds?${params}`);
        return response.data;
      },
    });
  };

  const createBed = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/hospital/beds", payload);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["beds"] }),
  });

  const updateBed = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.put(`/hospital/beds/${id}`, payload);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["beds"] }),
  });

  const deleteBed = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/hospital/beds/${id}`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["beds"] }),
  });

  // Admissions
  const useAdmissions = (admOptions = {}) => {
    const { patient_id = "", status = "", page = 1, limit = 20 } = admOptions;
    return useQuery({
      queryKey: ["admissions", admOptions],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (patient_id) params.append("patient_id", patient_id);
        if (status) params.append("status", status);
        params.append("page", page);
        params.append("limit", limit);
        const response = await api.get(`/hospital/admissions?${params}`);
        return response.data;
      },
    });
  };

  const createAdmission = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/hospital/admissions", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
    },
  });

  const updateAdmission = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.put(`/hospital/admissions/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
    },
  });

  return {
    useBeds,
    createBed: createBed.mutateAsync,
    updateBed: updateBed.mutateAsync,
    deleteBed: deleteBed.mutateAsync,
    isCreating: createBed.isPending,
    isUpdating: updateBed.isPending,
    isDeleting: deleteBed.isPending,
    useAdmissions,
    createAdmission: createAdmission.mutateAsync,
    updateAdmission: updateAdmission.mutateAsync,
    isCreatingAdmission: createAdmission.isPending,
    isUpdatingAdmission: updateAdmission.isPending,
  };
}