import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AuthUser extends User {
  clientId?: string;
  clientStatus?: string;
  isImpersonating?: boolean;
  impersonatedUser?: User;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    },
    retry: 1, // Retry once on failure to handle temporary network issues
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000, // 30 minutes - much longer to prevent frequent auth checks
  });

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
