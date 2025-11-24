export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(API_BASE_URL + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.detail || "Erreur API");
    } catch {
      throw new Error(text);
    }
  }

  // Certaines routes ne renvoient pas du JSON
  try {
    return await res.json();
  } catch {
    return null;
  }
}
