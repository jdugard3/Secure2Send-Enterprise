import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorData: any = null;
    
    try {
      const text = await res.text();
      if (text) {
        // Try to parse as JSON first
        try {
          errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || text;
        } catch {
          // If not JSON, use the text directly
          errorMessage = text;
        }
      }
    } catch (e) {
      console.error("Error reading response:", e);
    }

    // Handle session timeout / unauthorized
    if (res.status === 401) {
      console.log('🔒 Session expired - Redirecting to login page');
      // Only redirect if not already on login/signup page
      if (!window.location.pathname.startsWith('/login') && 
          !window.location.pathname.startsWith('/signup')) {
        // Store the current path to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = '/login';
      }
      return; // Don't throw error, just redirect
    }

    // Handle MFA setup requirement
    if (res.status === 403 && errorData?.mfaSetupRequired) {
      console.log('🔐 MFA Setup Required - Redirecting to setup page');
      // Redirect to MFA setup page
      window.location.href = '/mfa-setup';
      return; // Don't throw error, just redirect
    }

    console.error(`API Error: ${res.status} - ${res.url}`, errorMessage);
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let headers: Record<string, string> = {};
  let body: string | FormData | undefined;

  if (data instanceof FormData) {
    // For FormData, don't set Content-Type - let browser set it with boundary
    body = data;
  } else if (data) {
    // For regular JSON data
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    // Handle 401 by redirecting to login (session timeout)
    if (res.status === 401) {
      console.log('🔒 Session expired - Redirecting to login page');
      // Only redirect if not already on login/signup page
      if (!window.location.pathname.startsWith('/login') && 
          !window.location.pathname.startsWith('/signup')) {
        // Store the current path to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = '/login';
      }
      // Return null to prevent errors while redirecting
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Removed default queryFn - using explicit queryFn in each query
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
