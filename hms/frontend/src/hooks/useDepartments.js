import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../lib/api";

export default function useDepartments(options = {}) {
  const { search = "", status = "", page = 1, limit = 20 } = options;
  
  const queryKey = ["departments", { search, status, page, limit }];
  
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      params.append("page", String(page));
      params.append("limit", String(limit));
      
      try {
        const response = await api.get(`/departments?${params}`);
        return response.data?.data || response.data;
      } catch (error) {
        const message = error.response?.data?.message || error.message || "Failed to fetch departments";
        toast.error(message);
        throw new Error(message);
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      try {
        const response = await api.post("/departments", payload);
        toast.success("Department created successfully");
        return response.data;
      } catch (error) {
        const message = error.response?.data?.message || error.message || "Failed to create department";
        toast.error(message);
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      try {
        const response = await api.put(`/departments/${id}`, payload);
        toast.success("Department updated successfully");
        return response.data;
      } catch (error) {
        const message = error.response?.data?.message || error.message || "Failed to update department";
        toast.error(message);
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const response = await api.delete(`/departments/${id}`);
        toast.success("Department deleted successfully");
        return response.data;
      } catch (error) {
        const message = error.response?.data?.message || error.message || "Failed to delete department";
        toast.error(message);
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  return {
    ...query,
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    createDepartment: createMutation.mutateAsync,
    updateDepartment: updateMutation.mutateAsync,
    deleteDepartment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
