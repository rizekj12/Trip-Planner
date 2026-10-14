// Requests to our Express API (server/index.js), shared by the rest of src/utils
import { supabase } from "./supabase";

// Parsed JSON body of a successful request ({} if it had none)
export async function apiJson(method, path, body, options) {
  const response = await apiRequest(method, path, body, options);
  return response.json().catch(() => ({}));
}

// Calls our Express API, with the user's login token when `auth` is set. Returns the
// Response if it succeeded; otherwise throws with the server's error message.
export async function apiRequest(method, path, body, { auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  }
  const backendUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

  let response;
  try {
    response = await fetch(`${backendUrl}${path}`, {
      method,
      headers,
      body: body && method !== "GET" ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Couldn't reach the server. Is the backend running?");
  }

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}));
    throw Object.assign(new Error(error || `Request failed (${response.status})`), { status: response.status });
  }
  return response;
}
