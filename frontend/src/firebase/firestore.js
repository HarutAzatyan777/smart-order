import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { app } from "./firebaseConfig";

const db = getFirestore(app);

// Use Firestore emulator in local dev so menu data matches the local Functions API
const disableEmulator = String(import.meta?.env?.VITE_DISABLE_FIRESTORE_EMULATOR || "").toLowerCase() === "true";
const shouldUseEmulator =
  typeof window !== "undefined" &&
  import.meta?.env?.DEV &&
  !disableEmulator;

if (shouldUseEmulator) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  if (import.meta?.env?.DEV) {
    console.debug("[firestore] Using emulator at 127.0.0.1:8080");
  }
}

export { db };
