import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, LoginInput, RegisterInput } from "@shared/schema";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response;
    },
    onSuccess: async (res: Response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      try {
        const u: User = await res.json();
        if (u?.role === "admin") {
          setLocation("/admin/dashboard");
        } else if (u?.role === "vendor") {
          setLocation("/vendor/dashboard");
        }
      } catch {}
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      // Immediately clear the user data
      queryClient.setQueryData(["/api/auth/user"], null);
      // Then invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isVendor: user?.role === "vendor",
    isAdmin: user?.role === "admin",
    isBuyer: user?.role === "buyer",
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}
