import { apiUrl } from "../config/api";

export async function uploadMenuImage(file, token) {
  if (!file) return null;
  if (!token) {
    throw new Error("Admin token required for image uploads");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(apiUrl("admin/menu/upload-image"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // ignore, payload may not be JSON
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Image upload failed");
  }

  return payload?.url || null;
}
