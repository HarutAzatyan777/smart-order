function cleanKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function parseAvailable(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["yes", "true", "1", "available", "y"].includes(normalized)) return true;
  if (["no", "false", "0", "unavailable", "n"].includes(normalized)) return false;
  return null;
}

function normalizeMenuPayload(row) {
  if (!row || typeof row !== "object") return null;

  const pick = (keys) => {
    for (const key of keys) {
      const foundKey = Object.keys(row).find((k) => cleanKey(k) === key);
      if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== null) {
        const value = row[foundKey];
        if (String(value).trim() !== "") return value;
      }
    }
    return "";
  };

  const name = String(pick(["name", "item", "title"])).trim();
  const priceRaw = pick(["price", "cost", "amount"]);
  const category = String(pick(["category", "group", "section"])).trim();
  const description = String(pick(["description", "details", "desc"]) || "").trim();
  const availableRaw = pick(["available", "instock", "availability"]);

  const priceNumber = parseFloat(String(priceRaw).replace(/[^0-9.,-]/g, "").replace(",", "."));
  const available = parseAvailable(availableRaw);

  if (!name || !category || !Number.isFinite(priceNumber)) return null;

  return {
    name,
    price: priceNumber,
    category,
    description,
    available: available ?? true
  };
}

async function parseXlsx(file) {
  let XLSX;
  try {
    const mod = await import("xlsx");
    XLSX = mod.default || mod;
  } catch (err) {
    const fallback = await import("xlsx/dist/xlsx.full.min.js");
    XLSX = fallback.default || fallback;
  }
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

async function parseCsv(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => cleanKey(h));
  const rows = lines.slice(1);

  return rows.map((line) => {
    const cells = line.split(",");
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = cells[idx] ?? "";
    });
    return obj;
  });
}

async function parseDocx(file) {
  let mammoth;
  try {
    const mod = await import("mammoth/mammoth.browser.js");
    mammoth = mod.default || mod;
  } catch (err) {
    const fallback = await import("mammoth/mammoth.browser.min.js");
    mammoth = fallback.default || fallback;
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const lines = (result.value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const cells = line
        .split(/\s*\|\s*|\s*;\s*|\t+/)
        .map((cell) => cell.trim())
        .filter(Boolean);
      if (cells.length < 3) return null;
      const [name, price, category, description = "", available = ""] = cells;
      return { name, price, category, description, available };
    })
    .filter(Boolean);
}

export async function parseMenuFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXlsx(file);
  }
  if (lower.endsWith(".csv")) {
    return parseCsv(file);
  }
  if (lower.endsWith(".docx")) {
    return parseDocx(file);
  }
  throw new Error("Unsupported file type. Use .xlsx, .csv, or .docx");
}

export { normalizeMenuPayload };
