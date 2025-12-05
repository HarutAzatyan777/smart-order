const BASE_URL = "https://us-central1-swift-stack-444307-m4.cloudfunctions.net";

export async function addMenuItem(item) {
  try {
    const res = await fetch(`${BASE_URL}/addMenuItem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
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
