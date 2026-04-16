import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../lib/api";

export default function usePharmacy(params = {}) {
  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: ["pharmacy", params],
    retry: false,
    staleTime: 30000,
    queryFn: async () => {
      try {
        const { data } = await api.get("/medicines", { params });
        if (!data?.data) {
          return { items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }, alerts: { lowStock: 0, outOfStock: 0, expiring: 0 } };
        }
        return data.data;
      } catch (err) {
        console.error("Pharmacy API Error:", err);
        throw err;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/medicines", payload);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("Medicine created");
      queryClient.invalidateQueries({ queryKey: ["pharmacy"] });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error.message || "Failed to create medicine";
      if (error?.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/role-based-login";
      } else {
        toast.error(message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/medicines/${id}`, payload);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("Medicine updated");
      queryClient.invalidateQueries({ queryKey: ["pharmacy"] });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error.message || "Failed to update medicine";
      if (error?.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/role-based-login";
      } else {
        toast.error(message);
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const { data } = await api.post("/medicines/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data?.data;
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error.message || "Failed to upload files";
      if (error?.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/role-based-login";
      } else {
        toast.error(message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/medicines/${id}`);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("Medicine deleted");
      queryClient.invalidateQueries({ queryKey: ["pharmacy"] });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error.message || "Failed to delete medicine";
      if (error?.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/role-based-login";
      } else {
        toast.error(message);
      }
    },
  });

  const bulkInsertMutation = useMutation({
    mutationFn: async (medicines) => {
      const { data } = await api.post("/medicines/bulk-insert", { medicines });
      return data?.data;
    },
    onSuccess: (data) => {
      toast.success(`Added ${data.added} new, updated ${data.updated} medicines`);
      queryClient.invalidateQueries({ queryKey: ["pharmacy"] });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error.message || "Failed to insert medicines";
      if (error?.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/role-based-login";
      } else {
        toast.error(message);
      }
    },
  });

  return {
    ...queryResult,
    createMedicine: createMutation.mutateAsync,
    updateMedicine: updateMutation.mutateAsync,
    deleteMedicine: deleteMutation.mutateAsync,
    uploadFiles: uploadMutation.mutateAsync,
    bulkInsert: bulkInsertMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    uploading: uploadMutation.isPending,
    inserting: bulkInsertMutation.isPending,
  };
}
