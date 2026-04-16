import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

export default function useUsers(options = {}) {
  const { search = "", role = "", page = 1, limit = 20 } = options;
  
  const queryKey = ["users", { search, role, page, limit }];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (role) params.append("role", role);
      params.append("page", page);
      params.append("limit", limit);
      const response = await api.get(`/users?${params}`);
      return response.data;
    },
  });
}