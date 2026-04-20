import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../lib/api";

export default function useBilling(params = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["billing", params],
    retry: false,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await api.get("/billing", { params });
      return data?.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/billing", payload);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("Invoice created");
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/billing/${id}`, payload);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/billing/${id}`);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("Invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // UPI Config (admin)
  const useUpiConfig = () =>
    useQuery({
      queryKey: ["upi-config"],
      queryFn: async () => {
        const { data } = await api.get("/billing/upi-config");
        return data?.data;
      },
    });

  const createUpiConfig = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/billing/upi-config", payload);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("UPI config created");
      queryClient.invalidateQueries({ queryKey: ["upi-config"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUpiConfig = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/billing/upi-config/${id}`, payload);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("UPI config updated");
      queryClient.invalidateQueries({ queryKey: ["upi-config"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUpiConfig = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/billing/upi-config/${id}`);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("UPI config deleted");
      queryClient.invalidateQueries({ queryKey: ["upi-config"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // QR Code generation
  const generateQR = useMutation({
    mutationFn: async ({ amount, invoice_id, patient_name }) => {
      const { data } = await api.post("/billing/qr/generate", { amount, invoice_id, patient_name });
      return data?.data;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Record payment
  const recordPayment = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/billing/payment", payload);
      return data?.data;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Payment transactions for an invoice
  const useTransactions = (billingId) =>
    useQuery({
      queryKey: ["payment-transactions", billingId],
      queryFn: async () => {
        const { data } = await api.get(`/billing/transactions/${billingId}`);
        return data?.data;
      },
      enabled: Boolean(billingId),
    });

  return {
    ...query,
    createBilling: createMutation.mutateAsync,
    updateBilling: updateMutation.mutateAsync,
    deleteBilling: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    useUpiConfig,
    createUpiConfig: createUpiConfig.mutateAsync,
    updateUpiConfig: updateUpiConfig.mutateAsync,
    deleteUpiConfig: deleteUpiConfig.mutateAsync,
    generateQR: generateQR.mutateAsync,
    isGeneratingQR: generateQR.isPending,
    recordPayment: recordPayment.mutateAsync,
    isRecordingPayment: recordPayment.isPending,
    useTransactions,
  };
}
