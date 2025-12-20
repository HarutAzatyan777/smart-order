import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "../../config/api";
import { normalizeMenuPayload, parseMenuFile } from "./importers";
import { fetchJson } from "./helpers";
import { uploadMenuImage } from "../../utils/uploadMenuImage";

export function useAdminMenu({ token, setError }) {
  const MENU_API = apiUrl("admin/menu");

  const [menu, setMenu] = useState([]);

  // create menu fields
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState("");

  // edit menu fields
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuPrice, setEditMenuPrice] = useState("");
  const [editMenuCategory, setEditMenuCategory] = useState("");
  const [editMenuDescription, setEditMenuDescription] = useState("");
  const [editMenuImageFile, setEditMenuImageFile] = useState(null);
  const [editMenuImagePreview, setEditMenuImagePreview] = useState("");
  const [editMenuImageUrl, setEditMenuImageUrl] = useState("");
  const [editMenuImageCleared, setEditMenuImageCleared] = useState(false);

  const [menuSearch, setMenuSearch] = useState("");
  const [menuFilter, setMenuFilter] = useState("all");
  const [importingMenu, setImportingMenu] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [imageUploadStatus, setImageUploadStatus] = useState({ create: false, edit: false });
  const [menuActionId, setMenuActionId] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(false);

  const clearError = () => setError?.("");
  const withAuth = (options = {}) => ({
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const handleMenuImageFileChange = (file) => {
    if (file && !file.type.startsWith("image/")) {
      setError?.("Select a valid image file for the menu photo.");
      return;
    }

    setMenuImageFile(file || null);
    setMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      if (!file) return "";
      return URL.createObjectURL(file);
    });
  };

  const clearMenuImageSelection = () => {
    setMenuImageFile(null);
    setMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const handleEditMenuImageFileChange = (file) => {
    if (file && !file.type.startsWith("image/")) {
      setError?.("Select a valid image file for the menu photo.");
      return;
    }

    setEditMenuImageCleared(false);
    setEditMenuImageFile(file || null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      if (!file) return "";
      return URL.createObjectURL(file);
    });
  };

  const clearEditMenuImageSelection = () => {
    setEditMenuImageFile(null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setEditMenuImageCleared(false);
  };

  const resetEditImagePreview = () => {
    setEditMenuImageFile(null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const removeEditMenuImage = () => {
    if (!editMenuImageUrl && !editMenuImagePreview) return;
    setEditMenuImageFile(null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setEditMenuImageUrl("");
    setEditMenuImageCleared(true);
  };

  const loadMenu = useCallback(async () => {
    if (!token) return;
    setLoadingMenu(true);
    try {
      clearError();
      const data = await fetchJson(MENU_API, withAuth(), "Cannot load menu");
      const normalized = Array.isArray(data)
        ? data.map((item) => ({ ...item, price: Number(item.price) || 0 }))
        : [];
      setMenu(normalized);
    } catch (err) {
      console.error(err);
      setMenu([]);
      setError?.(err.message || "Cannot load menu");
    } finally {
      setLoadingMenu(false);
    }
  }, [MENU_API, token]);

  const importMenuFile = async (file) => {
    if (!file) return;
    setImportingMenu(true);
    setImportSummary(null);
    clearError();

    try {
      const parsedRows = await parseMenuFile(file);
      const payloads = parsedRows.map(normalizeMenuPayload).filter(Boolean);

      if (!payloads.length) {
        throw new Error("No valid rows found. Please check headers: name, price, category, description, available");
      }

      const summary = { created: 0, skipped: parsedRows.length - payloads.length, failed: [] };

      for (const payload of payloads) {
        try {
          await fetchJson(
            MENU_API,
            withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }),
            "Could not add menu item"
          );
          summary.created += 1;
        } catch (err) {
          summary.failed.push({ name: payload.name, error: err.message || "Unknown error" });
        }
      }

      setImportSummary(summary);
      loadMenu();
    } catch (err) {
      console.error(err);
      setError?.(err.message || "Import failed");
    } finally {
      setImportingMenu(false);
    }
  };

  const addMenuItem = async () => {
    if (!menuName.trim() || !menuPrice || !menuCategory.trim()) {
      setError?.("Menu name, price, and category required");
      return;
    }

    let uploadedImageUrl = null;
    try {
      if (menuImageFile) {
        setImageUploadStatus((prev) => ({ ...prev, create: true }));
        uploadedImageUrl = await uploadMenuImage(menuImageFile, token);
      }
    } catch (uploadError) {
      console.error(uploadError);
      setError?.(uploadError.message || "Could not upload image");
      return;
    } finally {
      setImageUploadStatus((prev) => ({ ...prev, create: false }));
    }

    const payload = {
      name: menuName.trim(),
      price: Number(menuPrice),
      category: menuCategory.trim(),
      description: menuDescription.trim(),
      available: true,
      imageUrl: uploadedImageUrl || null
    };

    try {
      setMenuActionId("new");
      clearError();
      await fetchJson(
        MENU_API,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        "Could not add menu item"
      );

      setMenuName("");
      setMenuPrice("");
      setMenuCategory("");
      setMenuDescription("");
      clearMenuImageSelection();
      loadMenu();
    } catch (err) {
      console.error(err);
      setError?.(err.message || "Could not add menu item");
    } finally {
      setMenuActionId("");
    }
  };

  const startEditMenuItem = (item) => {
    setEditingMenuId(item.id);
    setEditMenuName(item.name);
    setEditMenuPrice(item.price);
    setEditMenuCategory(item.category);
    setEditMenuDescription(item.description || "");
    resetEditImagePreview();
    setEditMenuImageUrl(item.imageUrl || "");
    setEditMenuImageCleared(false);
  };

  const cancelEditMenuItem = () => {
    setEditingMenuId(null);
    setEditMenuName("");
    setEditMenuPrice("");
    setEditMenuCategory("");
    setEditMenuDescription("");
    resetEditImagePreview();
    setEditMenuImageUrl("");
    setEditMenuImageCleared(false);
  };

  const saveMenuItem = async () => {
    if (!editingMenuId) return;

    if (!editMenuName.trim() || !editMenuPrice || !editMenuCategory.trim()) {
      setError?.("Menu name, price, and category required");
      return;
    }

    let uploadedImageUrl;
    if (editMenuImageFile) {
      try {
        setImageUploadStatus((prev) => ({ ...prev, edit: true }));
        uploadedImageUrl = await uploadMenuImage(editMenuImageFile, token);
      } catch (uploadError) {
        console.error(uploadError);
        setError?.(uploadError.message || "Could not upload image");
        return;
      } finally {
        setImageUploadStatus((prev) => ({ ...prev, edit: false }));
      }
    } else if (editMenuImageCleared) {
      uploadedImageUrl = null;
    }

    const payload = {
      name: editMenuName.trim(),
      price: Number(editMenuPrice),
      category: editMenuCategory.trim(),
      description: editMenuDescription.trim()
    };

    if (uploadedImageUrl !== undefined) {
      payload.imageUrl = uploadedImageUrl;
    }

    try {
      setMenuActionId(editingMenuId);
      clearError();
      await fetchJson(
        `${MENU_API}/${editingMenuId}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        "Could not update menu item"
      );
      cancelEditMenuItem();
      loadMenu();
    } catch (err) {
      console.error(err);
      setError?.(err.message || "Could not update menu item");
    } finally {
      setMenuActionId("");
    }
  };

  const toggleMenuAvailability = async (item) => {
    try {
      setMenuActionId(item.id);
      await fetchJson(
        `${MENU_API}/${item.id}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available: item.available === false ? true : false })
        }),
        "Could not update availability"
      );
      loadMenu();
    } catch (err) {
      console.error(err);
      setError?.(err.message || "Could not update availability");
    } finally {
      setMenuActionId("");
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete menu item?")) return;

    try {
      setMenuActionId(id);
      await fetchJson(`${MENU_API}/${id}`, withAuth({ method: "DELETE" }), "Could not delete menu item");
      loadMenu();
    } catch (err) {
      console.error(err);
      setError?.(err.message || "Could not delete menu item");
    } finally {
      setMenuActionId("");
    }
  };

  const filteredMenu = useMemo(() => {
    const term = menuSearch.trim().toLowerCase();
    const filteredByVisibility = menu.filter((item) => {
      if (menuFilter === "available" && item.available === false) return false;
      if (menuFilter === "unavailable" && item.available !== false) return false;
      return true;
    });
    if (!term) return filteredByVisibility;
    return filteredByVisibility.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      return name.includes(term) || desc.includes(term) || cat.includes(term);
    });
  }, [menu, menuSearch, menuFilter]);

  const categories = useMemo(() => {
    const set = new Set(filteredMenu.map((m) => m.category || "Uncategorized"));
    return Array.from(set).sort();
  }, [filteredMenu]);

  useEffect(() => {
    return () => {
      if (menuImagePreview) {
        URL.revokeObjectURL(menuImagePreview);
      }
    };
  }, [menuImagePreview]);

  useEffect(() => {
    return () => {
      if (editMenuImagePreview) {
        URL.revokeObjectURL(editMenuImagePreview);
      }
    };
  }, [editMenuImagePreview]);

  return {
    menu,
    menuName,
    setMenuName,
    menuPrice,
    setMenuPrice,
    menuCategory,
    setMenuCategory,
    menuDescription,
    setMenuDescription,
    menuImagePreview,
    handleMenuImageFileChange,
    clearMenuImageSelection,
    editingMenuId,
    startEditMenuItem,
    cancelEditMenuItem,
    editMenuName,
    setEditMenuName,
    editMenuPrice,
    setEditMenuPrice,
    editMenuCategory,
    setEditMenuCategory,
    editMenuDescription,
    setEditMenuDescription,
    editMenuImagePreview,
    editMenuImageUrl,
    handleEditMenuImageFileChange,
    clearEditMenuImageSelection,
    removeEditMenuImage,
    addMenuItem,
    saveMenuItem,
    toggleMenuAvailability,
    deleteMenuItem,
    menuActionId,
    imageUploadStatus,
    importingMenu,
    importSummary,
    importMenuFile,
    loadMenu,
    menuSearch,
    setMenuSearch,
    menuFilter,
    setMenuFilter,
    filteredMenu,
    categories,
    loadingMenu
  };
}
