import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl, getApiConfig } from "./config";

// --- CSRF TOKEN MANAGEMENT ---
// This variable will hold the CSRF token in memory for the duration of the session.
let csrfToken: string | null = null;

/**

Fetches the CSRF token from the BFF's dedicated endpoint.

This is designed to be called only once per application load,

as the token is then cached in the csrfToken variable.
*/
async function getCsrfToken(): Promise<string> {
  // If we already have the token, return it immediately.
  if (csrfToken) {
    return csrfToken;
  }

  try {
    // The credentials: 'include' is crucial for the server to read our cookies
    // and generate a token tied to our session.
    const response = await fetch('/api/csrf-token', { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token with status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.csrfToken) {
      throw new Error('CSRF token not found in response from /api/csrf-token');
    }

    // Cache the token in the module-level variable.
    csrfToken = data.csrfToken;
    return csrfToken as string;
  } catch (error) {

    // On failure, return an empty string. The server will reject the subsequent
    // request, which is the correct and secure behavior.
    return "";
  }

}

// "Warm up" the CSRF token cache as soon as the app loads.
// This is non-blocking and will fetch the token in the background.
getCsrfToken();

/**

A centralized API request function. It automatically handles:
Building the full API URL.
Setting the request method and body (for JSON or FormData).
Including credentials (like the httpOnly auth cookie) via credentials: 'include'.
Automatically fetching and including the CSRF token in a header for state-changing requests.
Throwing a standardized error for non-2xx responses.
Dispatching a global 'session-expired' event for 401 Unauthorized errors.
*/
export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown,
  customHeaders?: Record<string, string>
): Promise<any> {
  const { baseUrl } = getApiConfig();
  const fullUrl = buildApiUrl(url, baseUrl);
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  // For state-changing requests (POST, PUT, PATCH, DELETE), we must include the CSRF token.
  // GET requests do not require CSRF protection.
  const upperCaseMethod = method.toUpperCase();
  if (upperCaseMethod !== 'GET' && upperCaseMethod !== 'HEAD' && upperCaseMethod !== 'OPTIONS') {
    const token = await getCsrfToken(); // Always await, don't rely on cache initially
    if (!token) {
      throw new Error('Failed to obtain CSRF token');
    }
    headers['X-CSRF-Token'] = token;
  }

  let body: BodyInit | undefined;
  if (data instanceof FormData) {
    // For FormData, the browser automatically sets the 'Content-Type' with the correct boundary.
    body = data;
  } else if (data !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body,
      // This is the most important option for authentication. It tells the browser
      // to automatically send the secure, httpOnly session cookie with the request.
      credentials: "include",
    });
    if (!res.ok) {
      let errorJson;
      try {
        errorJson = await res.json();
      } catch {
        // If the response body is not JSON, create a standard error object.
        errorJson = { status: res.status, message: res.statusText };
      }
      // If we get a 403 Forbidden, our CSRF token might be stale or invalid.
      // We clear it so the next request will fetch a new one.
      if (res.status === 403) {
        csrfToken = null;
      }
      // Ensure the error object always has a status property.
      if (!errorJson.status) {
        errorJson.status = res.status;
      }
      throw errorJson;
    }

    // Handle responses that might have no content (e.g., 204 No Content).
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    // For non-JSON responses, return undefined.
    return res;
  } catch (error: any) {
    // This is the global handler for session expiry.
    if (error.status === 401) {
      // Dispatch a global event that AuthProvider.tsx listens for to show the expiry modal.
      window.dispatchEvent(new CustomEvent('session-expired'));
      // Reject the promise so TanStack Query knows the request failed.
      return Promise.reject(error);
    }
    // For all other errors, re-throw them so they can be handled by TanStack Query's onError callbacks.
    throw error;
  }
}

/**

A generic QueryFunction for TanStack Query that uses our apiRequest for GET requests.

This is used as the default query function for the entire app.
*/
export const defaultQueryFn: QueryFunction<unknown, readonly unknown[]> = async ({ queryKey }) => {

  // Joins the query key array into a URL path, e.g., ['agents', 1] becomes 'agents/1'
  const url = queryKey.join('/');
  return apiRequest(url, "GET");

};

/**

The global TanStack Query client instance.

Configured with smart defaults for caching, retries, and window focus behavior.
*/
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Use our custom fetcher for all useQuery calls.
      queryFn: defaultQueryFn,

      // Data is considered fresh for 5 minutes. After that, it's "stale".
      staleTime: 1000 * 60 * 5,

      // Refetch stale queries when the user returns to the window.
      refetchOnWindowFocus: true,

      // Refetch stale queries when the network connection is restored.
      refetchOnReconnect: true,

      // Custom retry logic.
      retry: (failureCount, error: any) => {
        // Do not retry on authentication or authorization errors.
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          return false;
        }
        // For other server/network errors, retry up to 2 times.
        return failureCount < 2;
      },
    },
    mutations: {
      // Mutations are generally not retried by default to avoid duplicate actions.
      retry: false,
    },

  },
});