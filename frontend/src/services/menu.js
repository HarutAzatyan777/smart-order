import { apiUrl } from "../config/api";

const MENU_API = apiUrl("menu");

export async function addMenuItem(item) {
  try {
    const res = await fetch(MENU_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(item)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to add menu item: ${text}`);
    }

    return await res.json();
  } catch (err) {
    console.error("addMenuItem error:", err);
    return null;
  }
}

export async function getMenuItems() {
  try {
    const res = await fetch(MENU_API);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to load menu: ${text}`);
    }

    return await res.json();
  } catch (err) {
    console.error("getMenuItems error:", err);
    return [];
  }
}

